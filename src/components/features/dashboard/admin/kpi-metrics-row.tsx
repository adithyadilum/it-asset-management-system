import { KpiCard } from "./kpi-card"

export function KpiMetricsRow() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KpiCard 
        title="Total Asset Value"
        value="$1.24M"
        badgeText="+2.4%"
        badgeType="positive"
        subText1="+2.4% from last month"
        subText2="Includes hardware, software, and facilities."
      />
      <KpiCard 
        title="Total Active Assets"
        value="4,821"
        badgeText="-20%"
        badgeType="negative"
        subText1="+12 this week"
        subText2="Across 4 global office locations."
      />
      <KpiCard 
        title="Assets in Repair"
        value="34"
        badgeText="+12.5%"
        badgeType="positive"
        subText1="5 pending vendor return"
        subText2="2 critical server components included."
      />
      <KpiCard 
        title="Expiring Software (30 Days)"
        value="12"
        badgeText="+4.5%"
        badgeType="positive"
        subText1="Requires immediate renewal"
        subText2="Impacts 142 active employees."
      />
    </div>
  )
}
