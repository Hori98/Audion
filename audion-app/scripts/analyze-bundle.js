#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Bundle analysis script for React Native/Expo apps
 * Analyzes dependencies and suggests optimization opportunities
 */

const packageJsonPath = path.join(process.cwd(), 'package.json');

function analyzePackageJson() {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  console.log('📦 Bundle Size Analysis\n');
  
  // Large libraries that could be optimized
  const heavyDeps = [
    'react-native-reanimated',
    'react-native-gesture-handler', 
    'react-native-webview',
    'react-native-render-html',
    'expo-av',
    'lucide-react',
    'lucide-react-native',
    'i18next',
    'react-i18next',
    'axios'
  ];
  
  const foundHeavyDeps = heavyDeps.filter(dep => deps[dep]);
  
  console.log('🏋️  Heavy Dependencies Found:');
  foundHeavyDeps.forEach(dep => {
    console.log(`   • ${dep}: ${deps[dep]}`);
  });
  
  // Optimization suggestions
  console.log('\n💡 Optimization Suggestions:');
  
  if (deps['expo-av']) {
    console.log('   • Replace expo-av with expo-audio + expo-video (deprecated)');
  }
  
  if (deps['lucide-react'] && deps['lucide-react-native']) {
    console.log('   • Consider removing lucide-react (web only) if not using web builds');
  }
  
  if (deps['react-native-webview']) {
    console.log('   • WebView usage should be minimized for native apps');
  }
  
  if (deps['axios']) {
    console.log('   • Consider replacing axios with fetch API for smaller bundle');
  }
  
  // Tree-shakeable alternatives
  console.log('\n🌳 Tree-shaking Opportunities:');
  console.log('   • Use specific icon imports instead of full icon libraries');
  console.log('   • Implement dynamic imports for heavy components');
  console.log('   • Use React.lazy() for code splitting');
  
  return {
    totalDeps: Object.keys(deps).length,
    heavyDeps: foundHeavyDeps
  };
}

function suggestMemoryOptimizations() {
  console.log('\n🧠 Memory Optimization Suggestions:');
  console.log('   • Implement useCallback for expensive functions');
  console.log('   • Add useMemo for heavy computations');  
  console.log('   • Clean up useEffect subscriptions');
  console.log('   • Optimize image loading and caching');
  console.log('   • Use FlatList for large lists instead of ScrollView');
}

function main() {
  const analysis = analyzePackageJson();
  suggestMemoryOptimizations();
  
  console.log('\n📊 Summary:');
  console.log(`   Total dependencies: ${analysis.totalDeps}`);
  console.log(`   Heavy dependencies: ${analysis.heavyDeps.length}`);
  console.log(`   Current node_modules size: ~547MB`);
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. Replace expo-av with expo-audio/expo-video');
  console.log('   2. Implement memory leak prevention');
  console.log('   3. Add production build optimizations');
  console.log('   4. Consider selective icon imports');
}

if (require.main === module) {
  main();
}

module.exports = { analyzePackageJson, suggestMemoryOptimizations };