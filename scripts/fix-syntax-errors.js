// Script to fix all syntax errors in route files
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

function fixSyntaxErrors(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Remove stray = req.body; lines
    const originalContent = content;
    content = content.replace(/^= req\.body;\s*$/gm, '');
    
    // Remove stray lines that start with = 
    content = content.replace(/^=\s+[^;]*;\s*$/gm, '');
    
    // Remove empty lines that contain only =
    content = content.replace(/^=\s*$/gm, '');
    
    // Fix incomplete function declarations
    content = content.replace(/const\s+validateRequest\s*=\s*\([^)]*\)\s*=>\s*{\s*$/gm, 
      'const validateRequest = (req, res, next) => {\n  next();\n};');
    
    // Remove incomplete function declarations
    content = content.replace(/const\s+validate[A-Za-z]*\s*=\s*\([^)]*\)\s*=>\s*{\s*$/gm, '');
    
    // Clean up multiple empty lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (content !== originalContent) {
      modified = true;
      console.log(`✅ Fixed syntax errors in: ${filePath}`);
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
  console.log('🔧 Starting syntax error cleanup...');
  
  const routesDir = path.join(__dirname, '../apps/backend/src/routes');
  const allFiles = findRouteFiles(routesDir);
  
  let fixedCount = 0;
  
  for (const file of allFiles) {
    if (fixSyntaxErrors(file)) {
      fixedCount++;
    }
  }
  
  console.log('🎉 Syntax error cleanup completed!');
  console.log(`📊 Files processed: ${allFiles.length}`);
  console.log(`✅ Files fixed: ${fixedCount}`);
}

if (require.main === module) {
  main();
}

module.exports = { fixSyntaxErrors, findRouteFiles };
