#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Console.log cleanup script for production optimization
 * Removes console.log statements while preserving console.warn and console.error
 */

const EXTENSIONS = ['ts', 'tsx', 'js', 'jsx'];
const EXCLUDE_DIRS = ['node_modules', '.expo', '.git', 'scripts'];

// Console methods to preserve for production debugging
const PRESERVE_METHODS = ['console.warn', 'console.error', 'console.info'];

function findConsoleLogFiles() {
  const patterns = EXTENSIONS.map(ext => `**/*.${ext}`);
  const files = [];
  
  patterns.forEach(pattern => {
    const matches = glob.sync(pattern, {
      ignore: EXCLUDE_DIRS.map(dir => `${dir}/**`)
    });
    files.push(...matches);
  });
  
  return [...new Set(files)]; // Remove duplicates
}

function shouldPreserveLine(line) {
  return PRESERVE_METHODS.some(method => line.includes(method));
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let modifiedLines = [];
  let removedCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Check if line contains console.log
    if (trimmedLine.includes('console.log') && !shouldPreserveLine(line)) {
      // Check if it's a standalone console.log statement
      if (trimmedLine.startsWith('console.log') || 
          trimmedLine.match(/^\s*console\.log/)) {
        // Skip this line (remove it)
        removedCount++;
        continue;
      }
      // If console.log is part of a larger expression, comment it out
      else if (line.includes('console.log')) {
        const commentedLine = line.replace(/console\.log\([^)]*\);?/g, '// console.log removed');
        modifiedLines.push(commentedLine);
        removedCount++;
      } else {
        modifiedLines.push(line);
      }
    } else {
      modifiedLines.push(line);
    }
  }
  
  if (removedCount > 0) {
    const newContent = modifiedLines.join('\n');
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ ${filePath}: Removed ${removedCount} console.log statements`);
    return removedCount;
  }
  
  return 0;
}

function main() {
  console.log('🧹 Starting console.log cleanup for production optimization...\n');
  
  const files = findConsoleLogFiles();
  let totalRemoved = 0;
  let filesModified = 0;
  
  files.forEach(file => {
    const removed = processFile(file);
    if (removed > 0) {
      totalRemoved += removed;
      filesModified++;
    }
  });
  
  console.log(`\n📊 Cleanup Summary:`);
  console.log(`   Files processed: ${files.length}`);
  console.log(`   Files modified: ${filesModified}`);
  console.log(`   Total console.log statements removed: ${totalRemoved}`);
  console.log(`\n🎯 Production optimization completed!`);
  
  if (totalRemoved === 0) {
    console.log('ℹ️  No console.log statements found to remove.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { processFile, findConsoleLogFiles };