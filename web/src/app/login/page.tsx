"use client";

import Image from "next/image";
import React, { useState } from "react";

/**
 * LoginPage Component
 * 
 * Provides the authentication interface for the IT Asset Management System.
 * 
 * Why three UI states?
 * - Default: Standard login prompt for initial user interaction.
 * - Session Expired: Informs users of invalidated sessions (e.g., timeout, token refresh failure).
 * - Processing: Disables interactions during OIDC redirect to prevent duplicate submissions.
 */

export default function LoginPage() {
  // State: Toggles error banner visibility when session token is invalid or expired
  const [showSessionError, setShowSessionError] = useState(true);
  // State: Prevents multiple login attempts during active authentication handshake
  const [isProcessing, setIsProcessing] = useState(false);

  /**
 * Initiates Microsoft SSO authentication flow.
 * 
 * Why simulate a redirect?
 * Temporarily sets isProcessing to true for UI verification during development.
 * Production implementation will replace this with actual OIDC redirect or API call.
 */
  const handleLogin = () => {
    setIsProcessing(true);
    console.log("Initiating Microsoft SSO redirect...");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      
      {/* Main Card Container 
          Fixed max-width ensures visual consistency across different display sizes.
          min-h-[360px] prevents layout shift when switching to the processing state.
      */}
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-8 min-h-[360px] flex flex-col justify-center transition-all duration-300">
        
        {/* Branding Header: Corporate Identity */}
        <div className="flex justify-center items-center gap-3 mb-10">
          <Image
            src="/tiqri-logo.png" 
            alt="TIQRI Corporate Logo"      
            width={80}           
            height={20}          
            priority            
          />
          <span className="text-4xl font-semibold text-[#00145a] tracking-tight" style={{ fontFamily: 'Noto Sans, sans-serif' }}>Assets</span>
       </div>

       {/* Conditional UI Logic 
          Uses a ternary operator to switch between 'Processing' and 'Input' views.
       */}
       {isProcessing ? (
         /* Processing State: Feedback for long-running operations */
         <div className="text-center animate-in fade-in zoom-in duration-300">
           <h2 className="text-xl font-medium text-gray-800 mb-8">
             Processing your request
           </h2>
           
           <div className="flex justify-center">
             {/* CSS-only Spinner: Utilizes animate-spin for smooth 360deg rotation */}
             <div className="w-10 h-10 border-4 border-gray-100 border-t-[#00145a] rounded-full animate-spin"></div>
           </div>
         </div>
       ) : (
         /* Input State: Default and Error views */
         <div className="animate-in fade-in duration-500">
           
           {/* Session Expired Banner: Triggered by system timeout or invalid tokens */}
           {showSessionError && (
             <div className="mb-6 flex items-center justify-center gap-3 bg-[#fff5f5] border border-red-100 rounded-lg p-3 text-red-600 shadow-sm">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                 <path d="M21 3v5h-5" />
                 <path d="M12 7v5l2 2" />
               </svg>
               <span className="text-sm font-semibold text-red-700">Your session has expired!</span>
             </div>
           )}

           <div className="text-center mb-8">
             <h1 className="text-2xl font-light text-gray-800">Welcome back</h1>
             <p className="text-sm text-gray-500 mt-2">
               Login with your corporate account
             </p>
           </div>

           {/* Authentication Trigger */}
           <button 
             className="w-full flex items-center justify-center gap-3 bg-[#00145a] hover:bg-[#000d3d] active:scale-[0.98] text-white py-3 px-4 rounded-md font-medium transition-all shadow-md"
             onClick={handleLogin}
           >
             {/* Microsoft Brand Icon (Windows Quad-Color Grid) */}
             <div className="grid grid-cols-2 gap-0.5">
               <div className="w-2.5 h-2.5 bg-[#f25022]"></div>
               <div className="w-2.5 h-2.5 bg-[#7fba00]"></div>
               <div className="w-2.5 h-2.5 bg-[#00a4ef]"></div>
               <div className="w-2.5 h-2.5 bg-[#ffb900]"></div>
             </div>
             Login with Microsoft
           </button>
         </div>
       )}
      </div>

      {/* Tertiary Footer: Support Information */}
      <footer className="mt-8 text-center">
        <p className="text-xs text-gray-400">
          Need help? Contact <span className="underline cursor-pointer hover:text-gray-600">TIQRI IT Support</span>
        </p>
      </footer>

      
    </div>
  );
}