import { useAuth, useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useConvexUser } from "../hooks/useConvexUser";

/**
 * Display current user info - useful for debugging
 * Shows Clerk user data and Convex sync status
 */
export function UserDebugInfo() {
  const { userId, isLoaded: authLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const { isUserReady } = useConvexUser();
  const convexUser = useQuery(api.users.getCurrentUser);

  if (!authLoaded || !userLoaded) {
    return <div className="text-xs text-gray-500">Loading auth...</div>;
  }

  if (!userId) {
    return <div className="text-xs text-gray-500">Not signed in</div>;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-gray-900/90 text-white p-3 rounded-lg text-xs space-y-1 max-w-xs z-50">
      <div className="font-bold text-green-400">🔐 Auth Status</div>
      <div>Clerk ID: {userId.slice(0, 12)}...</div>
      <div>Name: {user?.fullName || "N/A"}</div>
      <div>Email: {user?.primaryEmailAddress?.emailAddress}</div>
      <div className="pt-2 border-t border-gray-700">
        <div className="font-bold text-blue-400">📊 Convex Sync</div>
        <div>Status: {isUserReady ? "✅ Synced" : "⏳ Syncing..."}</div>
        {convexUser && (
          <>
            <div>Total Sessions: {convexUser.totalSessions}</div>
            <div>Total Messages: {convexUser.totalMessages}</div>
            <div>Videos Generated: {convexUser.totalVideosGenerated}</div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Simple authenticated user display
 */
export function UserInfo() {
  const { user } = useUser();
  const convexUser = useQuery(api.users.getCurrentUser);

  if (!user) return null;

  return (
    <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg">
      <img
        src={user.imageUrl}
        alt={user.fullName || "User"}
        className="w-8 h-8 rounded-full"
      />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white">
          {user.fullName || user.firstName}
        </span>
        {convexUser && (
          <span className="text-xs text-gray-400">
            {convexUser.totalMessages} messages
          </span>
        )}
      </div>
    </div>
  );
}
