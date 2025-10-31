import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  PlusIcon, 
  ChatBubbleLeftRightIcon,
  FilmIcon,
  TrashIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

export default function ChatHistory({ 
  currentSessionId, 
  onNewChat, 
  onSelectSession,
  onShowVideoLibrary 
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showVideoLibrary, setShowVideoLibrary] = useState(false);

  // Query sessions from Convex
  const sessions = useQuery(api.sessions.getSessions, {
    limit: 50,
    includeArchived: false
  }) || [];

  // Mutation to archive session
  const archiveSession = useMutation(api.sessions.updateSession);

  const handleArchiveSession = async (sessionId) => {
    try {
      await archiveSession({
        sessionId,
        updates: { isArchived: true }
      });
      console.log('✅ Session archived:', sessionId);
    } catch (error) {
      console.error('❌ Failed to archive session:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getSessionTitle = (session) => {
    // Use first message or fallback
    return session.title || session.firstMessage || 'New conversation';
  };

  if (!isExpanded) {
    return (
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-slate-800/90 hover:bg-slate-700/90 backdrop-blur-sm text-white p-2 rounded-r-lg shadow-lg transition-all duration-200 border-r border-t border-b border-slate-600/50"
          title="Expand sidebar"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 z-10 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-400" />
          Chat History
        </h2>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800/50"
          title="Collapse sidebar"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="p-4 space-y-2 border-b border-slate-700/50">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/50 font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          New Chat
        </button>

        <button
          onClick={() => {
            setShowVideoLibrary(!showVideoLibrary);
            if (onShowVideoLibrary) onShowVideoLibrary();
          }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
            showVideoLibrary
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/50'
              : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white border border-slate-700/30'
          }`}
        >
          <FilmIcon className="w-5 h-5" />
          Video Library
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.length === 0 ? (
          <div className="text-center text-slate-500 py-8 px-4">
            <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = session._id === currentSessionId;
            
            return (
              <div
                key={session._id}
                className={`group relative rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600/20 border border-blue-500/50 shadow-lg shadow-blue-500/10'
                    : 'hover:bg-slate-800/50 border border-transparent hover:border-slate-700/50'
                }`}
              >
                <button
                  onClick={() => onSelectSession(session._id)}
                  className="w-full text-left px-3 py-3 rounded-lg"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className={`text-sm font-medium line-clamp-2 ${
                      isActive ? 'text-blue-200' : 'text-slate-200 group-hover:text-white'
                    }`}>
                      {getSessionTitle(session)}
                    </h3>
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-1 animate-pulse" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ClockIcon className="w-3.5 h-3.5" />
                    <span>{formatTimestamp(session.lastMessageAt || session._creationTime)}</span>
                    {session.messageCount > 0 && (
                      <>
                        <span>•</span>
                        <span>{session.messageCount} messages</span>
                      </>
                    )}
                  </div>

                  {session.mode && (
                    <div className="mt-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        session.mode === 'video' 
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {session.mode === 'video' ? '🎬 Video' : '💬 Text'}
                      </span>
                    </div>
                  )}
                </button>

                {/* Delete button (shows on hover) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArchiveSession(session._id);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-800/80 hover:bg-red-600/80 text-slate-400 hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100"
                  title="Archive session"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-900/50">
        <div className="text-xs text-slate-500 text-center">
          {sessions.length} {sessions.length === 1 ? 'conversation' : 'conversations'}
        </div>
      </div>
    </div>
  );
}
