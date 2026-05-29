"use client"

import { useState } from "react"
import { Laptop } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"

export interface AcceptAssignmentDialogProps {
    assetName: string
    assetTag: string
    condition: string
    assignedBy: string
    date: string
    onConfirm: () => void
    onReportIssue: () => void
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export function AcceptAssignmentDialog({
    assetName,
    assetTag,
    condition,
    assignedBy,
    date,
    onConfirm,
    onReportIssue,
    isOpen,
    onOpenChange,
}: AcceptAssignmentDialogProps) {
    const [acceptanceChecked, setAcceptanceChecked] = useState(false)

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                onOpenChange(open)

                if (!open) {
                    setAcceptanceChecked(false)
                }
            }}
        >
            <DialogTrigger asChild>
                <Button className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[0px_1px_2px_0px_rgba(0,0,0,0.10)] hover:bg-primary/90">
                    Review & Accept
                </Button>
            </DialogTrigger>

            <DialogContent className="w-[92vw] gap-4 rounded-lg border border-border bg-background p-6 shadow-xl shadow-black/10 sm:max-w-115">
                <DialogHeader className="space-y-0">
                    <div className="flex items-center justify-between gap-4">
                        <DialogTitle className="font-text-lg-semi-bold leading-7 text-foreground">
                            Accept Asset Assignment
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="rounded-lg border border-border bg-muted py-6 shadow-sm">
                    <div className="flex flex-col items-center justify-center gap-6 px-6">
                        <div className="flex w-full items-center justify-center gap-2.5 px-6 md:px-8">
                            <Laptop className="h-10 w-10 shrink-0 text-foreground" />
                            <div className="flex-1 text-lg font-semibold leading-tight text-card-foreground font-['Noto_Sans']">
                                {assetName}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 px-6">
                        <div className="space-y-1.5 text-sm leading-5 font-['Noto_Sans'] md:grid md:grid-cols-[140px_1fr] md:gap-x-4 md:gap-y-2 md:space-y-0">
                            <div className="flex items-start justify-between gap-4 md:contents">
                                <span className="font-medium text-muted-foreground">Asset ID:</span>
                                <span className="font-medium text-foreground md:text-left">{assetTag}</span>
                            </div>
                            <div className="flex items-start justify-between gap-4 md:contents">
                                <span className="font-medium text-muted-foreground">Condition:</span>
                                <span className="font-medium text-foreground md:text-left">{condition}</span>
                            </div>
                            <div className="flex items-start justify-between gap-4 md:contents">
                                <span className="font-medium text-muted-foreground">Assigned By:</span>
                                <span className="font-medium text-foreground md:text-left">{assignedBy}</span>
                            </div>
                            <div className="flex items-start justify-between gap-4 md:contents">
                                <span className="font-medium text-muted-foreground">Date:</span>
                                <span className="font-medium text-foreground md:text-left">{date}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <DialogDescription className="text-sm leading-6 text-muted-foreground font-['Noto_Sans']">
                        By accepting this equipment, you acknowledge that you have received it in the condition stated above and agree to abide by the TIQRI IT Acceptable Use Policy.
                    </DialogDescription>

                    <label className="flex items-start gap-3 text-sm font-medium leading-5 text-foreground font-['Noto_Sans']">
                        <Checkbox
                            checked={acceptanceChecked}
                            onCheckedChange={(checked) => setAcceptanceChecked(checked === true)}
                            className="mt-0.5"
                        />
                        <span>I acknowledge and accept responsibility for this asset.</span>
                    </label>
                </div>

                <DialogFooter className="gap-2 rounded-b-none border-t-0 bg-transparent p-0">
                    <Button
                        variant="outline"
                        type="button"
                        className="h-9 rounded-lg px-4 text-sm font-medium text-secondary-foreground"
                        onClick={onReportIssue}
                    >
                        Report Issue / Did Not Receive
                    </Button>
                    <Button
                        type="button"
                        className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        disabled={!acceptanceChecked}
                        onClick={onConfirm}
                    >
                        Confirm Receipt
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}