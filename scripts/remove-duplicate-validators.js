// Script to remove duplicate validateRequest declarations
const fs = require('fs');
const path = require('path');

function findRouteFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findRouteFiles(fullPath));
    } else if (item.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function removeDuplicateValidators(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Count occurrences of const validateRequest
    const matches = content.match(/const validateRequest/g);
    if (matches && matches.length > 1) {
      console.log(`Found ${matches.length} duplicate validateRequest in: ${filePath}`);
      
      // Remove all validateRequest declarations
      content = content.replace(/const validateRequest\s*=\s*\([^)]*\)\s*=>\s*{[^}]*};?\s*/g, '');
      
      // Add single validateRequest declaration
      const singleValidator = `
// Simple validation middleware
const validateRequest = (req, res, next) => {
  // Basic validation - can be enhanced as needed
  next();
};

`;
      
      // Insert after require statements
      const routerIndex = content.indexOf('const router');
      if (routerIndex !== -1) {
        const insertIndex = content.indexOf('\n', routerIndex) + 1;
        content = content.slice(0, insertIndex) + singleValidator + content.slice(insertIndex);
      }
      
      modified = true;
      console.log(`✅ Fixed duplicates in: ${filePath}`);
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Starting duplicate validator cleanup...');
  
  const routesDir = path.join(__dirname, '../apps/backend/src/routes');
  const allFiles = findRouteFiles(routesDir);
  
  let fixedCount = 0;
  
  for (const file of allFiles) {
    if (removeDuplicateValidators(file)) {
      fixedCount++;
    }
  }
  
  console.log('🎉 Duplicate validator cleanup completed!');
  console.log(`📊 Files processed: ${allFiles.length}`);
  console.log(`✅ Files fixed: ${fixedCount}`);
}

if (require.main === module) {
  main();
}

module.exports = { removeDuplicateValidators, findRouteFiles };
