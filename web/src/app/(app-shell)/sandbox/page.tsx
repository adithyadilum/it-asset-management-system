"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { SearchableDropdown } from "@/components/ui/searchable-dropdown"
import { StandardModal } from "@/components/ui/standard-modal"

export default function UIPlaygroundPage() {
    const users = [
        { value: "adithya", label: "Adithya Dilum" },
        { value: "chamodi", label: "Chamodi Prathibha" },
        { value: "tharumuthu", label: "Tharumuthu Ruchiranga" },
        { value: "tharushi", label: "Tharushi Hasinika " },
    ]


    const [isModalOpen, setIsModalOpen] = useState(false)

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
    <h2 className="text-lg font-semibold mb-4 text-[#00145a]">Standard Modal Test</h2>
    <Button variant="outline" onClick={() => setIsModalOpen(true)}>
        Trigger CRUD Modal
    </Button>

    <StandardModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        title="Add New Location"
        description="Enter the details of the new site or office building."
        footer={
            <>
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button className="bg-[#00145a] hover:bg-[#000d3d]">Save Location</Button>
            </>
        }
    >
        <div className="space-y-4">
            <div className="h-10 bg-slate-100 rounded border border-slate-200 flex items-center px-3 text-xs text-slate-400">
                [Insert Location Name Input Here]
            </div>
        </div>
    </StandardModal>
</div>

        </div>
    )
}
