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

  const formRegex = /const\s+user\s*=\s*await\s+getAuthenticatedUser\(\);\s*if\s*\(!user\)\s*(?:return\s+\{.*\}|throw\s+new\s+Error\(.*?\));\s*try\s*\{\s*requireAccess\(user,\s*([a-zA-Z0-9_]+)\);\s*\}\s*catch\s*(?:\([^)]*\))?\s*\{\s*(?:return\s+\{.*\}|throw\s+new\s+Error\(.*?\));\s*\}/gs;

  content = content.replace(formRegex, (match, rolePredicate) => {
    changed = true;
    return `const auth = await enforceFormAccess(${rolePredicate});\n  if (!auth.ok) return auth.payload;\n  const user = auth.user;`;
  });

  const actionRegex = /const\s+user\s*=\s*await\s+getAuthenticatedUser\(\);\s*if\s*\(!user\)\s*throw\s+new\s+Error\([^)]+\);\s*(?:try\s*\{\s*)?requireAccess\(user,\s*([a-zA-Z0-9_]+)\);(?:.*?catch.*?})?/gs;

  content = content.replace(actionRegex, (match, rolePredicate) => {
    changed = true;
    return `const user = await enforceActionAccess(${rolePredicate});`;
  });

  const simpleActionRegex = /const\s+user\s*=\s*await\s+getAuthenticatedUser\(\);\s*if\s*\(!user\)\s*throw\s+new\s+Error\([^)]+\);/g;
  content = content.replace(simpleActionRegex, (match) => {
    // Only replace if not already replaced by above regexes (should be safe since they capture more text)
    changed = true;
    return `const user = await enforceActionAccess();`;
  });

  if (changed) {
    const hasFormAccess = content.includes('enforceFormAccess');
    const hasActionAccess = content.includes('enforceActionAccess');
    
    // Add imports if they don't exist
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
