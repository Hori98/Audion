#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Memory leak detection script for React Native
 * Identifies potential memory leaks in useEffect hooks
 */

function findTSXFiles() {
  return glob.sync('**/*.{ts,tsx}', {
    ignore: ['node_modules/**', '.expo/**', '.git/**', 'scripts/**']
  });
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];
  
  let useEffectCount = 0;
  let cleanupCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    
    // Check for useEffect hooks
    if (line.includes('useEffect(')) {
      useEffectCount++;
      
      // Look ahead for cleanup function in the next 20 lines
      let hasCleanup = false;
      for (let j = i; j < Math.min(i + 20, lines.length); j++) {
        if (lines[j].includes('return () =>') || 
            lines[j].includes('return function') ||
            lines[j].includes('return cleanup')) {
          hasCleanup = true;
          cleanupCount++;
          break;
        }
      }
      
      // Check for potential memory leak patterns
      const effectContent = lines.slice(i, Math.min(i + 10, lines.length)).join(' ');
      
      if (effectContent.includes('setInterval') && !hasCleanup) {
        issues.push({
          type: 'interval_leak',
          line: lineNumber,
          message: 'setInterval without cleanup may cause memory leak'
        });
      }
      
      if (effectContent.includes('setTimeout') && !hasCleanup) {
        issues.push({
          type: 'timeout_leak',
          line: lineNumber,
          message: 'setTimeout without cleanup may cause memory leak'
        });
      }
      
      if (effectContent.includes('addEventListener') && !hasCleanup) {
        issues.push({
          type: 'listener_leak',
          line: lineNumber,
          message: 'Event listener without cleanup may cause memory leak'
        });
      }
      
      if (effectContent.includes('subscribe') && !hasCleanup) {
        issues.push({
          type: 'subscription_leak', 
          line: lineNumber,
          message: 'Subscription without cleanup may cause memory leak'
        });
      }
    }
    
    // Check for missing useCallback/useMemo optimizations
    if (line.includes('const ') && line.includes('= (') && !line.includes('useCallback')) {
      if (line.includes('async') || content.includes(`${line.split('=')[0].trim().split(' ').pop()}(`)) {
        issues.push({
          type: 'missing_callback',
          line: lineNumber,
          message: 'Function definition could benefit from useCallback'
        });
      }
    }
  }
  
  return {
    useEffectCount,
    cleanupCount,
    issues,
    cleanupRatio: useEffectCount > 0 ? (cleanupCount / useEffectCount) : 1
  };
}

function main() {
  console.log('🔍 Memory Leak Analysis\n');
  
  const files = findTSXFiles();
  let totalUseEffects = 0;
  let totalCleanups = 0;
  let totalIssues = 0;
  const criticalFiles = [];
  
  files.forEach(file => {
    const analysis = analyzeFile(file);
    totalUseEffects += analysis.useEffectCount;
    totalCleanups += analysis.cleanupCount;
    totalIssues += analysis.issues.length;
    
    if (analysis.issues.length > 0 || analysis.cleanupRatio < 0.5) {
      criticalFiles.push({
        file,
        ...analysis
      });
    }
  });
  
  // Report critical files
  if (criticalFiles.length > 0) {
    console.log('⚠️  Files with Memory Leak Risks:');
    criticalFiles.forEach(({ file, issues, useEffectCount, cleanupCount }) => {
      console.log(`\n📁 ${file}`);
      console.log(`   useEffect hooks: ${useEffectCount}, cleanups: ${cleanupCount}`);
      
      issues.forEach(issue => {
        console.log(`   ⚠️  Line ${issue.line}: ${issue.message}`);
      });
    });
  }
  
  // Summary
  console.log('\n📊 Analysis Summary:');
  console.log(`   Files analyzed: ${files.length}`);
  console.log(`   Total useEffect hooks: ${totalUseEffects}`);
  console.log(`   Total cleanup functions: ${totalCleanups}`);
  console.log(`   Cleanup ratio: ${totalUseEffects > 0 ? ((totalCleanups / totalUseEffects) * 100).toFixed(1) : 100}%`);
  console.log(`   Potential issues found: ${totalIssues}`);
  console.log(`   Files needing attention: ${criticalFiles.length}`);
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  if (totalUseEffects > totalCleanups) {
    console.log('   • Add cleanup functions to useEffect hooks');
  }
  if (totalIssues > 0) {
    console.log('   • Review flagged files for memory leak prevention');
  }
  console.log('   • Implement useCallback for event handlers');
  console.log('   • Use useMemo for expensive calculations');
  console.log('   • Consider React.lazy() for heavy components');
  
  return {
    totalFiles: files.length,
    totalUseEffects,
    totalCleanups,
    totalIssues,
    criticalFiles: criticalFiles.length
  };
}

if (require.main === module) {
  main();
}

module.exports = { analyzeFile, findTSXFiles };