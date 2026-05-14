import { DatePickerWithRange } from "@/components/shared/date-range-picker"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
import { cn } from "@/lib/utils"

export function DashboardHeader() {
  return (
    // 1. Forced 'flex-row' by default and removed bottom gaps to save vertical space
    <div className="flex items-center justify-between shrink-0 pb-2">
      
      {/* 2. Removed the wrapper <div className="mb-4"> that was pushing content down */}
      <h1 className={cn(TYPOGRAPHY_CLASSNAMES.text2xlSemiBold, "text-slate-900")}>
        Overview
      </h1>
      
      <div className="flex items-center">
        {/* 3. Passed aggressive sizing classes to shrink the date picker */}
        <DatePickerWithRange 
          className="h-8 text-xs py-1 px-3" 
          date={{
            from: new Date(2026, 0, 1), // Jan 01, 2026
            to: new Date(2026, 0, 31),  // Jan 31, 2026
          }} 
        />
      </div>
    </div>
  )
}