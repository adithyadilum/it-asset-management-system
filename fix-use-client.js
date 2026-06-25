const fs = require('fs');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { results = results.concat(walk(file)); } 
    else if (file.endsWith('.tsx') || file.endsWith('.ts')) { results.push(file); }
  });
  return results;
}
const files = walk('src/components');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.startsWith('import { LoadingSpinner }') && (content.includes("'use client'") || content.includes('"use client"'))) {
      content = content.replace(/import\s*\{\s*LoadingSpinner\s*\}\s*from\s*'@\/components\/shared\/loading-spinner';\r?\n/, '');
      
      const clientRegex = /(['"]use client['"];?\r?\n)/;
      if (clientRegex.test(content)) {
          content = content.replace(clientRegex, '$1import { LoadingSpinner } from "@/components/shared/loading-spinner";\n');
      } else {
          content = 'import { LoadingSpinner } from "@/components/shared/loading-spinner";\n' + content;
      }
      fs.writeFileSync(file, content);
      console.log('Fixed use client order in ' + file);
  }
});
