import { Bell, ChevronRight, Search } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function TopHeader() {
    return (
        <header className="supports-backdrop-filter:bg-background/80 sticky top-0 z-20 flex h-17 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur">
            <div className="flex items-center gap-2">
                <SidebarTrigger />
                <Separator orientation="vertical" className="h-4" />

                <div className="hidden items-center gap-1.5 md:flex">
                    <span className="font-text-sm-regular text-muted-foreground">
                        IT &amp; Digital
                    </span>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                    <span className="font-text-sm-semi-bold text-foreground">Hardware</span>
                </div>
            </div>

            <div className="hidden h-9 w-full max-w-md items-center rounded-lg border border-border bg-card px-2 shadow-box-shadow-shadow-xs lg:flex">
                <Search className="size-4 text-muted-foreground" />
                <Input
                    placeholder="Search..."
                    className="h-8 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
                />
                <div className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5">
                        Ctrl
                    </kbd>
                    <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5">
                        K
                    </kbd>
                </div>
            </div>

            <div className="inline-flex items-center gap-2">
                <Button variant="ghost" size="icon-sm" aria-label="Notifications">
                    <Bell className="size-4" />
                </Button>
                <Separator orientation="vertical" className="hidden h-4 sm:block" />

                <div className="inline-flex items-center gap-2 rounded-lg px-1 py-1">
                    <Avatar className="rounded-lg">
                        <AvatarImage src="" alt="User avatar" />
                        <AvatarFallback className="rounded-lg text-xs">TP</AvatarFallback>
                    </Avatar>

                    <div className="hidden flex-col sm:flex">
                        <span className="font-text-sm-semi-bold text-foreground">
                            Thushara Priyantha
                        </span>
                        <span className="font-text-xs-regular text-muted-foreground">
                            admin@tiqri.com
                        </span>
                    </div>
                </div>
            </div>
        </header>
    )
}
