"use client"

import { Info, X } from "lucide-react"

// UI Components
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"

// --- THE CONTRACT (For Developer 3) ---
export interface SystemUser {
  name: string
  email: string
}

interface RemoveUserModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  user?: SystemUser
  targetRole?: string
}

export function RemoveUserModal({ 
  isOpen, 
  onOpenChange,
  // Default mock data to match your Figma
  user = { name: "Nadeesha", email: "Admin@tiqri.com" }, 
  targetRole = "IT Operations"
}: RemoveUserModalProps) {
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* The [&>button]:hidden class hides Shadcn's default absolute close button
        so we can perfectly align our custom X icon in the header layout.
      */}
      {/* COPILOT FIX: Added brackets to sm:max-w-[500px] */}
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl [&>button]:hidden">
        
        <div className="p-6">
          {/* Custom Header with inline X close button */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-slate-400 mt-0.5" />
              <DialogTitle className="text-lg font-bold text-slate-900">
                Remove User from {targetRole}
              </DialogTitle>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              // COPILOT FIX: Added aria-label for screen readers 
              aria-label="Close"
              className="h-8 w-8 -mr-2 -mt-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100" 
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Warning Description */}
          <DialogDescription className="text-sm text-slate-600 mb-6 ml-7">
            This user will lose all privileges associated with the {targetRole} role.
          </DialogDescription>

          {/* User Card - Matching Figma */}
          <div className="flex items-center gap-3 bg-slate-50/80 p-3 rounded-lg border border-slate-100 mb-6 mx-1">
            <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden" />
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="px-6 font-medium hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#D32F2F] hover:bg-[#B71C1C] px-6 text-white font-medium shadow-sm transition-colors"
              onClick={() => {
                // TODO: DEVELOPER 3 - Hook up the delete mutation here
                console.log(`Sending API request to remove ${user.email} from ${targetRole}`)
                onOpenChange(false)
              }}
            >
              Remove
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}