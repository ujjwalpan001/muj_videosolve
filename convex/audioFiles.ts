import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create audio file record
export const createAudioFile = mutation({
  args: {
    messageId: v.id("messages"),
    fileUrl: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    format: v.union(v.literal("mp3"), v.literal("wav")),
    purpose: v.union(
      v.literal("tts"),
      v.literal("narration"),
      v.literal("lipsync")
    ),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get message to verify ownership
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");
    
    // Verify session ownership
    const session = await ctx.db.get(message.sessionId);
    if (!session) throw new Error("Session not found");
    if (session.clerkId !== identity.subject) {
      throw new Error("Forbidden");
    }

    // Upload file to Convex storage (placeholder - actual upload handled separately)
    const storageId = "" as any; // This should be set by the file upload process

    const now = Date.now();

    const audioFileId = await ctx.db.insert("audioFiles", {
      messageId: args.messageId,
      userId: session.userId,
      storageId: storageId,
      fileUrl: args.fileUrl,
      fileName: args.fileName,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      format: args.format,
      purpose: args.purpose,
      duration: args.duration,
      createdAt: now,
    });

    // Update message with audio reference
    await ctx.db.patch(args.messageId, {
      audioFileUrl: args.fileUrl,
    });

    return audioFileId;
  },
});

// Get audio files for a session  
export const getAudioFilesBySession = query({
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

    // Get all messages in session
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const messageIds = messages.map((m) => m._id);

    // Get audio files for these messages
    const audioFiles: any[] = [];
    for (const messageId of messageIds) {
      const audio = await ctx.db
        .query("audioFiles")
        .withIndex("by_message", (q) => q.eq("messageId", messageId))
        .first();
      if (audio) audioFiles.push(audio);
    }

    return audioFiles.slice(0, args.limit || 50);
  },
});

// Get audio file by ID
export const getAudioFile = query({
  args: { audioFileId: v.id("audioFiles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const audioFile = await ctx.db.get(args.audioFileId);
    if (!audioFile) return null;

    // Verify ownership through user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || audioFile.userId !== user._id) {
      throw new Error("Forbidden");
    }

    return audioFile;
  },
});

// Get audio file by message ID
export const getAudioFileByMessage = query({
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

    const audioFile = await ctx.db
      .query("audioFiles")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .unique();

    return audioFile;
  },
});

// Delete audio file
export const deleteAudioFile = mutation({
  args: { audioFileId: v.id("audioFiles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const audioFile = await ctx.db.get(args.audioFileId);
    if (!audioFile) throw new Error("Audio file not found");

    // Verify ownership through user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || audioFile.userId !== user._id) {
      throw new Error("Forbidden");
    }

    // Delete from Convex storage
    if (audioFile.storageId) {
      try {
        await ctx.storage.delete(audioFile.storageId);
      } catch (error: any) {
        // Log error but continue with deletion
      }
    }

    await ctx.db.delete(args.audioFileId);
  },
});

// Get user's total audio storage usage
export const getStorageUsage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { totalFiles: 0, totalSize: 0 };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return { totalFiles: 0, totalSize: 0 };

    const audioFiles = await ctx.db
      .query("audioFiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const totalSize = audioFiles.reduce(
      (sum, file) => sum + (file.fileSize || 0),
      0
    );

    return {
      totalFiles: audioFiles.length,
      totalSize: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    };
  },
});
