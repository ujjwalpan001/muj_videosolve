import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a new message
export const createMessage = mutation({
  args: {
    sessionId: v.id("sessions"),
    type: v.union(v.literal("user"), v.literal("assistant")),
    text: v.string(),
    videoExplanation: v.optional(v.string()),
    manimCode: v.optional(v.string()),
    videoStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("generating"),
        v.literal("ready"),
        v.literal("failed"),
        v.literal("none")
      )
    ),
    facialExpression: v.optional(
      v.union(
        v.literal("smile"),
        v.literal("sad"),
        v.literal("angry"),
        v.literal("surprised"),
        v.literal("funnyFace"),
        v.literal("default")
      )
    ),
    animation: v.optional(v.string()),
    animationTimeline: v.optional(
      v.array(
        v.object({
          time: v.number(),
          action: v.string(),
          animation: v.string(),
          expression: v.string(),
        })
      )
    ),
    audioFileUrl: v.optional(v.string()),
    lipsyncData: v.optional(v.any()),
    tokenUsage: v.optional(v.number()),
    processingTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    if (session.clerkId !== identity.subject) {
      throw new Error("Forbidden");
    }

    const now = Date.now();

    // Create message
    const messageId = await ctx.db.insert("messages", {
      sessionId: args.sessionId,
      userId: session.userId,
      clerkId: identity.subject,
      type: args.type,
      text: args.text,
      videoExplanation: args.videoExplanation,
      manimCode: args.manimCode,
      videoStatus: args.videoStatus || "none",
      facialExpression: args.facialExpression || "default",
      animation: args.animation || "Idle",
      animationTimeline: args.animationTimeline,
      audioFileUrl: args.audioFileUrl,
      lipsyncData: args.lipsyncData,
      tokenUsage: args.tokenUsage,
      processingTime: args.processingTime,
      createdAt: now,
    });

    // Update session message count
    await ctx.db.patch(args.sessionId, {
      messageCount: session.messageCount + 1,
      lastMessageAt: now,
      updatedAt: now,
    });

    // Update user stats if assistant message
    if (args.type === "assistant") {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .unique();

      if (user) {
        await ctx.db.patch(user._id, {
          totalMessages: user.totalMessages + 1,
          updatedAt: now,
        });
      }
    }

    return messageId;
  },
});

// Get messages for a session
export const getMessages = query({
  args: {
    sessionId: v.id("sessions"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session) return [];
    if (session.clerkId !== identity.subject) {
      throw new Error("Forbidden");
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("asc")
      .take(args.limit || 100);

    return messages;
  },
});

// Get message by sessionId (for real-time updates)
export const getMessagesBySessionId = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Find session first
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) return [];
    if (session.clerkId !== identity.subject) {
      throw new Error("Forbidden");
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .order("asc")
      .collect();

    return messages;
  },
});

// Get single message
export const getMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    // Verify ownership through session
    const session = await ctx.db.get(message.sessionId);
    if (!session || session.clerkId !== identity.subject) {
      throw new Error("Forbidden");
    }

    return message;
  },
});

// Update message with video URL or status
export const updateMessage = mutation({
  args: {
    messageId: v.id("messages"),
    videoUrl: v.optional(v.string()),
    videoStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("generating"),
        v.literal("ready"),
        v.literal("failed"),
        v.literal("none")
      )
    ),
    audioFileUrl: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Verify ownership
    const session = await ctx.db.get(message.sessionId);
    if (!session || session.clerkId !== identity.subject) {
      throw new Error("Forbidden");
    }

    const updates: any = {};
    if (args.videoUrl) updates.videoUrl = args.videoUrl;
    if (args.videoStatus) updates.videoStatus = args.videoStatus;
    if (args.audioFileUrl) updates.audioFileUrl = args.audioFileUrl;
    if (args.errorMessage !== undefined) updates.errorMessage = args.errorMessage;

    await ctx.db.patch(args.messageId, updates);
  },
});

// Delete message
export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Verify ownership
    const session = await ctx.db.get(message.sessionId);
    if (!session || session.clerkId !== identity.subject) {
      throw new Error("Forbidden");
    }

    await ctx.db.delete(args.messageId);

    // Update session message count
    await ctx.db.patch(message.sessionId, {
      messageCount: Math.max(0, session.messageCount - 1),
      updatedAt: Date.now(),
    });
  },
});

// Get video messages only
export const getVideoMessages = query({
  args: {
    sessionId: v.id("sessions"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session) return [];
    if (session.clerkId !== identity.subject) {
      throw new Error("Forbidden");
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_video_status", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.neq(q.field("videoStatus"), "none"))
      .order("desc")
      .take(args.limit || 20);

    return messages;
  },
});
