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
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
        <CardTitle className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, "text-muted-foreground")}>
          {title}
        </CardTitle>
        <Badge 
          variant="outline"
          className={cn(
            "rounded px-1.5 py-0.5 flex items-center gap-0.5",
            "text-xs font-semibold leading-none",
            isPositive && "border-border text-[#7cc000] dark:text-[#a3e635]",
            isNegative && "border-border text-muted-foreground",
            !isPositive && !isNegative && "border-border text-muted-foreground"
          )}
        >
          {isPositive && <ArrowUpRight className="w-3 h-3" />}
          {isNegative && <ArrowDownRight className="w-3 h-3" />}
          {badgeText}
        </Badge>
      </CardHeader>

      <CardContent className="p-4 pt-1 flex flex-col gap-1">
        <div className={cn(TYPOGRAPHY_CLASSNAMES.text2xlSemiBold, "leading-none tracking-tight", valueColorClass)}>
          {value}
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsMedium, "leading-tight text-foreground")}>
              {subText1}
            </p>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </div>
          <p className="text-xs leading-tight text-muted-foreground mt-1">
            {subText2}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}