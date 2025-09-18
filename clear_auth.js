/**
 * 認証状態をクリアするスクリプト
 * アプリをonboardingから始めるために使用
 */
const { execSync } = require('child_process');

console.log('🧹 認証状態をクリアしています...');

try {
  // Expoキャッシュをクリア
  console.log('📱 Expoキャッシュをクリア中...');
  execSync('rm -rf .expo', { stdio: 'inherit' });
  
  // Metro bundlerのキャッシュもクリア
  console.log('🔄 Metro bundlerキャッシュをクリア中...');
  execSync('npx expo r -c', { stdio: 'inherit' });
  
  console.log('✅ 認証状態のクリアが完了しました！');
  console.log('');
  console.log('🚀 次のステップ:');
  console.log('1. npx expo start でアプリを起動');
  console.log('2. アプリが認証画面から開始します');
  console.log('3. 新規登録またはログインを実行');
  
} catch (error) {
  console.error('❌ エラーが発生しました:', error.message);
}