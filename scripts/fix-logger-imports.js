// Script to fix unused logger imports
const fs = require('fs');
const path = require('path');

function findJsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git') && !item.includes('.next')) {
      files.push(...findJsFiles(fullPath));
    } else if (item.endsWith('.js') && !item.includes('logger.js') && !item.includes('fix-')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function fixLoggerImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Check if logger is imported but never used
    const hasLoggerImport = content.includes('const logger = require') || content.includes('import logger');
    const hasLoggerUsage = content.includes('logger.') && !content.includes('const logger = require');
    
    if (hasLoggerImport && !hasLoggerUsage) {
      // Remove logger import
      content = content.replace(/const logger = require\([^)]+\);\n?/g, '');
      content = content.replace(/import logger from[^;]+;\n?/g, '');
      modified = true;
      console.log(`✅ Removed unused logger import from: ${filePath}`);
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
  console.log('🔧 Starting unused logger import cleanup...');
  
  const backendDir = path.join(__dirname, '../apps/backend/src');
  const allFiles = findJsFiles(backendDir);
  
  let fixedCount = 0;
  
  for (const file of allFiles) {
    if (fixLoggerImports(file)) {
      fixedCount++;
    }
  }
  
  console.log('🎉 Logger import cleanup completed!');
  console.log(`📊 Files processed: ${allFiles.length}`);
  console.log(`✅ Files fixed: ${fixedCount}`);
}

if (require.main === module) {
  main();
}

module.exports = { fixLoggerImports, findJsFiles };
