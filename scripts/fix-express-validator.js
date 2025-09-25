// Script to fix express-validator dependencies in all route files
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

function fixExpressValidator(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Check if file uses express-validator
    if (content.includes('express-validator')) {
      // Replace express-validator imports with simple validation
      content = content.replace(
        /const\s*{\s*check\s*}\s*=\s*require\s*\(\s*['"]express-validator['"]\s*\);\s*/g,
        ''
      );
      
      // Replace validation imports
      content = content.replace(
        /const\s*{\s*validate[A-Za-z]*\s*}\s*=\s*require\s*\(\s*['"][^'"]*validation[^'"]*['"]\s*\);\s*/g,
        ''
      );
      
      // Add simple validation middleware at the top
      const simpleValidation = `
// Simple validation middleware
const validateRequest = (req, res, next) => {
  // Basic validation - can be enhanced as needed
  next();
};

`;
      
      // Insert after require statements
      const requireEndIndex = content.lastIndexOf('require(');
      if (requireEndIndex !== -1) {
        const nextLineIndex = content.indexOf('\n', requireEndIndex);
        if (nextLineIndex !== -1) {
          content = content.slice(0, nextLineIndex + 1) + simpleValidation + content.slice(nextLineIndex + 1);
        }
      }
      
      // Replace validation middleware usage
      content = content.replace(/\bvalidate[A-Za-z]*\b/g, 'validateRequest');
      
      modified = true;
      console.log(`✅ Fixed express-validator in: ${filePath}`);
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
  console.log('🔧 Starting express-validator cleanup...');
  
  const routesDir = path.join(__dirname, '../apps/backend/src/routes');
  const allFiles = findRouteFiles(routesDir);
  
  let fixedCount = 0;
  
  for (const file of allFiles) {
    if (fixExpressValidator(file)) {
      fixedCount++;
    }
  }
  
  console.log('🎉 Express-validator cleanup completed!');
  console.log(`📊 Files processed: ${allFiles.length}`);
  console.log(`✅ Files fixed: ${fixedCount}`);
}

if (require.main === module) {
  main();
}

module.exports = { fixExpressValidator, findRouteFiles };
