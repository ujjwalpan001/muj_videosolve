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
        <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
          <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-slate-700/50">
            <div className="text-center mb-8">
              <div className="mb-4 flex justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-4xl">🤖</span>
                </div>
              </div>
              <h1 className="text-4xl font-bold text-white mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                3D Avatar AI
              </h1>
              <p className="text-gray-400 text-sm">
                Your personalized AI assistant with interactive 3D avatar
              </p>
            </div>
            
            <div className="space-y-3">
              <SignInButton mode="modal">
                <button className="w-full px-6 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-lg hover:shadow-blue-500/50 hover:scale-105 transform duration-200">
                  Sign In
                </button>
              </SignInButton>
              
              <SignUpButton mode="modal">
                <button className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition font-medium shadow-lg hover:shadow-purple-500/50 hover:scale-105 transform duration-200">
                  Create Account
                </button>
              </SignUpButton>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-700/50">
              <div className="flex justify-center gap-6 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="text-purple-400">✨</span> AI Chat
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-pink-400">🎥</span> Videos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-blue-400">💾</span> History
                </span>
              </div>
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
    <div className="w-screen h-screen flex flex-col lg:flex-row bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 p-4 gap-4">
      {/* Auth Buttons - Top Right */}
      <div className="absolute top-6 right-6 z-50">
        <AuthButtons />
      </div>

      {/* Left Section - Chat Interface (2/3) with rounded floating card */}
      <div className="w-full lg:w-2/3 h-[50vh] lg:h-full">
        <div className="w-full h-full bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden">
          <UI showControls={false} showChat={true} />
        </div>
      </div>
      
      {/* Right Section - Avatar (1/3) with rounded floating card */}
      <div className="w-full lg:w-1/3 h-[50vh] lg:h-full relative">
        <div className="w-full h-full bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden">
          <Loader />
          <Leva hidden />
          <Canvas shadows camera={{ position: [0, 0, 1], fov: 30 }}>
            <Experience />
          </Canvas>
          <div className="absolute top-4 left-4 z-10">
            <UI showControls={true} showChat={false} />
          </div>
        </div>
      </div>

      {/* Mobile Chat Interface */}
      <div className="fixed bottom-4 left-4 right-4 h-[50vh] lg:hidden bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden z-50">
        <UI showControls={false} showChat={true} />
      </div>
    </div>
  );
}

export default App;
