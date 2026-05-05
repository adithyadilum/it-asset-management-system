const fs = require('fs');
let c = fs.readFileSync('src/components/features/asset-registry/panels/asset-assignment-panel.tsx', 'utf8');

const target = \              <div key={\\\ssignment-row-\\\\\\\} className={cn(
                "grid grid-cols-2 gap-x-8",
                row.left.label === 'Assigned to :' && 'bg-blue-50 rounded-lg p-3 border border-blue-200'
              )}>
                <div className="grid grid-cols-[150px_minmax(0,1fr)] items-start gap-x-3">
                  <p className={cn(
                    "font-medium text-slate-900",
                    row.left.label === 'Assigned to :' && 'text-blue-900 font-semibold'
                  )}>{row.left.label}</p>
                  <div className={cn(
                    "text-slate-700",
                    row.left.label === 'Assigned to :' && 'text-blue-900 font-semibold'
                  )}>{row.left.value}</div>
                </div>
                <div className="grid grid-cols-[120px_minmax(0,1fr)] items-start gap-x-3">
                  <p className="font-medium text-slate-900">{row.right.label}</p>
                  <div className="text-slate-700">{row.right.value}</div>
                </div>
              </div>\;

const replacement = \              <div key={\\\ssignment-row-\\\\\\\} className="grid grid-cols-2 gap-x-8">
                <div className="grid grid-cols-[150px_minmax(0,1fr)] items-start gap-x-3">
                  <p className="font-medium text-slate-900">{row.left.label}</p>
                  <div className="text-slate-700">{row.left.value}</div>
                </div>
                <div className="grid grid-cols-[120px_minmax(0,1fr)] items-start gap-x-3">
                  <p className="font-medium text-slate-900">{row.right.label}</p>
                  <div className="text-slate-700">{row.right.value}</div>
                </div>
              </div>\;

c = c.replace(target, replacement);
fs.writeFileSync('src/components/features/asset-registry/panels/asset-assignment-panel.tsx', c);
console.log('Fixed styles.');
