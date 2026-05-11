import { DatePickerWithRange } from "@/components/shared/date-range-picker"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
import { cn } from "@/lib/utils"

export function DashboardHeader() {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 gap-4">
      <h1 className={cn(TYPOGRAPHY_CLASSNAMES.text2xlSemiBold, "tracking-tight text-3xl")}>Overview</h1>
      <div className="flex items-center space-x-2">
        <DatePickerWithRange 
          date={{
            from: new Date(2026, 0, 1), // Jan 01, 2026
            to: new Date(2026, 0, 31),  // Jan 31, 2026
          }} 
        />
      </div>
    </div>
  )
}
