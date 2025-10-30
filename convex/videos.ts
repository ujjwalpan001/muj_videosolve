import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new video record
export const createVideo = mutation({
  args: {
    messageId: v.id("messages"),
    sessionId: v.id("sessions"),
    manimCode: v.string(),
    narrationScript: v.string(),
    videoUrl: v.string(),
    videoPath: v.string(),
    status: v.optional(
      v.union(
        v.literal("generating"),
        v.literal("ready"),
        v.literal("failed")
      )
    ),
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

    const videoId = await ctx.db.insert("videos", {
      messageId: args.messageId,
      sessionId: args.sessionId,
      userId: session.userId,
      clerkId: identity.subject,
      manimCode: args.manimCode,
      videoUrl: args.videoUrl,
      videoPath: args.videoPath,
      narrationAudioUrl: args.narrationScript,
      status: args.status || "generating",
      isPartOfCombined: false,
      views: 0,
      isBookmarked: false,
      createdAt: now,
    });

    return videoId;
  },
});

// Update video status and details
export const updateVideo = mutation({
  args: {
    videoId: v.id("videos"),
    status: v.optional(
      v.union(
        v.literal("generating"),
        v.literal("ready"),
        v.literal("failed")
      )
    ),
    videoUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    duration: v.optional(v.number()),
    fileSize: v.optional(v.number()),
    generationTime: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");

    // Verify ownership
    if (video.clerkId !== identity.subject) {
      throw new Error("Forbidden");
    }

    const updates: any = {};

    if (args.status) updates.status = args.status;
    if (args.videoUrl) updates.videoUrl = args.videoUrl;
    if (args.thumbnailUrl) updates.thumbnailUrl = args.thumbnailUrl;
    if (args.duration !== undefined) updates.duration = args.duration;
    if (args.fileSize !== undefined) updates.fileSize = args.fileSize;
    if (args.generationTime !== undefined)
      updates.generationTime = args.generationTime;
    if (args.errorMessage !== undefined) updates.errorMessage = args.errorMessage;

    await ctx.db.patch(args.videoId, updates);

    // If video ready, update session video count and user stats
    if (args.status === "ready" && video.status !== "ready") {
      const session = await ctx.db.get(video.sessionId);
      if (session) {
        await ctx.db.patch(video.sessionId, {
          videoCount: session.videoCount + 1,
          updatedAt: Date.now(),
        });
      }

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .unique();

      if (user) {
        await ctx.db.patch(user._id, {
          totalVideosGenerated: user.totalVideosGenerated + 1,
          updatedAt: Date.now(),
        });
      }
    }

    return updates;
  },
});

// Get videos for a session
export const getVideos = query({
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

    const videos = await ctx.db
      .query("videos")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(args.limit || 50);

    return videos;
  },
});

// Get all user videos
export const getUserVideos = query({
  args: {
    limit: v.optional(v.number()),
    bookmarkedOnly: v.optional(v.boolean()),
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
      .query("videos")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc");

    if (args.bookmarkedOnly) {
      query = query.filter((q) => q.eq(q.field("isBookmarked"), true));
    }

    const videos = await query.take(args.limit || 50);
    return videos;
  },
});

// Get video by ID
export const getVideo = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const video = await ctx.db.get(args.videoId);
    if (!video) return null;

    // Verify ownership
    if (video.clerkId !== identity.subject) {
      throw new Error("Forbidden");
    }

    return video;
  },
});

// Toggle bookmark
export const toggleBookmark = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");

    if (video.clerkId !== identity.subject) {
      throw new Error("Forbidden");
    }

    await ctx.db.patch(args.videoId, {
      isBookmarked: !video.isBookmarked,
    });

    return !video.isBookmarked;
  },
});

// Delete video
export const deleteVideo = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const video = await ctx.db.get(args.videoId);
    if (!video) throw new Error("Video not found");

    if (video.clerkId !== identity.subject) {
      throw new Error("Forbidden");
    }

    await ctx.db.delete(args.videoId);

    // Update session video count if video was ready
    if (video.status === "ready") {
      const session = await ctx.db.get(video.sessionId);
      if (session) {
        await ctx.db.patch(video.sessionId, {
          videoCount: Math.max(0, session.videoCount - 1),
          updatedAt: Date.now(),
        });
      }
    }
  },
});

// Get videos by status
export const getVideosByStatus = query({
  args: {
    status: v.union(
      v.literal("generating"),
      v.literal("ready"),
      v.literal("failed")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return [];

    const videos = await ctx.db
      .query("videos")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .order("desc")
      .take(args.limit || 20);

    return videos;
  },
});
