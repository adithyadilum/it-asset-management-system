import { BadgeAlert, Contact } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getAdminMobileMetrics } from '@/actions/mobile';

function getActionColor(action: string) {
  const normalized = action.toLowerCase();
  if (normalized.includes('lost')) return 'border-[#a36040] text-foreground';
  if (normalized.includes('repair')) return 'border-[#643494] text-foreground';
  return 'border-border text-foreground';
}

export async function AdminMobileMetrics() {
  const metrics = await getAdminMobileMetrics();

  return (
    <>
      {/* Quick Metrics Grid */}
      <section className="flex flex-col gap-3">
        <h3 className="text-[17px] font-bold text-foreground">Quick Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <Card className="shadow-none border border-border rounded-[16px]">
            <CardContent className="p-4 flex flex-col gap-3">
              <Contact className="h-6 w-6 text-foreground" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-muted-foreground">
                  My Assigned Assets
                </span>
                <span className="text-3xl font-extrabold text-foreground mt-1">
                  {metrics.assignedAssetCount}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border border-border rounded-[16px]">
            <CardContent className="p-4 flex flex-col gap-3">
              <BadgeAlert
                className="h-6 w-6 text-[#d34242]"
                strokeWidth={1.5}
              />
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-muted-foreground">
                  Pending Approvals
                </span>
                <span className="text-3xl font-extrabold text-foreground mt-1">
                  {metrics.pendingApprovalsCount}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Recent Activities */}
      <section className="flex flex-col gap-2">
        <div className="flex flex-col mb-2">
          <h3 className="text-[17px] font-bold text-foreground">
            Recent Activities
          </h3>
          <p className="text-[14px] text-muted-foreground">
            latest actions, updates, and system events
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {metrics.recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent activities
            </p>
          ) : (
            metrics.recentActivities.map((activity) => {
              const text = activity.action;
              const borderColor = getActionColor(text);
              return (
                <div
                  key={activity.id}
                  className={`border rounded-lg px-4 py-3 bg-background ${borderColor}`}
                >
                  <p className="text-[14px] font-medium text-foreground leading-tight">
                    {text}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}
