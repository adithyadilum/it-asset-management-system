'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';

export interface PhysicalTagProps {
    assetId: string;
    modelName?: string;
}

export function PhysicalTag({ assetId, modelName = "Standard Model" }: PhysicalTagProps) {
    const [origin, setOrigin] = useState<string | null>(null);

    useEffect(() => {
        // Resolve origin on the client to ensure correct routing URLs
        if (typeof window !== 'undefined') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setOrigin(window.location.origin);
        }
    }, []);

    return (
        <div className="flex bg-white rounded-xl border border-[#e2e8f0] overflow-hidden w-96 h-48 p-5 text-slate-900 select-none items-center justify-between shadow-sm">
            <div className="flex flex-col justify-between h-full flex-1">
                <div className="flex items-center">
                    <Image
                        src="/tiqri-logo.png"
                        alt="TIQRI Corporate Logo"
                        width={100}
                        height={56}
                        priority
                        className="h-10 w-18 object-contain"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <h2 className="font-mono text-[32px] leading-tight font-bold tracking-tight text-[#0f172a]">
                        {assetId}
                    </h2>
                    <p className="text-[16px] leading-tight text-slate-500 font-medium truncate">
                        {modelName}
                    </p>
                </div>
            </div>
            <div className="flex items-center justify-center shrink-0 ml-8">
                <div className="bg-white">
                    {origin ? (
                        <QRCodeSVG
                            value={`${origin}/assets/${assetId}`}
                            size={128}
                            level="M"
                            includeMargin={false}
                        />
                    ) : (
                        // Show skeleton during SSR/Hydration until origin is resolved
                        <div className="w-32 h-32 bg-slate-100 animate-pulse rounded-md" />
                    )}
                </div>
            </div>
        </div>
    );
}
