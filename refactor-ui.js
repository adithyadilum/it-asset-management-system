const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('src/components');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace <Loader2 className="animate-spin..." /> with <LoadingSpinner size="sm" />
  const loaderRegex = /<(?:Loader2|LoaderCircle|Loader2Icon)\s+[^>]*animate-spin[^>]*\/>/g;
  
  if (loaderRegex.test(content) && !file.includes('loading-spinner.tsx') && !file.includes('sonner.tsx') && !file.includes('keycloak-login.tsx')) {
      content = content.replace(loaderRegex, '<LoadingSpinner size="sm" />');
      changed = true;
      
      // Add import if missing
      if (!content.includes('LoadingSpinner')) {
          content = `import { LoadingSpinner } from '@/components/shared/loading-spinner';\n` + content;
      }
      
      // Clean up unused lucide imports
      if (!content.includes('<Loader2 ') && !content.includes('<Loader2>')) {
          content = content.replace(/,\s*Loader2\b/g, '');
          content = content.replace(/\bLoader2\s*,\s*/g, '');
          content = content.replace(/import\s*\{\s*\}\s*from\s*['"]lucide-react['"];\r?\n/g, '');
      }
      if (!content.includes('<LoaderCircle ') && !content.includes('<LoaderCircle>')) {
          content = content.replace(/,\s*LoaderCircle\b/g, '');
          content = content.replace(/\bLoaderCircle\s*,\s*/g, '');
      }
  }

  // Replace generic toLocaleDateString() with <DateFormatted date={...} />
  // We'll leave this to targeted manual replace to avoid destroying template strings like `${date.toLocaleDateString()}` which breaks if we insert JSX.

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
