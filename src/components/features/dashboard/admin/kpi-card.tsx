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
  subText1: string
  subText2: string
}

export function KpiCard({
  title,
  value,
  badgeText,
  badgeType = "neutral",
  subText1,
  subText2,
}: KpiCardProps) {
  const isPositive = badgeType === "positive"
  const isNegative = badgeType === "negative"

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, "text-muted-foreground")}>{title}</CardTitle>
        <Badge 
          variant="outline"
          className={cn(
            "rounded-full px-2 py-0.5 border-0",
            TYPOGRAPHY_CLASSNAMES.textXsMedium,
            isPositive && "bg-success/15 text-success",
            isNegative && "bg-destructive/15 text-destructive", 
            !isPositive && !isNegative && "bg-muted text-muted-foreground"
          )}
        >
          {isPositive && <ArrowUpRight className="w-3 h-3 mr-1" />}
          {isNegative && <ArrowDownRight className="w-3 h-3 mr-1" />}
          {!isPositive && !isNegative && <ArrowRight className="w-3 h-3 mr-1" />}
          {badgeText}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className={TYPOGRAPHY_CLASSNAMES.text2xlSemiBold}>{value}</div>
        <div className="mt-4 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <p className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, "text-foreground")}>{subText1}</p>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsRegular, "text-muted-foreground")}>{subText2}</p>
        </div>
      </CardContent>
    </Card>
  )
}
