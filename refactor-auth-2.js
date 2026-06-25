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
      if (file.endsWith('.ts') && !file.includes('auth.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('src/actions');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Pattern:
  // const currentUser = await getAuthenticatedUser();
  // if (!currentUser || !canViewAssetRegistry(currentUser.role)) {
  //   throw new Error('Forbidden');
  // }
  const combinedRegex = /const\s+([a-zA-Z0-9_]+)\s*=\s*await\s+getAuthenticatedUser\(\);\s*if\s*\(!\1\s*\|\|\s*!([a-zA-Z0-9_]+)\(\1\.role\)\)\s*\{\s*(?:return\s+\{.*\}|throw\s+new\s+Error\(.*?\));\s*\}/gs;

  content = content.replace(combinedRegex, (match, varName, rolePredicate) => {
    changed = true;
    if (match.includes('return')) {
       return `const auth = await enforceFormAccess(${rolePredicate});\n  if (!auth.ok) return auth.payload;\n  const ${varName} = auth.user;`;
    } else {
       return `const ${varName} = await enforceActionAccess(${rolePredicate});`;
    }
  });

  if (changed) {
    const hasFormAccess = content.includes('enforceFormAccess');
    const hasActionAccess = content.includes('enforceActionAccess');
    
    if (hasFormAccess || hasActionAccess) {
       let importsToAdd = [];
       if (hasFormAccess && !content.includes('enforceFormAccess}')) importsToAdd.push('enforceFormAccess');
       if (hasActionAccess && !content.includes('enforceActionAccess}')) importsToAdd.push('enforceActionAccess');
       
       if (importsToAdd.length > 0) {
           content = content.replace(
             /import\s+\{([^}]+getAuthenticatedUser[^}]+)\}\s*from\s+['"]@\/actions\/auth['"];/,
             (match, p1) => {
                return `import {${p1}, ${importsToAdd.join(', ')} } from '@/actions/auth';`;
             }
           );
       }
    }
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
