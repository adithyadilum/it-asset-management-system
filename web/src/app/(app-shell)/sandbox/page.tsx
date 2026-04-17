"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchableDropdown } from "@/components/ui/searchable-dropdown";

export default function UIPlaygroundPage() {
    const [isOpen, setIsOpen] = useState(false);

    const users = [
        { value: "adithya", label: "Adithya Dilum" },
        { value: "chamodi", label: "Chamodi Prathibha" },
        { value: "tharumuthu", label: "Tharumuthu Ruchiranga" },
        { value: "tharushi", label: "Tharushi Hasinika " },
    ];

    return (
        <div className="p-10 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">TIQRI Design Sandbox</h1>
                <p className="text-slate-500">Isolate and test shared components here.</p>
            </div>

            <div className="p-6 border rounded-xl border-dashed border-slate-300 bg-slate-50"> 
                <h2 className="text-lg font-semibold mb-4 text-[#00145a]">Searchable Dropdown Test</h2>
                <div className="max-w-xs"> 
                    <SearchableDropdown 
                        options={users} 
                        placeholder="Select a user"
                        onSelect={(val) => console.log("Selected User ID:", val)}
                    />
                </div>
            </div>

            <div className="p-6 border rounded-xl border-dashed border-slate-300 bg-slate-50">
                <h2 className="text-lg font-semibold mb-4">Slide Panel Test</h2>

                <Button onClick={() => setIsOpen(true)}>
                    Open Test Panel
                </Button>

                
            </div>
        </div>
    );
}