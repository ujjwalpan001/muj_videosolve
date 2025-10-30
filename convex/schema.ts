import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User profiles synced from Clerk
  users: defineTable({
    clerkId: v.string(), // Clerk user ID
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    
    // User preferences
    preferences: v.object({
      defaultVideoMode: v.boolean(),
      avatarModel: v.string(),
      voicePreference: v.string(),
      theme: v.union(v.literal("light"), v.literal("dark")),
    }),
    
    // Stats
    totalSessions: v.number(),
    totalMessages: v.number(),
    totalVideosGenerated: v.number(),
    
    // Metadata
    lastActiveAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_last_active", ["lastActiveAt"]),

  // Chat sessions/conversations
  sessions: defineTable({
    userId: v.id("users"),
    clerkId: v.string(),
    
    // Session metadata
    title: v.string(),
    mode: v.union(v.literal("chat"), v.literal("video")),
    sessionId: v.string(), // Unique session identifier
    
    // Stats
    messageCount: v.number(),
    videoCount: v.number(),
    
    // Status
    isActive: v.boolean(),
    isPinned: v.boolean(),
    isArchived: v.boolean(),
    
    // Timestamps
    lastMessageAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_clerk_id", ["clerkId", "createdAt"])
    .index("by_session_id", ["sessionId"])
    .index("by_active", ["userId", "isActive", "lastMessageAt"])
    .index("by_pinned", ["userId", "isPinned"]),

  // Individual chat messages
  messages: defineTable({
    // Relationships
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    clerkId: v.string(),
    
    // Message content
    type: v.union(v.literal("user"), v.literal("assistant")),
    text: v.string(),
    
    // Video mode specific
    videoExplanation: v.optional(v.string()),
    manimCode: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    videoStatus: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("ready"),
      v.literal("failed"),
      v.literal("none")
    ),
    
    // Avatar animation data
    facialExpression: v.union(
      v.literal("smile"),
      v.literal("sad"),
      v.literal("angry"),
      v.literal("surprised"),
      v.literal("funnyFace"),
      v.literal("default")
    ),
    animation: v.string(),
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
    
    // Audio data
    audioFileUrl: v.optional(v.string()),
    lipsyncData: v.optional(v.any()), // JSON object
    
    // Metadata
    processingTime: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    tokenUsage: v.optional(v.number()),
    
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId", "createdAt"])
    .index("by_user", ["userId", "createdAt"])
    .index("by_clerk_id", ["clerkId", "createdAt"])
    .index("by_video_status", ["sessionId", "videoStatus"]),

  // Generated videos tracking
  videos: defineTable({
    // Relationships
    messageId: v.id("messages"),
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    clerkId: v.string(),
    
    // Video metadata
    videoUrl: v.string(),
    videoPath: v.string(),
    thumbnailUrl: v.optional(v.string()),
    duration: v.optional(v.number()),
    
    // Generation details
    manimCode: v.string(),
    narrationAudioUrl: v.optional(v.string()),
    
    // Status
    status: v.union(
      v.literal("generating"),
      v.literal("ready"),
      v.literal("failed")
    ),
    generationTime: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    
    // Video parts (for multi-part videos)
    isPartOfCombined: v.boolean(),
    combinedVideoId: v.optional(v.id("videos")),
    partNumber: v.optional(v.number()),
    
    // Metadata
    fileSize: v.optional(v.number()),
    views: v.number(),
    isBookmarked: v.boolean(),
    
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_session", ["sessionId", "createdAt"])
    .index("by_user", ["userId", "createdAt"])
    .index("by_status", ["status", "createdAt"])
    .index("by_bookmarked", ["userId", "isBookmarked"]),

  // Audio files metadata
  audioFiles: defineTable({
    // Relationships
    messageId: v.id("messages"),
    userId: v.id("users"),
    
    // File metadata
    storageId: v.id("_storage"),
    fileUrl: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    
    // Audio specifics
    duration: v.optional(v.number()),
    format: v.union(v.literal("mp3"), v.literal("wav")),
    purpose: v.union(
      v.literal("tts"),
      v.literal("narration"),
      v.literal("lipsync")
    ),
    
    createdAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_user", ["userId", "createdAt"]),

  // User activity tracking
  userActivity: defineTable({
    userId: v.id("users"),
    clerkId: v.string(),
    
    // Activity data
    activityType: v.union(
      v.literal("login"),
      v.literal("message_sent"),
      v.literal("video_generated"),
      v.literal("session_created")
    ),
    metadata: v.optional(v.any()),
    
    timestamp: v.number(),
  })
    .index("by_user", ["userId", "timestamp"])
    .index("by_type", ["activityType", "timestamp"]),

  // System logs
  systemLogs: defineTable({
    level: v.union(v.literal("info"), v.literal("warn"), v.literal("error")),
    service: v.union(
      v.literal("backend"),
      v.literal("manim_worker"),
      v.literal("frontend")
    ),
    message: v.string(),
    metadata: v.optional(v.any()),
    
    // Optional user context
    userId: v.optional(v.id("users")),
    sessionId: v.optional(v.id("sessions")),
    
    timestamp: v.number(),
  })
    .index("by_level", ["level", "timestamp"])
    .index("by_service", ["service", "timestamp"])
    .index("by_user", ["userId", "timestamp"]),
});
