import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"

interface KpiCardProps {
  title: string
  value: string
  badgeText: string
  badgeType?: "positive" | "negative" | "neutral"
  valueColor?: "default" | "warning" | "destructive"
  subText1: string
  subText2: string
}

export function KpiCard({
  title,
  value,
  badgeText,
  badgeType = "neutral",
  valueColor = "default",
  subText1,
  subText2,
}: KpiCardProps) {
  const isPositive = badgeType === "positive"
  const isNegative = badgeType === "negative"
  const valueColorClass =
    valueColor === "warning" ? "text-[#92400e] dark:text-amber-400" :
    valueColor === "destructive" ? "text-destructive" :
    "text-foreground"

  return (
    <Card className="flex flex-col shadow-sm">
      {/* 1. Aggressively reduced padding: Use p-2 total, remove bottom padding (pb-0) */}
      <CardHeader className="flex flex-row items-center justify-between p-2 pb-0 space-y-0">
        <CardTitle className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, "text-muted-foreground text-xs")}>
          {title}
        </CardTitle>
        <Badge 
          variant="outline"
          className={cn(
            "rounded px-1 py-0 flex items-center gap-0.5",
            "text-[10px] md:text-xs font-semibold leading-none h-5", // Forced smaller height on badge
            isPositive && "border-border text-[#7cc000] dark:text-[#a3e635]",
            isNegative && "border-border text-muted-foreground",
            !isPositive && !isNegative && "border-border text-muted-foreground"
          )}
        >
          {isPositive && <ArrowUpRight className="w-2.5 h-2.5" />}
          {isNegative && <ArrowDownRight className="w-2.5 h-2.5" />}
          {badgeText}
        </Badge>
      </CardHeader>

      {/* 2. Reduced gaps and padding inside Content */}
      <CardContent className="p-2 pt-1 flex flex-col gap-0.5">
        {/* 3. Added leading-none to remove the invisible whitespace above/below large text */}
        <div className={cn(TYPOGRAPHY_CLASSNAMES.textLgSemiBold, "leading-none tracking-tight", valueColorClass)}>
          {value}
        </div>

        {/* 4. Tightened up the subtext spacing */}
        <div className="mt-1">
          <div className="flex items-center justify-between">
            <p className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, "text-[11px] leading-tight text-foreground")}>
              {subText1}
            </p>
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          </div>
          {/* subText2 uncommented and made very small/compact */}
          <p className="text-[10px] leading-tight text-muted-foreground mt-0.5">
            {subText2}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}