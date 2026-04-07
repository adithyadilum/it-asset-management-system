// src/app/login/page.tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  // State for Form Inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // State for UI Feedback
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setIsProcessing(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      console.log("Database Login Successful:", data.user);
      router.push("/dashboard");

    } catch (error: unknown) {
      console.error("Login Error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      
      {/* Main Card Container */}
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-8 min-h-[360px] flex flex-col justify-center transition-all duration-300">
        
        {/* Branding Header */}
        <div className="flex justify-center items-center gap-3 mb-10">
          <Image
            src="/tiqri-logo.png" 
            alt="TIQRI Corporate Logo"      
            width={80}           
            height={20}          
            priority            
          />
          <span className="text-4xl font-semibold text-[#00145a] tracking-tight" style={{ fontFamily: 'Noto Sans, sans-serif' }}>
            Assets
          </span>
        </div>

        {isProcessing ? (
          /* Processing State */
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <h2 className="text-xl font-medium text-gray-800 mb-8">
              Authenticating...
            </h2>
            <div className="flex justify-center">
              <div className="w-10 h-10 border-4 border-gray-100 border-t-[#00145a] rounded-full animate-spin"></div>
            </div>
          </div>
        ) : (
          /* Input State */
          <div className="animate-in fade-in duration-500">
            
            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-6 flex items-center justify-center gap-3 bg-[#fff5f5] border border-red-100 rounded-lg p-3 text-red-600 shadow-sm">
                <span className="text-sm font-semibold">{errorMessage}</span>
              </div>
            )}

            <div className="text-center mb-8">
              <h1 className="text-2xl font-light text-gray-800">Welcome back</h1>
              <p className="text-sm text-gray-500 mt-2">
                Login with your mock corporate account
              </p>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#00145a] focus:outline-none sm:text-sm"
                  placeholder="employee@example.com"
                />
              </div>

              <div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#00145a] focus:outline-none sm:text-sm"
                  placeholder="••••••••"
                />
              </div>

              <button 
                type="submit"
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-3 bg-[#00145a] hover:bg-[#000d3d] active:scale-[0.98] text-white py-3 px-4 rounded-md font-medium transition-all shadow-md"
              >
                Sign In
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Tertiary Footer */}
      <footer className="mt-8 text-center">
        <p className="text-xs text-gray-400">
          Need help? Contact <span className="underline cursor-pointer hover:text-gray-600">TIQRI IT Support</span>
        </p>
      </footer>
    </div>
  );
}