import Link from "next/link"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"

export default function ForbiddenPage() {
    return (
        <div className="flex h-[calc(100vh-64px)] w-full items-center justify-center bg-white p-4">
            <Empty className="max-w-xl rounded-xl border border-slate-200 bg-white p-8">
                <EmptyHeader>
                    <EmptyMedia variant="icon" className="mb-2 bg-slate-100 text-slate-900">
                        <Lock className="h-5 w-5" strokeWidth={1.5} />
                    </EmptyMedia>
                    <EmptyTitle className="text-xl text-slate-900">403 - Access Denied</EmptyTitle>
                    <EmptyDescription className="max-w-md text-slate-600">
                        Sorry, you do not have permission to access this page. Please contact your
                        administrator if you believe this is an error.
                    </EmptyDescription>
                </EmptyHeader>

                <EmptyContent className="mt-2 flex-row flex-wrap justify-center gap-3">
                    <Button asChild className="h-11 px-8 bg-[#000066] hover:bg-[#000044]">
                        <Link href="/dashboard">Return to Dashboard</Link>
                    </Button>
                    <Button variant="outline" className="h-11 px-8 border-slate-200 text-slate-600">
                        Contact IT Support
                    </Button>
                </EmptyContent>
            </Empty>
        </div>
    )
}