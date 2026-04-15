import Link from "next/link"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button" // Uses your team's UI library

export default function ForbiddenPage() {
    return (
        <div className="flex h-[calc(100vh-64px)] w-full flex-col items-center justify-center bg-white p-4 text-center">
            {/* Icon with soft slate background */}
            <div className="mb-6 rounded-full bg-slate-50 p-6">
                <Lock className="h-12 w-12 text-slate-900" strokeWidth={1.5} />
            </div>

            {/* Typography using Slate colors to match Figma */}
            <h1 className="text-2xl font-bold text-slate-900">403 - Access Denied</h1>

            <p className="mt-4 max-w-100 text-slate-500 text-sm leading-relaxed">
                {"Sorry, you don't have permission to access this page. Please contact your administrator if you believe this is an error."}
            </p>

            {/* Buttons using UI Components */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
                {/* Primary Action - TIQRI Navy */}
                <Button asChild className="bg-[#000066] hover:bg-[#000044] px-10 h-11">
                    <Link href="/dashboard">Return to Dashboard</Link>
                </Button>

                {/* Secondary Action - Consistent Outline */}
                <Button variant="outline" className="px-10 h-11 border-slate-200 text-slate-600">
                    Contact IT Support
                </Button>
            </div>
        </div>
    )
}