import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a new session
export const createSession = mutation({
  args: {
    title: v.optional(v.string()),
    mode: v.union(v.literal("chat"), v.literal("video")),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const now = Date.now();
    const title = args.title || `${args.mode === "chat" ? "Chat" : "Video"} - ${new Date(now).toLocaleDateString()}`;

    const sessionId = await ctx.db.insert("sessions", {
      userId: user._id,
      clerkId: identity.subject,
      title,
      mode: args.mode,
      sessionId: args.sessionId,
      messageCount: 0,
      videoCount: 0,
      isActive: true,
      isPinned: false,
      isArchived: false,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Update user stats
    await ctx.db.patch(user._id, {
      totalSessions: user.totalSessions + 1,
      updatedAt: now,
    });

    return sessionId;
  },
});

// Get all sessions for current user
export const getSessions = query({
  args: {
    limit: v.optional(v.number()),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return [];

    let query = ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc");

    if (!args.includeArchived) {
      query = query.filter((q) => q.eq(q.field("isArchived"), false));
    }

    const sessions = await query.take(args.limit || 50);

    return sessions;
  },
});

// Get active sessions
export const getActiveSessions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return [];

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_active", (q) =>
        q.eq("userId", user._id).eq("isActive", true)
      )
      .order("desc")
      .take(20);

    return sessions;
  },
});

// Get session by sessionId
export const getSessionBySessionId = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    // Verify ownership
    if (session && session.clerkId !== identity.subject) {
      throw new Error("Forbidden");
    }

    return session;
  },
});

// Get single session
export const getSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const session = await ctx.db.get(args.sessionId);
    
    if (!session) return null;

    // Verify ownership
    if (session.clerkId !== identity.subject) {
      throw new Error("Forbidden");
    }

    return session;
  },
});

// Update session
export const updateSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    title: v.optional(v.string()),
    isPinned: v.optional(v.boolean()),
    isArchived: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    
    if (session.clerkId !== identity.subject) {
      throw new Error("Forbidden");
    }

    const updates: any = { updatedAt: Date.now() };
    
    if (args.title) updates.title = args.title;
    if (args.isPinned !== undefined) updates.isPinned = args.isPinned;
    if (args.isArchived !== undefined) updates.isArchived = args.isArchived;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.sessionId, updates);
  },
});

// Increment message count
export const incrementMessageCount = mutation({
  args: {
    sessionId: v.id("sessions"),
    isVideo: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    const now = Date.now();
    const updates: any = {
      messageCount: session.messageCount + 1,
      lastMessageAt: now,
      updatedAt: now,
    };

    if (args.isVideo) {
      updates.videoCount = session.videoCount + 1;
    }

    await ctx.db.patch(args.sessionId, updates);
  },
});

// Delete session
export const deleteSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    
    if (session.clerkId !== identity.subject) {
      throw new Error("Forbidden");
    }

    // Delete all messages in session
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete session
    await ctx.db.delete(args.sessionId);
  },
});

// Archive session
export const archiveSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    
    if (session.clerkId !== identity.subject) {
      throw new Error("Forbidden");
    }

    await ctx.db.patch(args.sessionId, {
      isArchived: true,
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});
