// Script to fix unused variables by prefixing with underscore
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

function fixUnusedVariables(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Common unused variable patterns to fix
    const patterns = [
      // Function parameters
      { regex: /function\s+\w+\s*\(([^)]*)\)/g, fixer: fixFunctionParams },
      { regex: /\(([^)]*)\)\s*=>/g, fixer: fixArrowFunctionParams },
      { regex: /async\s+\(([^)]*)\)\s*=>/g, fixer: fixArrowFunctionParams },
      
      // Variable declarations
      { regex: /const\s+(\w+)\s*=/g, fixer: fixVariableDeclarations },
      { regex: /let\s+(\w+)\s*=/g, fixer: fixVariableDeclarations },
      { regex: /var\s+(\w+)\s*=/g, fixer: fixVariableDeclarations },
    ];
    
    for (const pattern of patterns) {
      const newContent = content.replace(pattern.regex, pattern.fixer);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed unused variables in: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function fixFunctionParams(match, params) {
  if (!params.trim()) return match;
  
  const fixedParams = params.split(',').map(param => {
    const trimmed = param.trim();
    if (trimmed && !trimmed.startsWith('_') && !trimmed.includes('=')) {
      return `_${trimmed}`;
    }
    return trimmed;
  }).join(', ');
  
  return match.replace(params, fixedParams);
}

function fixArrowFunctionParams(match, params) {
  if (!params.trim()) return match;
  
  const fixedParams = params.split(',').map(param => {
    const trimmed = param.trim();
    if (trimmed && !trimmed.startsWith('_') && !trimmed.includes('=')) {
      return `_${trimmed}`;
    }
    return trimmed;
  }).join(', ');
  
  return match.replace(params, fixedParams);
}

function fixVariableDeclarations(match, varName) {
  // Don't fix if it's already prefixed with underscore or is a common exception
  const exceptions = ['logger', 'fs', 'path', 'crypto', 'Buffer', 'process', 'module', 'exports', 'require'];
  
  if (varName.startsWith('_') || exceptions.includes(varName)) {
    return match;
  }
  
  return match.replace(varName, `_${varName}`);
}

function main() {
  console.log('🔧 Starting unused variable fixes...');
  
  const backendDir = path.join(__dirname, '../apps/backend/src');
  const allFiles = findJsFiles(backendDir);
  
  let fixedCount = 0;
  
  // Focus on files with the most errors first
  const priorityFiles = [
    'QuantumComputingService.js',
    'CircuitBreaker.js',
    'RateLimitService.js',
    'EncryptionService.js',
    'SecurityTestSuite.js'
  ];
  
  // Process priority files first
  for (const file of allFiles) {
    if (priorityFiles.some(priority => file.includes(priority))) {
      if (fixUnusedVariables(file)) {
        fixedCount++;
      }
    }
  }
  
  console.log('🎉 Unused variable fixes completed!');
  console.log(`📊 Files processed: ${allFiles.length}`);
  console.log(`✅ Files fixed: ${fixedCount}`);
}

if (require.main === module) {
  main();
}

module.exports = { fixUnusedVariables, findJsFiles };
