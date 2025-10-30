import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Experience } from "./components/Experience";
import { UI } from "./components/UI";
import AuthButtons from "./components/AuthButtons";
import { useConvexUser } from "./hooks/useConvexUser";
import { useState, useEffect } from "react";
import "./styles/layout.css";

function App() {
  return (
    <>
      {/* Signed Out - Show Authentication Required */}
      <SignedOut>
        <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
          <div className="max-w-md w-full mx-4 bg-gray-800/50 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-700">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                Welcome to 3D Avatar AI
              </h1>
              <p className="text-gray-400">
                Sign in to access your personalized AI assistant with interactive 3D avatar
              </p>
            </div>
            
            <div className="space-y-4">
              <SignInButton mode="modal">
                <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-lg hover:shadow-xl">
                  Sign In
                </button>
              </SignInButton>
              
              <SignUpButton mode="modal">
                <button className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition font-medium shadow-lg hover:shadow-xl">
                  Create Account
                </button>
              </SignUpButton>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-700">
              <p className="text-sm text-gray-400 text-center">
                ✨ Chat with AI • 🎥 Generate Videos • 💾 Save History
              </p>
            </div>
          </div>
        </div>
      </SignedOut>

      {/* Signed In - Show Main App */}
      <SignedIn>
        <AuthenticatedApp />
      </SignedIn>
    </>
  );
}

function AuthenticatedApp() {
  const { isUserReady, isLoading, userId } = useConvexUser();
  const [showTimeoutError, setShowTimeoutError] = useState(false);
  const [forceShow, setForceShow] = useState(false);

  // Timeout fallback - if loading takes more than 5 seconds, force show the app
  useEffect(() => {
    if ((isLoading || !isUserReady) && userId) {
      const timeout = setTimeout(() => {
        console.warn("⚠️ User sync timeout - forcing app to show anyway");
        setShowTimeoutError(true);
        setForceShow(true); // Force show after 5 seconds if we have userId
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [isLoading, isUserReady, userId]);

  // Show loading while syncing user to Convex (but only for 5 seconds max)
  if (!forceShow && (isLoading || !isUserReady)) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading your profile...</p>
          {showTimeoutError && (
            <div className="mt-4 p-4 bg-yellow-900/50 border border-yellow-500 rounded-lg max-w-md mx-auto">
              <p className="text-yellow-200 text-sm">
                ⏳ Sync is taking longer than expected. Loading app anyway...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col lg:flex-row">
      {/* Auth Buttons - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <AuthButtons />
      </div>

      {/* Left Section - Avatar (1/3) */}
      <div className="w-full lg:w-1/3 h-[50vh] lg:h-full relative avatar-section">
        <Loader />
        <Leva hidden />
        <Canvas shadows camera={{ position: [0, 0, 1], fov: 30 }}>
          <Experience />
        </Canvas>
        <div className="absolute top-4 left-4 z-10">
          <UI showControls={true} showChat={false} />
        </div>
      </div>
      
      {/* Right Section - Chat Interface (2/3) */}
      <div className="w-full lg:w-2/3 h-[50vh] lg:h-full chat-section">
        <UI showControls={false} showChat={true} />
      </div>

      {/* Mobile Chat Interface */}
      <div className="fixed bottom-0 left-0 right-0 h-[50vh] lg:hidden bg-gray-900/95 z-50">
        <UI showControls={false} showChat={true} />
      </div>
    </div>
  );
}

export default App;
