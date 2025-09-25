const fs = require('fs');
const path = require('path');

function addLoggerImports() {
  console.log('🔧 Adding logger imports to files that need them...');
  
  let filesProcessed = 0;
  let filesFixed = 0;

  function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        processDirectory(filePath);
      } else if (file.endsWith('.js') && !file.endsWith('.test.js')) {
        filesProcessed++;
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check if file uses logger but doesn't import it
        if (content.includes('logger.') && !content.includes('const logger = require(')) {
          // Find the best place to add the import
          const lines = content.split('\n');
          let importIndex = 0;
          
          // Look for existing requires
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('const ') && lines[i].includes('require(')) {
              importIndex = i + 1;
            }
          }
          
          // Add logger import
          const loggerImport = 'const logger = require(\'../../utils/logger\');';
          lines.splice(importIndex, 0, loggerImport);
          
          fs.writeFileSync(filePath, lines.join('\n'));
          filesFixed++;
          console.log(`✅ Added logger import to: ${filePath}`);
        }
      }
    }
  }

  // Process backend services directory
  processDirectory('./apps/backend/src/services');
  processDirectory('./apps/backend/src/tests');
  
  console.log('🎉 Logger import addition completed!');
  console.log(`📊 Files processed: ${filesProcessed}`);
  console.log(`✅ Files fixed: ${filesFixed}`);
}

addLoggerImports();
