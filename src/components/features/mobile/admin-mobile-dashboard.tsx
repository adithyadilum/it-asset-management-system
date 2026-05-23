"use client"

import { QrCode, Package, ClipboardCheck, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { AdminMobileMetrics } from "@/actions/mobile"
import { formatDistanceToNow } from "date-fns"

export function AdminMobileDashboard({ metrics }: { metrics: AdminMobileMetrics }) {
  const handleLaunchScanner = () => {
    // Placeholder click handler
    console.log("Scanner launched")
  }

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 md:hidden">
      {/* Hero Section */}
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Scanner Dashboard</h1>
        <Button 
          onClick={handleLaunchScanner}
          size="lg" 
          className="w-full bg-blue-900 hover:bg-blue-800 text-primary-foreground h-32 rounded-xl flex flex-col gap-3 shadow-lg"
        >
          <QrCode className="h-10 w-10" />
          <span className="text-xl font-semibold">Launch Scanner</span>
        </Button>
      </section>

      {/* Quick Metrics Grid */}
      <section className="grid grid-cols-2 gap-4">
        <Card className="shadow-sm border-blue-100 dark:border-blue-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.assignedAssetCount}</div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-orange-100 dark:border-orange-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Apps</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingApprovalsCount}</div>
          </CardContent>
        </Card>
      </section>

      {/* Recent Activities */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-tight">Recent Activities</h2>
        </div>
        
        <div className="flex flex-col gap-3">
          {metrics.recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No recent activities</p>
          ) : (
            metrics.recentActivities.map((activity) => (
              <Card key={activity.id} className="shadow-sm">
                <CardContent className="p-4 flex justify-between items-center gap-4">
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <span className="text-sm font-medium truncate">
                      {activity.action}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {activity.assetId && <span>Asset #{activity.assetId}</span>}
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                    </div>
                  </div>
                  {activity.status && (
                    <Badge variant={activity.status === 'Completed' || activity.status === 'Success' ? 'secondary' : 'outline'} className="shrink-0">
                      {activity.status}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
