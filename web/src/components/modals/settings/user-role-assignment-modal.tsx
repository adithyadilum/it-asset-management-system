"use client"

import { useState, useEffect } from "react"
import { Search, Info, Trash2, PlusCircle, Ban, Loader2 } from "lucide-react"

// UI Components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

// --- THE CONTRACT (For Developer 3) ---
export interface SystemUser {
  email: string
  name: string
  role: string
}

interface UserRoleAssignmentModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  targetRole?: string
}

export function UserRoleAssignmentModal({ 
  isOpen, 
  onOpenChange, 
  targetRole = "IT Operations" 
}: UserRoleAssignmentModalProps) {
  
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [hideExisting, setHideExisting] = useState(false)

  // Staging list starts completely empty
  const [selectedUsers, setSelectedUsers] = useState<SystemUser[]>([])
  
  // Search results list
  const [searchResults, setSearchResults] = useState<SystemUser[]>([])

  // --- CLEANUP LOGIC ---
  useEffect(() => {
    if (!isOpen) {
      // Push the state resets to the next tick to avoid synchronous render warnings
      const cleanupTimer = setTimeout(() => {
        setSearchQuery("")
        setSearchResults([])
        setSelectedUsers([])
        setHideExisting(false)
      }, 0)
      
      return () => clearTimeout(cleanupTimer)
    }
  }, [isOpen])

  // --- SEARCH LOGIC (Debounced) ---
  useEffect(() => {
    // 1. Handle empty search
    if (searchQuery.length === 0) {
      const clearTimer = setTimeout(() => {
        setSearchResults([])
        setIsSearching(false)
      }, 0)
      return () => clearTimeout(clearTimer)
    }

    const loadingTimer = setTimeout(() => setIsSearching(true), 0)

    // 2. The Search Engine
    const searchTimer = setTimeout(() => {
      
      // MOCK DATA
      const mockDirectory = [
        { name: "Nadeesha", email: "nadeesha@tiqri.com", role: "IT Operations" },
        { name: "Nadeeka", email: "nadeeka@tiqri.com", role: "" },
        { name: "John Doe", email: "john.doe@tiqri.com", role: "" }
      ]
      
      const query = searchQuery.toLowerCase()
      
      const filteredResults = mockDirectory.filter(user => {
        const matchesText = user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
        const alreadyHasRole = user.role === targetRole
        const shouldHide = hideExisting && alreadyHasRole
        
        return matchesText && !shouldHide
      })
      
      setSearchResults(filteredResults)
      setIsSearching(false)
    }, 300)

    return () => {
      clearTimeout(loadingTimer)
      clearTimeout(searchTimer)
    }
  }, [searchQuery, hideExisting, targetRole])

  // --- HANDLERS ---
  const handleAddUser = (user: SystemUser) => {
    if (!selectedUsers.find(u => u.email === user.email)) {
      setSelectedUsers([...selectedUsers, user])
    }
    setSearchQuery("")
  }

  const handleRemoveUser = (emailToRemove: string) => {
    setSelectedUsers(selectedUsers.filter(user => user.email !== emailToRemove))
  }

  // --- UI RENDER ---
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* COPILOT FIX: Added brackets to sm:max-w-[550px] */}
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl">
        
        {/* Header Section */}
        <div className="p-6 pb-0">
          <DialogHeader className="flex flex-row items-center gap-2 space-y-0">
            <Info className="h-5 w-5 text-slate-400" />
            <DialogTitle className="text-lg font-bold text-slate-900">
              Assign Users to {targetRole}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="hide-existing" 
                checked={hideExisting}
                // COPILOT FIX: Explicit boolean check
                onCheckedChange={(checked) => setHideExisting(checked === true)}
                className="border-slate-300 data-[state=checked]:bg-[#000066]" 
              />
              <label htmlFor="hide-existing" className="text-sm font-medium text-slate-600 cursor-pointer">
                Hide users already in this role
              </label>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search company directory by name or email..." 
                className="pl-10 h-10 border-slate-200 focus-visible:ring-[#000066]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Content Area */}
        <div className="p-6">
          {/* COPILOT FIX: Added brackets to h-[280px] */}
          <ScrollArea className="h-[280px] w-full rounded-xl bg-slate-50/50 p-2">
            
            <div className="px-2">
              {/* SEARCH RESULTS DROPDOWN AREA */}
              {searchQuery.length > 0 && (
                <div className="mb-4">
                  {isSearching ? (
                    <div className="flex flex-col items-center justify-center py-6 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <Loader2 className="h-5 w-5 animate-spin text-[#000066] mb-2" />
                      <p className="text-xs text-slate-500">Searching...</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-2 space-y-1">
                      {searchResults.map((user) => (
                        <div key={user.email} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden" />
                            <div className="text-left">
                              <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            // COPILOT FIX: Added aria-label
                            aria-label="Add user"
                            className="h-8 w-8 rounded-full text-slate-600 hover:text-[#000066] hover:bg-[#000066]/10"
                            onClick={() => handleAddUser(user)}
                          >
                            <PlusCircle className="h-5 w-5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 bg-white rounded-lg border border-slate-200 shadow-sm text-center">
                      <p className="text-sm font-bold text-slate-900">No user found</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">
                        Your search <span className="font-semibold text-slate-700">&quot;{searchQuery}&quot;</span> did not match any users.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* SELECTED USERS STAGING AREA */}
              <div className="space-y-2">
                {selectedUsers.length > 0 && (
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-2 space-y-1">
                    {selectedUsers.map((user) => (
                      <div key={user.email} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-200" />
                          <div className="text-left">
                            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          // COPILOT FIX (Proactive): Added aria-label to this icon-only button too
                          aria-label="Remove user"
                          className="h-8 w-8 text-red-500 hover:text-[#D32F2F] hover:bg-red-100 transition-colors"
                          onClick={() => handleRemoveUser(user.email)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedUsers.length === 0 && searchQuery.length === 0 && (
                   <div className="flex flex-col items-center justify-center py-10 text-center">
                     <p className="text-sm text-slate-400 italic">Search for users to add them to this role.</p>
                   </div>
                )}
              </div>
            </div>
            
          </ScrollArea>
        </div>

        {/* Footer with Actions */}
        <div className="p-6 pt-0 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            className="bg-[#000066] hover:bg-[#000044] px-8 text-white"
            onClick={() => {
              // TODO: DEVELOPER 3 - Send `selectedUsers` array to the backend here
              console.log("Submitting users to backend:", selectedUsers)
              
              // Clear the staging area after successful submission
              setSelectedUsers([])
              setSearchQuery("")
              
              onOpenChange(false)
            }}
            disabled={selectedUsers.length === 0}
          >
            Confirm Mapping
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}