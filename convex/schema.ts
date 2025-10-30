// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table will be managed by Clerk integration
  users: defineTable({
    name: v.string(),
    email: v.string(),
    clerkId: v.string(), // The unique ID from Clerk
  }).index("by_clerk_id", ["clerkId"]),

  // Table to store chat sessions
  chats: defineTable({
    userId: v.id("users"), // Reference to the user who owns the chat
    title: v.string(),
  }).index("by_user", ["userId"]),

  // Table to store individual messages
  messages: defineTable({
    chatId: v.id("chats"), // Reference to the chat session
    userId: v.id("users"), // Reference to the user who sent the message
    role: v.union(v.literal("user"), v.literal("assistant")),
    text: v.string(),
    // Store optional data for assistant messages
    facialExpression: v.optional(v.string()),
    animation: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    // We will store audio and lipsync data in Convex file storage, not in the document
    audioStorageId: v.optional(v.id("_storage")),
    lipsyncStorageId: v.optional(v.id("_storage")),
  }).index("by_chat", ["chatId"]),
});
