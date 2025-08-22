# 🧪 Audion Testing Guide

## Simulator Testing (iOS)

### 基本テスト手順

1. **アプリ起動**
```bash
cd audion-app
npm start --clear
# iOS Simulatorで 'i' を押してアプリ起動
```

2. **音声再生テスト**
   - ホーム画面で記事選択 → AutoPick実行
   - ライブラリで音声ファイル再生
   - ミニプレイヤー表示確認

3. **バックグラウンド再生テスト**
   - 音声再生中に `Cmd + Shift + H` でホーム画面へ
   - 音声が継続再生されることを確認
   - 他のアプリを開いても再生継続確認

4. **ロック画面テスト**
   - 音声再生中に `Cmd + L` でロック画面表示
   - 通知領域にメディアコントロール表示確認
   - ⚠️ 注意: 完全なロック画面コントロールはDevelopment Buildでのみ利用可能

## 機能別テスト

### ✅ 動作確認済み機能
- バックグラウンド音声再生
- ダウンロード機能  
- 通知ベースメディアコントロール
- 言語検出（修正済み）

### ⚠️ 制限あり機能（Expo Go）
- ネイティブロック画面コントロール
- プッシュ通知（物理デバイスのみ）
- カメラ・ファイルアクセス

### 🔧 Development Build必須機能
- iOS Control Center統合
- ネイティブロック画面プレイヤー
- CarPlay対応
- Siri Shortcuts

## エラー対応

### よくあるエラーと対処法

1. **Language Detection Error** ✅ 修正済み
```
ERROR Error detecting language: [TypeError: Cannot read property 'split' of undefined]
```
**対処**: LanguageContext.tsxでエラーハンドリング追加済み

2. **Audio Session Error** ✅ 修正済み
```
ERROR ❌ Error configuring audio session: [TypeError: Cannot read property 'DoNotMix' of undefined]
```
**対処**: 数値定数使用に変更済み

3. **Expo-AV Deprecation Warning** ⚠️ 情報
```
WARN [expo-av]: Expo AV has been deprecated and will be removed in SDK 54
```
**対処**: 将来的にexpo-audioへ移行予定

## Testing Checklist

### 🎵 Audio Functionality
- [ ] 音声ファイル再生
- [ ] 一時停止・再開
- [ ] シーク操作
- [ ] 再生速度変更
- [ ] バックグラウンド再生
- [ ] 音声ダウンロード

### 📱 UI/UX
- [ ] ミニプレイヤー表示
- [ ] フルスクリーンプレイヤー
- [ ] プレイリスト操作
- [ ] 検索機能
- [ ] 設定画面遷移

### 🔔 Notifications
- [ ] 音声準備完了通知
- [ ] メディアコントロール通知
- [ ] バックグラウンド通知表示

### 📊 Data Management
- [ ] ユーザー認証
- [ ] 記事取得・表示
- [ ] お気に入り機能
- [ ] 履歴管理

## Development Build Testing

完全なロック画面コントロールテストには Development Build が必要：

```bash
# Development Build作成
npx expo install expo-dev-client
npx expo run:ios
```

この方法では以下が追加でテスト可能：
- ネイティブロック画面コントロール
- iOS Control Center統合
- プッシュ通知
- カメラ・ファイルアクセス

## 物理デバイステスト

最終的な動作確認は物理デバイスで実行：
- iPhone/iPad: Xcodeでビルド・インストール
- Android: Android Studioでビルド・インストール

## 注意事項

1. **Expo Go制限**: ネイティブ機能は制限される
2. **通知権限**: 物理デバイスでのみフル機能
3. **ロック画面**: Development Buildで最適体験
4. **パフォーマンス**: 物理デバイスでより正確な測定可能