'use client';

import { Camera } from 'lucide-react';

export function AdminMobileScannerButton() {
  const handleLaunchScanner = () => {
    // Placeholder click handler
  };

  return (
    <section>
      <button
        onClick={handleLaunchScanner}
        className="w-full bg-linear-to-br from-primary to-primary/80 hover:to-primary/70 active:scale-[0.98] text-primary-foreground py-10 px-6 rounded-[28px] flex flex-col items-center justify-center gap-4 shadow-[0_8px_30px_rgb(10,17,66,0.2)] transition-all duration-300 ease-out"
      >
        <div className="bg-background/10 backdrop-blur-md p-4 rounded-full border border-white/10 shadow-inner">
          <Camera
            className="h-8 w-8 text-primary-foreground drop-shadow-md"
            strokeWidth={1.5}
          />
        </div>
        <h2 className="text-2xl font-bold mt-2 tracking-tight">
          Launch Scanner
        </h2>
        <p className="text-center text-[15px] text-blue-100/80 mx-4 leading-relaxed font-medium">
          Instantly scan asset barcodes to
          <br />
          update records or verify
          <br />
          assignments
        </p>
      </button>
    </section>
  );
}
