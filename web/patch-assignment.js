const fs = require('fs');
let c = fs.readFileSync('src/components/features/asset-registry/panels/asset-assignment-panel.tsx', 'utf8');

c = c.replace(
  /import React, \{ useMemo \} from 'react';/,
  "import React, { useMemo, useState, useEffect } from 'react';\nimport { getAssetMaintenanceHistory } from '@/actions/maintenance';\nimport type { AssetMaintenanceRecord } from '@/types/maintenance';"
);

c = c.replace(
  /onAssign\?\: \(\) \=\> void;\s*onClose\?\: \(\) \=\> void;\s*\}/,
  "onAssign?: () => void;\n  onClose?: () => void;\n  onViewAllMaintenance?: () => void;\n}"
);

const hooksStr = \n  const [maintenanceHistory, setMaintenanceHistory] = useState<AssetMaintenanceRecord[]>([]);\n  const [isLoadingHistory, setIsLoadingHistory] = useState(false);\n\n  useEffect(() => {\n    async function fetchHistory() {\n      if (!props.assetTag) return;\n      try {\n        setIsLoadingHistory(true);\n        const history = await getAssetMaintenanceHistory(props.assetTag, 3);\n        setMaintenanceHistory(history);\n      } catch (error) {\n        console.error('Failed to fetch maintenance history:', error);\n      } finally {\n        setIsLoadingHistory(false);\n      }\n    }\n    fetchHistory();\n  }, [props.assetTag]);\n;

c = c.replace(
  /export function AssetAssignmentDetailsPanel\(props: AssetAssignmentPanelProps\) \{\s*const detailsRows = useMemo\(\(\) \=\> \[/,
  \export function AssetAssignmentDetailsPanel(props: AssetAssignmentPanelProps) {\\n  const detailsRows = useMemo(() => [\
);


const uiStr = \n          {/* ============ NEW DYNAMIC MAINTENANCE UI ============ */}\n          <div className="mt-8 shrink-0 px-0">\n            <div className="flex items-center justify-between mb-4">\n              <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">\n                Recent Maintenance\n              </h3>\n              {maintenanceHistory.length > 0 && props.onViewAllMaintenance && (\n                <button onClick={props.onViewAllMaintenance} className="text-[13px] text-[#040d5a] hover:underline font-medium">\n                  View All\n                </button>\n              )}\n            </div>\n\n            {isLoadingHistory ? (\n              <div className="space-y-3">\n                <div className="h-20 bg-slate-100 rounded-lg animate-pulse" />\n                <div className="h-20 bg-slate-100 rounded-lg animate-pulse" />\n              </div>\n            ) : maintenanceHistory.length > 0 ? (\n              <div className="space-y-3">\n                {maintenanceHistory.map((record) => (\n                  <div key={record.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">\n                    <div className="flex justify-between items-start mb-2">\n                      <span className="font-medium text-[14px] text-slate-900">\n                        {record.ticketType === 'VENDOR' ? record.vendorName : 'Internal Repair'}\n                      </span>\n                      <Badge\n                        variant="outline"\n                        className={\n                          record.status === 'COMPLETED'\n                            ? 'bg-green-50 text-green-700 border-green-200 font-normal shadow-sm'\n                            : record.status === 'ACTIVE'\n                              ? 'bg-blue-50 text-blue-700 border-blue-200 font-normal shadow-sm'\n                              : 'bg-slate-50 text-slate-700 border-slate-200 font-normal shadow-sm'\n                        }\n                      >\n                        {record.status}\n                      </Badge>\n                    </div>\n\n                    <p className="text-[13px] text-slate-600 mb-3 line-clamp-2">\n                      {record.reportedIssue}\n                    </p>\n\n                    <div className="flex justify-between items-center text-[12px] text-slate-500 font-medium pt-3 border-t border-slate-200/60">\n                      <span>\n                        {record.actualCompletionDate\n                          ? new Date(record.actualCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })\n                          : 'In Progress'}\n                      </span>\n                      {record.actualCost && (\n                        <span className="text-slate-700">\n                          \\\$\\n                        </span>\n                      )}\n                    </div>\n                  </div>\n                ))}\n              </div>\n            ) : (\n              <div className="flex items-center justify-center p-6 border border-dashed border-slate-200 rounded-xl bg-slate-50">\n                <p className="text-sm text-slate-500">No maintenance records found.</p>\n              </div>\n            )}\n          </div>\n          {/* ==================================================== */}\n;

c = c.replace(
  /              <\/div>\n            \)\)}\n          <\/div>\n        <\/div>\n      <\/div>/,
                </div>\n            ))}\n          </div>\n        </div>\n      </div>
);

fs.writeFileSync('src/components/features/asset-registry/panels/asset-assignment-panel.tsx', c);
console.log('done');
