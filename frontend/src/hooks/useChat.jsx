import { createContext, useContext, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { sessionHelpers, messageHelpers } from "../lib/convexHelpers";
import { useUser, useAuth } from "@clerk/clerk-react";

const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [videoPolling, setVideoPolling] = useState(new Map()); // Track polling for each session
  const [videoSyncState, setVideoSyncState] = useState(new Map()); // Track video sync state
  const [currentSessionId, setCurrentSessionId] = useState(null); // Track current session (string ID)
  const [currentConvexSessionId, setCurrentConvexSessionId] = useState(null); // Track Convex _id
  const [convexMessageIds, setConvexMessageIds] = useState(new Map()); // Map sessionId -> messageId
  
  // Get Clerk user ID and auth status
  const { user } = useUser();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const userId = user?.id || 'default-user';
  
  // Debug: Log user authentication status
  useEffect(() => {
    console.log("🔐 Clerk Auth Status:", {
      isLoaded,
      isSignedIn,
      isAuthenticated: !!user,
      userId: user?.id,
      email: user?.primaryEmailAddress?.emailAddress
    });
    
    // Test getting token
    if (isSignedIn && getToken) {
      getToken({ template: "convex" }).then(token => {
        console.log("🎫 Clerk Token (first 50 chars):", token?.substring(0, 50));
      }).catch(err => {
        console.error("❌ Failed to get Clerk token:", err);
      });
    }
  }, [user, isLoaded, isSignedIn, getToken]);
  
  // Convex mutations
  const createSession = useMutation(api.sessions.createSession);
  const createMessage = useMutation(api.messages.createMessage);
  const updateMessage = useMutation(api.messages.updateMessage);
  
  const chat = async (message, videoMode = false) => {
    setLoading(true);
    
    // Generate or reuse session ID for this conversation
    let sessionId = currentSessionId;
    let convexSessionId = currentConvexSessionId;
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCurrentSessionId(sessionId);
      
      // Create session in Convex
      try {
        console.log("📝 Creating new session in Convex...", {
          sessionId,
          mode: videoMode ? 'video' : 'chat',
          userId
        });
        const sessionArgs = sessionHelpers.createSessionArgs(sessionId, videoMode ? 'video' : 'chat');
        console.log("📦 Session args:", sessionArgs);
        convexSessionId = await createSession(sessionArgs);
        setCurrentConvexSessionId(convexSessionId);
        console.log("✅ Session created in Convex with _id:", convexSessionId);
      } catch (error) {
        console.error("❌ Error creating session:", error);
        console.error("Error details:", error.message, error.stack);
      }
    }
    
    console.log("💾 Saving user message to Convex...", { sessionId, convexSessionId, message });
    
    // Save user message to Convex
    let userMessageId = null;
    if (convexSessionId) {
      try {
        const userMessageArgs = {
          sessionId: convexSessionId, // Use Convex _id, not string
          type: "user",
          text: message,
          videoStatus: "none",
          facialExpression: "default",
          animation: "Idle"
        };
        console.log("📦 User message args:", userMessageArgs);
        userMessageId = await createMessage(userMessageArgs);
        console.log("✅ User message saved to Convex with ID:", userMessageId);
      } catch (error) {
        console.error("❌ Error saving user message:", error);
        console.error("Error details:", error.message, error.stack);
      }
    } else {
      console.warn("⚠️ No Convex session ID available, skipping message save");
    }
    
    // Prepare chat history for context (last 10 messages to avoid token limit)
    const recentHistory = chatHistory.slice(-10).map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));
    
    // Add user message to chat history immediately
    setChatHistory(prev => [...prev, { type: 'user', text: message }]);
    
    const data = await fetch(`${backendUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        message, 
        videoMode, 
        sessionId,
        userId,  // Send Clerk user ID to backend
        chatHistory: recentHistory // Include recent chat history for context
      }),
    });
    const response = await data.json();
    const resp = response.messages;
    
    console.log("📨 Chat response received:", {
      videoMode,
      messageCount: resp.length,
      firstMessage: resp[0],
      hasAudio: resp[0]?.audio ? `${resp[0].audio.length} chars` : 'none',
      hasLipsync: resp[0]?.lipsync ? 'yes' : 'none',
      animationTimeline: resp[0]?.animationTimeline || 'none'
    });
    
    // Save assistant messages to Convex
    console.log("💾 Saving assistant messages to Convex:", resp.length);
    let assistantMessageId = null;
    if (convexSessionId) {
      try {
        for (const msg of resp) {
          const assistantMessageArgs = {
            sessionId: convexSessionId, // Use Convex _id
            type: "assistant",
            text: msg.text || msg.chatResponse,
            videoExplanation: msg.videoExplanation,
            manimCode: msg.manimCode,
            videoStatus: msg.videoExplanation ? "pending" : "none",
            facialExpression: msg.facialExpression || "default",
            animation: msg.animation || "Idle",
            animationTimeline: msg.animationTimeline,
            lipsyncData: msg.lipsync,
            tokenUsage: msg.tokenUsage,
            processingTime: msg.processingTime
          };
          assistantMessageId = await createMessage(assistantMessageArgs);
          console.log("✅ Assistant message saved to Convex with ID:", assistantMessageId);
          
          // Store message ID if this message will have a video
          if (msg.videoExplanation) {
            setConvexMessageIds(prev => new Map(prev).set(sessionId, assistantMessageId));
          }
        }
      } catch (error) {
        console.error("❌ Error saving assistant messages:", error);
        console.error("Error details:", error.message, error.stack);
      }
    } else {
      console.warn("⚠️ No Convex session ID available, skipping assistant message save");
    }
    
    // Process bot response and add to chat history immediately
    if (videoMode && resp.length > 0) {
      // Combine all text messages for immediate display
      const combinedText = resp.map(msg => msg.text || msg.chatResponse).join(' ');
      
      // Add chat entry with combined text immediately (no video yet)
      const chatEntry = { 
        type: 'assistant', 
        text: combinedText,
        sessionId: sessionId,
        videoGenerating: true,
        videoUrl: null,
        videoExplanation: resp.map(msg => msg.videoExplanation || msg.text).join(' ') // Store explanation for avatar sync
      };
      
      setChatHistory(prev => [...prev, chatEntry]);
      
      // Also add enhanced messages to the avatar message queue with session info
      const enhancedMessages = resp.map(msg => ({
        ...msg,
        sessionId: sessionId,
        videoExplanation: msg.videoExplanation || msg.text
      }));
      
      setMessages((messages) => [...messages, ...enhancedMessages]);
      
      // Start polling for video if in video mode
      if (response.videoGenerating) {
        startVideoPolling(sessionId, chatEntry);
      }
    } else {
      // Regular chat mode - add each message separately
      resp.forEach((msg, index) => {
        console.log(`💬 Adding chat message ${index}:`, {
          text: msg.text,
          hasAudio: msg.audio ? `${msg.audio.length} chars` : 'none',
          hasLipsync: msg.lipsync ? 'yes' : 'none',
          animation: msg.animation,
          facialExpression: msg.facialExpression,
          animationTimeline: msg.animationTimeline || 'none'
        });
        
        setChatHistory(prev => [...prev, { 
          type: 'assistant', 
          text: msg.text || msg.chatResponse,
          videoUrl: msg.videoUrl 
        }]);
      });
      
      // Add messages to avatar queue for speaking/animation
      console.log("🎭 Adding messages to avatar queue:", resp.length, "messages");
      setMessages((messages) => [...messages, ...resp]);
    }
    
    setLoading(false);
  };
  
  const startVideoPolling = (sessionId, chatEntry) => {
    console.log(`🎬 Starting video polling for session: ${sessionId}`);
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${backendUrl}/video-ready/${sessionId}`);
        const videoData = await response.json();
        
        if (videoData.ready) {
          console.log(`✅ Video ready for session ${sessionId}: ${videoData.videoUrl}`);
          
          // Update Convex message with video URL
          console.log("💾 Updating Convex with video URL");
          const messageId = convexMessageIds.get(sessionId);
          if (messageId) {
            try {
              const updateArgs = messageHelpers.updateVideoArgs(messageId, videoData.videoUrl, "ready");
              await updateMessage(updateArgs);
              console.log("✅ Video URL saved to Convex");
            } catch (error) {
              console.error("❌ Error updating video URL in Convex:", error);
            }
          }
          
          // Update the chat history to include the video
          setChatHistory(prev => prev.map(msg => 
            msg.sessionId === sessionId 
              ? { ...msg, videoUrl: videoData.videoUrl, videoGenerating: false }
              : msg
          ));
          
          // Initialize video sync state for this session
          setVideoSyncState(prev => new Map(prev).set(sessionId, {
            videoReady: true,
            isPlaying: false,
            currentTime: 0,
            audioContext: null,
            audioBuffer: null,
            audioSource: null
          }));
          
          // Clear the polling interval
          clearInterval(pollInterval);
          setVideoPolling(prev => {
            const newMap = new Map(prev);
            newMap.delete(sessionId);
            return newMap;
          });
        }
      } catch (error) {
        console.error(`❌ Error polling for video ${sessionId}:`, error);
      }
    }, 2000); // Poll every 2 seconds
    
    // Store the interval for cleanup
    setVideoPolling(prev => new Map(prev).set(sessionId, pollInterval));
    
    // Auto-cleanup after 5 minutes to prevent infinite polling
    setTimeout(() => {
      clearInterval(pollInterval);
      setVideoPolling(prev => {
        const newMap = new Map(prev);
        newMap.delete(sessionId);
        return newMap;
      });
      console.log(`⏰ Video polling timeout for session ${sessionId}`);
    }, 300000); // 5 minutes
  };

  // Avatar speech synchronization functions
  const handleVideoPlay = (sessionId) => {
    console.log(`🎵 Video started playing for session: ${sessionId}`);
    setVideoSyncState(prev => {
      const newMap = new Map(prev);
      const syncState = newMap.get(sessionId);
      if (syncState) {
        newMap.set(sessionId, { ...syncState, isPlaying: true });
      }
      return newMap;
    });
  };

  const handleVideoPause = (sessionId) => {
    console.log(`⏸️ Video paused for session: ${sessionId}`);
    setVideoSyncState(prev => {
      const newMap = new Map(prev);
      const syncState = newMap.get(sessionId);
      if (syncState) {
        newMap.set(sessionId, { ...syncState, isPlaying: false });
      }
      return newMap;
    });
  };

  const handleVideoSeek = (sessionId, time) => {
    console.log(`⏭️ Video seeked to ${time}s for session: ${sessionId}`);
    setVideoSyncState(prev => {
      const newMap = new Map(prev);
      const syncState = newMap.get(sessionId);
      if (syncState) {
        newMap.set(sessionId, { 
          ...syncState, 
          currentTime: time,
          lastUpdateTime: Date.now() // Track when this update occurred
        });
      }
      return newMap;
    });
  };

  const handleVideoEnd = (sessionId) => {
    console.log(`🔚 Video ended for session: ${sessionId}`);
    setVideoSyncState(prev => {
      const newMap = new Map(prev);
      const syncState = newMap.get(sessionId);
      if (syncState) {
        newMap.set(sessionId, { ...syncState, isPlaying: false, currentTime: 0 });
      }
      return newMap;
    });
  };

  const getVideoSyncState = (sessionId) => {
    return videoSyncState.get(sessionId) || null;
  };
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const [chatHistory, setChatHistory] = useState([]);
  const onMessagePlayed = () => {
    setMessages((messages) => messages.slice(1));
  };

  useEffect(() => {
    if (messages.length > 0) {
      setMessage(messages[0]);
    } else {
      setMessage(null);
    }
  }, [messages]);

  // Load session messages from Convex
  const loadSessionMessages = async (sessionId) => {
    try {
      console.log('🔍 Fetching messages for session:', sessionId);
      
      // Get Clerk token for authentication
      const token = await getToken({ template: "convex" });
      
      // Fetch messages from Convex using the sessionId string
      const messagesResponse = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          path: 'messages:getMessagesBySessionId',
          args: { sessionId }
        })
      });

      const messages = await messagesResponse.json();
      console.log('📥 Loaded messages:', messages?.length || 0, messages);

      if (messages && messages.length > 0) {
        // Transform Convex messages to chat history format
        const formattedHistory = messages.map(msg => ({
          type: msg.type, // "user" or "assistant"
          text: msg.text,
          videoUrl: msg.videoUrl,
          videoGenerating: msg.videoStatus === "generating" || msg.videoStatus === "pending",
          facialExpression: msg.facialExpression,
          animation: msg.animation,
          lipsync: msg.lipsyncData,
          audio: null // Audio would need to be re-fetched if needed
        }));

        setChatHistory(formattedHistory);
        
        // Find the Convex session _id from the session string ID
        const sessionResponse = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            path: 'sessions:getSessionBySessionId',
            args: { sessionId }
          })
        });

        const sessionData = await sessionResponse.json();

        if (sessionData?._id) {
          setCurrentSessionId(sessionId);
          setCurrentConvexSessionId(sessionData._id);
          console.log('✅ Session loaded:', { 
            sessionId, 
            convexId: sessionData._id, 
            messageCount: messages.length 
          });
        }
      } else {
        // Empty session or no messages yet
        setCurrentSessionId(sessionId);
        setCurrentConvexSessionId(null);
        setChatHistory([]);
        console.log('📭 Empty session selected');
      }
    } catch (error) {
      console.error('❌ Error loading session messages:', error);
      throw error; // Re-throw so UI can handle it
    }
  };

  return (
    <ChatContext.Provider
      value={{
        chat,
        message,
        onMessagePlayed,
        loading,
        cameraZoomed,
        setCameraZoomed,
        chatHistory,
        handleVideoPlay,
        handleVideoPause,
        handleVideoSeek,
        handleVideoEnd,
        getVideoSyncState,
        currentSessionId,
        setCurrentSessionId,
        currentConvexSessionId,
        setCurrentConvexSessionId,
        setChatHistory,
        loadSessionMessages
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
