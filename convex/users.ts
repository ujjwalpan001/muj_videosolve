import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create or update user from Clerk webhook
export const upsertFromClerk = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    const now = Date.now();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        avatarUrl: args.avatarUrl,
        lastActiveAt: now,
        updatedAt: now,
      });
      return existingUser._id;
    } else {
      // Create new user
      return await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        name: args.name,
        avatarUrl: args.avatarUrl,
        preferences: {
          defaultVideoMode: false,
          avatarModel: "/models/68a8184c78a54f62ce4e9d73.glb",
          voicePreference: "en-US-Wavenet-F",
          theme: "dark",
        },
        totalSessions: 0,
        totalMessages: 0,
        totalVideosGenerated: 0,
        lastActiveAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Get current user by Clerk ID
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    return user;
  },
});

// Get user by ID
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Update user preferences
export const updatePreferences = mutation({
  args: {
    defaultVideoMode: v.optional(v.boolean()),
    avatarModel: v.optional(v.string()),
    voicePreference: v.optional(v.string()),
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPrefs = user.preferences;
    const newPrefs = {
      defaultVideoMode: args.defaultVideoMode ?? currentPrefs.defaultVideoMode,
      avatarModel: args.avatarModel ?? currentPrefs.avatarModel,
      voicePreference: args.voicePreference ?? currentPrefs.voicePreference,
      theme: args.theme ?? currentPrefs.theme,
    };

    await ctx.db.patch(user._id, {
      preferences: newPrefs,
      updatedAt: Date.now(),
    });

    return newPrefs;
  },
});

// Update user stats
export const updateStats = mutation({
  args: {
    totalSessions: v.optional(v.number()),
    totalMessages: v.optional(v.number()),
    totalVideosGenerated: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const updates: any = { updatedAt: Date.now() };
    
    if (args.totalSessions !== undefined) {
      updates.totalSessions = user.totalSessions + args.totalSessions;
    }
    if (args.totalMessages !== undefined) {
      updates.totalMessages = user.totalMessages + args.totalMessages;
    }
    if (args.totalVideosGenerated !== undefined) {
      updates.totalVideosGenerated = user.totalVideosGenerated + args.totalVideosGenerated;
    }

    await ctx.db.patch(user._id, updates);
  },
});

// Update last active timestamp
export const updateLastActive = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (user) {
      await ctx.db.patch(user._id, {
        lastActiveAt: Date.now(),
      });
    }
  },
});

// Get user statistics
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    return {
      totalSessions: user.totalSessions,
      totalMessages: user.totalMessages,
      totalVideosGenerated: user.totalVideosGenerated,
    };
  },
});
