import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, ArrowDownRight, ArrowRight, ChevronRight } from "lucide-react"
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
    <Card className="flex flex-col">
      {/* Row 1: Title + Badge */}
      <CardHeader className="flex flex-row items-center justify-between px-3 pt-1 pb-1 space-y-0">
        <CardTitle className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, "text-muted-foreground")}>{title}</CardTitle>
        <Badge 
          variant="outline"
          className={cn(
            "rounded px-1 py-0 flex items-center gap-0.5",
            "text-[15px] font-semibold",
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

      <CardContent className="px-3 pb-1 pt-0 flex flex-col gap-1">
        {/* Row 2: Large value */}
        <div className={cn(TYPOGRAPHY_CLASSNAMES.textLgSemiBold, valueColorClass)}>{value}</div>

        {/* Row 3: subText1 + chevron */}
        <div>
          <div className="flex items-center justify-between">
            <p className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, "text-foreground")}>{subText1}</p>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
          {/* Row 4: subText2 */}
          {/* <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsRegular, "text-muted-foreground")}>{subText2}</p> */}
        </div>
      </CardContent>
    </Card>
  )
}
