import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import App from "./App";
import { ChatProvider } from "./hooks/useChat";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// Debug: Check if environment variables are loaded
console.log("Clerk Key:", import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ? "✅ Loaded" : "❌ Missing");
console.log("Convex URL:", import.meta.env.VITE_CONVEX_URL ? "✅ Loaded" : "❌ Missing");

if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key. Make sure .env.local is in the project root.");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <ChatProvider>
          <App />
        </ChatProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </React.StrictMode>
);
