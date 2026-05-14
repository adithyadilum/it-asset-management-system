import { DatePickerWithRange } from "@/components/shared/date-range-picker"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
import { cn } from "@/lib/utils"

export function DashboardHeader() {
  return (
 
    <div className="flex items-center justify-between shrink-0 pb-2">
      
      
      <h1 className={cn(TYPOGRAPHY_CLASSNAMES.text2xlSemiBold, "text-slate-900")}>
        Overview
      </h1>
      
      <div className="flex items-center">
       
        <DatePickerWithRange 
          className="h-8 text-xs py-1 px-3" 
          date={{
            from: new Date(2026, 0, 1), 
            to: new Date(2026, 0, 31), 
          }} 
        />
      </div>
    </div>
  )
}