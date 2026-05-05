const fs = require('fs');
let c = fs.readFileSync('web/src/components/features/asset-registry/panels/asset-assignment-panel.tsx', 'utf8');

c = c.replace(
  /[\s\t]*\{\/\* Maintenance Records \*\/\}[\s\S]*?<\/div>[\s\t]*<\/div>[\s\t]*<\/div>/g,
  '\n        </div>\n      </div>'
);

fs.writeFileSync('web/src/components/features/asset-registry/panels/asset-assignment-panel.tsx', c);
console.log('done');
