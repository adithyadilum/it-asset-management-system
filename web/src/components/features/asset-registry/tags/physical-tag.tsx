'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BrandHeader } from '@/components/shared/brand-header';

export interface PhysicalTagProps {
    assetId: string;
    modelName?: string;
}

export function PhysicalTag({ assetId, modelName = "Standard Model" }: PhysicalTagProps) {
    const [origin, setOrigin] = useState('https://assets.tiqri.com');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin);
        }
    }, []);

    return (
        <div className="flex bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden w-90 h-45 p-4 text-slate-900 select-none">
            <div className="flex flex-col justify-between flex-1 py-1 pr-4">
                <div className="scale-75 origin-top-left -ml-1">
                    <BrandHeader />
                </div>
                <div className="flex flex-col gap-1">
                    <h2 className="font-mono text-[28px] leading-none font-bold tracking-tight text-[#0f172a]">
                        {assetId}
                    </h2>
                    <p className="text-[15px] leading-none text-slate-600">
                        {modelName}
                    </p>
                </div>
            </div>
            <div className="flex items-center justify-center shrink-0">
                <div className="bg-white p-1 rounded-lg">
                    {origin ? (
                        <QRCodeSVG
                            value={`${origin}/assets/${assetId}`}
                            size={132}
                            level="M"
                            includeMargin={false}
                        />
                    ) : (
                        <div className="w-33 h-33 bg-slate-100 animate-pulse rounded-md" />
                    )}
                </div>
            </div>
        </div>
    );
}
