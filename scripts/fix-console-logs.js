// Script to replace console.log statements with proper logging
const fs = require('fs');
const path = require('path');

const logger = require('../apps/backend/src/utils/logger');

function findJsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
      files.push(...findJsFiles(fullPath));
    } else if (item.endsWith('.js') && !item.includes('logger.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function replaceConsoleLogs(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Add logger import if not present
    if (!content.includes('const logger = require') && !content.includes('import logger')) {
      const importStatement = 'const logger = require(\'../../utils/logger\');\n';
      content = importStatement + content;
      modified = true;
    }
    
    // Replace console.log with logger.info
    content = content.replace(/console\.log\(/g, 'logger.info(');
    modified = true;
    
    // Replace console.error with logger.error
    content = content.replace(/console\.error\(/g, 'logger.error(');
    modified = true;
    
    // Replace console.warn with logger.warn
    content = content.replace(/console\.warn\(/g, 'logger.warn(');
    modified = true;
    
    // Replace console.debug with logger.debug
    content = content.replace(/console\.debug\(/g, 'logger.debug(');
    modified = true;
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed console statements in: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Starting console.log replacement...');
  
  const backendDir = path.join(__dirname, '../apps/backend/src');
  const frontendDir = path.join(__dirname, '../apps/frontend/src');
  const webDir = path.join(__dirname, '../apps/web');
  
  const allFiles = [
    ...findJsFiles(backendDir),
    ...findJsFiles(frontendDir),
    ...findJsFiles(webDir)
  ];
  
  let fixedCount = 0;
  
  for (const file of allFiles) {
    if (replaceConsoleLogs(file)) {
      fixedCount++;
    }
  }
  
  console.log('🎉 Console.log replacement completed!');
  console.log(`📊 Files processed: ${allFiles.length}`);
  console.log(`✅ Files fixed: ${fixedCount}`);
}

if (require.main === module) {
  main();
}

module.exports = { replaceConsoleLogs, findJsFiles };
