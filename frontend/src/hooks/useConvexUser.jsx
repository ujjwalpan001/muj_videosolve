import { useAuth, useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useState } from "react";

/**
 * Hook to ensure user exists in Convex database
 * Creates user automatically on first interaction if they don't exist
 */
export function useConvexUser() {
  const { userId, isLoaded: authLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const [isUserReady, setIsUserReady] = useState(false);
  const upsertUser = useMutation(api.users.upsertFromClerk);

  const isLoaded = authLoaded && userLoaded;

  useEffect(() => {
    async function ensureUserExists() {
      console.log("🔍 useConvexUser - State:", { 
        authLoaded, 
        userLoaded, 
        isLoaded, 
        userId: !!userId, 
        user: !!user 
      });
      
      if (!isLoaded) {
        console.log("⏳ Clerk not fully loaded yet");
        setIsUserReady(false);
        return;
      }

      if (!userId || !user) {
        console.log("❌ No user logged in");
        setIsUserReady(false);
        return;
      }

      try {
        console.log("📤 Creating/updating user in Convex...", { clerkId: userId });
        await upsertUser({
          clerkId: userId,
          email: user.primaryEmailAddress?.emailAddress || "",
          name: user.fullName || user.firstName || "User",
          avatarUrl: user.imageUrl,
        });
        console.log("✅ User synced to Convex successfully");
        setIsUserReady(true);
      } catch (error) {
        console.error("❌ Error ensuring user exists:", error);
        setIsUserReady(false);
      }
    }

    ensureUserExists();
  }, [userId, user, isLoaded, upsertUser, authLoaded, userLoaded]);

  return {
    isUserReady,
    isLoading: !isLoaded,
    userId,
    user,
  };
}
