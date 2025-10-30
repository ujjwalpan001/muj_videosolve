import { useUser, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

/**
 * Protected route wrapper that requires authentication
 * Usage: Wrap components that need authentication
 * 
 * Example:
 * <ProtectedRoute>
 *   <YourComponent />
 * </ProtectedRoute>
 */
export function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

/**
 * Show content only when user is authenticated
 */
export function AuthenticatedOnly({ children }) {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Please sign in to continue</div>
      </div>
    );
  }

  return children;
}

/**
 * Show content only when user is NOT authenticated
 */
export function UnauthenticatedOnly({ children }) {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (isSignedIn) {
    return null;
  }

  return children;
}
