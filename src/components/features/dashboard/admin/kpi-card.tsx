import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { TYPOGRAPHY_CLASSNAMES } from "@/components/shared/typography"
import Link from "next/link"

function DoubleArrow({ direction = "up" }: { direction?: "up" | "down" }) {
  return (
    <svg 
      className={cn(
        "w-3.5 h-3.5 shrink-0 transition-transform duration-200", 
        direction === "down" && "rotate-180"
      )}
      viewBox="0 0 16 16" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M11.4316 11.1279L11.1963 11.3643L8.00098 8.16895L7.64746 8.52246L4.80566 11.3633L4.56934 11.1279L8.00098 7.69629L11.4316 11.1279ZM11.4316 7.36133L11.1963 7.59766L8.00098 4.40234L7.64746 4.75586L4.80566 7.59668L4.56934 7.36133L8.00098 3.92969L11.4316 7.36133Z" 
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface KpiCardProps {
  title: string
  value: string
  badgeText: string
  badgeType?: "positive" | "negative" | "neutral"
  valueColor?: "default" | "warning" | "destructive"
  subText1: string
  subText2: string
  href?: string
}

export function KpiCard({
  title,
  value,
  badgeText,
  badgeType = "neutral",
  valueColor = "default",
  subText1,
  subText2,
  href,
}: KpiCardProps) {
  const isPositive = badgeType === "positive"
  const isNegative = badgeType === "negative"
  const valueColorClass =
    valueColor === "warning" ? "text-[#92400e] dark:text-amber-400" :
    valueColor === "destructive" ? "text-destructive" :
    "text-foreground"

  const cardContent = (
    <Card 
      className={cn(
        "flex flex-col shadow-sm h-full transition-all duration-300",
        href && "cursor-pointer hover:shadow-md hover:border-slate-300/80 hover:-translate-y-0.5 group/kpi-card"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
        <CardTitle className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, "text-muted-foreground group-hover/kpi-card:text-slate-800 transition-colors duration-250")}>
          {title}
        </CardTitle>
        <Badge 
          variant="outline"
          className={cn(
            "rounded px-1.5 py-0.5 flex items-center gap-0.5 border-border",
            "text-xs font-semibold leading-none",
            isPositive ? "text-[#7cc000] dark:text-[#a3e635]" : "text-black dark:text-white"
          )}
        >
          {isPositive && <DoubleArrow direction="up" />}
          {isNegative && <DoubleArrow direction="down" />}
          {badgeText}
        </Badge>
      </CardHeader>

      <CardContent className="p-4 pt-1 flex flex-col gap-1 flex-1 justify-between">
        <div>
          <div className={cn(TYPOGRAPHY_CLASSNAMES.text2xlSemiBold, "leading-none tracking-tight", valueColorClass)}>
            {value}
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <p className={cn(TYPOGRAPHY_CLASSNAMES.textXsMedium, "leading-tight text-foreground")}>
              {subText1}
            </p>
            <ChevronRight className={cn(
              "w-3.5 h-3.5 text-muted-foreground shrink-0 transition-all duration-200",
              href && "group-hover/kpi-card:translate-x-0.5 group-hover/kpi-card:text-slate-600"
            )} />
          </div>
          <p className="text-xs leading-tight text-muted-foreground mt-1">
            {subText2}
          </p>
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block h-full no-underline">
        {cardContent}
      </Link>
    )
  }

  return cardContent
}