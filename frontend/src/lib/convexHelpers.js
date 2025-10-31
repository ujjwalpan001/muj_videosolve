/**
 * Convex Integration Helpers
 * Helper functions to integrate Convex database with existing chat system
 * 
 * NOTE: These functions are prepared for integration but currently commented out
 * in useChat.jsx. To enable:
 * 1. Pass ConvexReactClient from main.jsx to ChatProvider
 * 2. Uncomment the saveUserMessage/saveAssistantMessage calls in useChat.jsx
 * 3. Messages will automatically save to Convex database
 */

import { api } from "../../../convex/_generated/api";

/**
 * Hook-based helpers - Use these with useMutation/useQuery in components
 */

// Example usage in component:
// const saveMessage = useMutation(api.messages.createMessage);
// await saveMessage({ sessionId, type: "user", text: "Hello" });

/**
 * Session management helpers
 */
export const sessionHelpers = {
  /**
   * Create a new session
   * Usage: const createSession = useMutation(api.sessions.createSession);
   */
  createSessionArgs: (sessionId, mode = "chat") => ({
    sessionId: sessionId,
    mode: mode,
    title: `${mode === "chat" ? "Chat" : "Video"} - ${new Date().toLocaleString()}`
  }),
  
  /**
   * Get session by sessionId string
   * Usage: const session = useQuery(api.sessions.getSessionBySessionId, { sessionId });
   */
  getSessionArgs: (sessionId) => ({
    sessionId: sessionId
  })
};

/**
 * Message management helpers
 */
export const messageHelpers = {
  /**
   * Create user message arguments
   */
  createUserMessageArgs: (sessionId, text) => ({
    sessionId: sessionId,
    type: "user",
    text: text,
    videoStatus: "none",
    facialExpression: "default",
    animation: "Idle"
  }),
  
  /**
   * Create assistant message arguments from backend response
   */
  createAssistantMessageArgs: (sessionId, messageData) => ({
    sessionId: sessionId,
    type: "assistant",
    text: messageData.text || messageData.chatResponse,
    
    // Video data
    videoExplanation: messageData.videoExplanation,
    manimCode: messageData.manimCode,
    videoStatus: messageData.videoExplanation ? "pending" : "none",
    
    // Animation data
    facialExpression: messageData.facialExpression || "default",
    animation: messageData.animation || "Idle",
    animationTimeline: messageData.animationTimeline,
    
    // Audio data
    lipsyncData: messageData.lipsync,
    
    // Metadata
    tokenUsage: messageData.tokenUsage,
    processingTime: messageData.processingTime
  }),
  
  /**
   * Update message with video URL
   */
  updateVideoArgs: (messageId, videoUrl, status = "ready") => ({
    messageId: messageId,
    videoUrl: videoUrl,
    videoStatus: status
  })
};

/**
 * Complete flow example for chat integration:
 * 
 * In useChat.jsx:
 * ```javascript
 * import { useMutation, useQuery } from "convex/react";
 * import { api } from "../../convex/_generated/api";
 * import { sessionHelpers, messageHelpers } from "../lib/convexHelpers";
 * 
 * function ChatProvider() {
 *   const createSession = useMutation(api.sessions.createSession);
 *   const createMessage = useMutation(api.messages.createMessage);
 *   const updateMessage = useMutation(api.messages.updateMessage);
 *   
 *   const chat = async (message, videoMode) => {
 *     // 1. Create/get session
 *     const sessionId = await createSession(
 *       sessionHelpers.createSessionArgs(sessionId, videoMode ? "video" : "chat")
 *     );
 *     
 *     // 2. Save user message
 *     await createMessage(
 *       messageHelpers.createUserMessageArgs(sessionId, message)
 *     );
 *     
 *     // 3. Get AI response from backend
 *     const response = await fetch('/chat', ...);
 *     
 *     // 4. Save assistant message
 *     const messageId = await createMessage(
 *       messageHelpers.createAssistantMessageArgs(sessionId, response.data)
 *     );
 *     
 *     // 5. Later, when video ready:
 *     await updateMessage(
 *       messageHelpers.updateVideoArgs(messageId, videoUrl, "ready")
 *     );
 *   };
 * }
 * ```
 */

// Legacy functions (kept for reference but not used)
// These were designed to take a convex client, but we use hooks instead

/**
 * @deprecated Use hooks with sessionHelpers instead
 */
export async function getOrCreateSession(convex, sessionId, mode = "chat") {
  throw new Error("Use useMutation(api.sessions.createSession) with sessionHelpers instead");
}

/**
 * @deprecated Use hooks with messageHelpers instead
 */
export async function saveUserMessage(convex, sessionId, text) {
  throw new Error("Use useMutation(api.messages.createMessage) with messageHelpers instead");
}

/**
 * @deprecated Use hooks with messageHelpers instead
 */
export async function saveAssistantMessage(convex, sessionId, messageData) {
  throw new Error("Use useMutation(api.messages.createMessage) with messageHelpers instead");
}

/**
 * @deprecated Use hooks with messageHelpers instead
 */
export async function updateMessageWithVideo(convex, messageId, videoUrl, status = "ready") {
  throw new Error("Use useMutation(api.messages.updateMessage) with messageHelpers instead");
}

/**
 * @deprecated Use useQuery(api.messages.getMessages) directly
 */
export async function getChatHistory(convex, sessionId) {
  throw new Error("Use useQuery(api.messages.getMessagesBySessionId) directly");
}

/**
 * @deprecated Use useQuery(api.sessions.getSessions) directly
 */
export async function getAllSessions(convex, limit = 50) {
  throw new Error("Use useQuery(api.sessions.getSessions) directly");
}

/**
 * @deprecated Use useMutation(api.sessions.archiveSession) directly
 */
export async function archiveSession(convex, sessionId) {
  throw new Error("Use useMutation(api.sessions.archiveSession) directly");
}
