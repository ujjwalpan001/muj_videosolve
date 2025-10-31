import {
  SignInButton,
  SignUpButton,
  UserButton,
  SignedIn,
  SignedOut,
} from "@clerk/clerk-react";

export default function AuthButtons() {
  return (
    <div className="flex items-center gap-3">
      <SignedOut>
        <div className="flex gap-2 bg-slate-800/90 backdrop-blur-lg rounded-2xl p-2 shadow-xl border border-slate-700/50">
          <SignInButton mode="modal">
            <button className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-lg hover:shadow-blue-500/50 hover:scale-105 transform duration-200">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition font-medium shadow-lg hover:shadow-purple-500/50 hover:scale-105 transform duration-200">
              Sign Up
            </button>
          </SignUpButton>
        </div>
      </SignedOut>
      <SignedIn>
        <div className="bg-slate-800/90 backdrop-blur-lg rounded-2xl p-2 shadow-xl border border-slate-700/50">
          <UserButton 
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-10 h-10 rounded-xl ring-2 ring-purple-500/50 hover:ring-purple-400 transition"
              }
            }}
          />
        </div>
      </SignedIn>
    </div>
  );
}
