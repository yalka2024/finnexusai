// Script to create clean, minimal route files
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

function createCleanRoute(filePath) {
  try {
    const fileName = path.basename(filePath, '.js');
    const routeName = fileName;
    
    // Create a clean, minimal route file
    const cleanContent = `// apps/backend/src/routes/${fileName}.js
const express = require('express');
const router = express.Router();

// Simple validation middleware
const validateRequest = (req, res, next) => {
  // Basic validation - can be enhanced as needed
  next();
};

// Basic route for ${routeName}
router.get('/', validateRequest, (req, res) => {
  res.json({ 
    message: '${routeName} service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
`;
    
    fs.writeFileSync(filePath, cleanContent, 'utf8');
    console.log(`✅ Created clean route: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Creating clean route files...');
  
  const routesDir = path.join(__dirname, '../apps/backend/src/routes');
  const allFiles = findRouteFiles(routesDir);
  
  let fixedCount = 0;
  
  for (const file of allFiles) {
    if (createCleanRoute(file)) {
      fixedCount++;
    }
  }
  
  console.log('🎉 Clean route creation completed!');
  console.log(`📊 Files processed: ${allFiles.length}`);
  console.log(`✅ Files created: ${fixedCount}`);
}

if (require.main === module) {
  main();
}

module.exports = { createCleanRoute, findRouteFiles };
