import { KpiCard } from "./kpi-card"

export function KpiMetricsRow() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      <KpiCard 
        title="Total Asset Value"
        value="$1.24M"
        badgeText="+2.4%"
        badgeType="positive"
        valueColor="default"
        subText1="Acquisition cost of active inventory"
        subText2="Includes hardware, software, and facilities."
      />
      <KpiCard 
        title="Net Book Value"
        value="$874.2K"
        badgeText="-12.8%"
        badgeType="negative"
        valueColor="default"
        subText1="Depreciated value of asset base"
        subText2="Calculated via straight-line depreciation."
      />
      <KpiCard 
        title="Inactive Software Seats"
        value="42 Accounts"
        badgeText="-$8.4K/mo"
        badgeType="negative"
        valueColor="destructive"
        subText1="$8,400 monthly in idle seat waste"
        subText2="Target for license subscription downgrade."
      />
      <KpiCard 
        title="Warranty Expiry (30 Days)"
        value="18 Assets"
        badgeText="Risk"
        badgeType="negative"
        valueColor="warning"
        subText1="18 active devices near support end"
        subText2="Action needed to renew or retire."
      />
      <KpiCard 
        title="Cumulative Repair Spend"
        value="$14.2K"
        badgeText="-4.5%"
        badgeType="positive"
        valueColor="default"
        subText1="Actual maintenance expenditures"
        subText2="Target limit: Under $20K/annum."
      />
      <KpiCard 
        title="Software Renewals (30 Days)"
        value="12 Licenses"
        badgeText="Risk"
        badgeType="negative"
        valueColor="warning"
        subText1="12 critical subscriptions near expiry"
        subText2="Affects 142 active employee custodians."
      />
    </div>
  )
}
