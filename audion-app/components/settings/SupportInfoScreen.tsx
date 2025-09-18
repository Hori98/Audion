/**
 * Support & Info Settings Screen (MECE準拠)  
 * サポートと情報 - ヘルプ・フィードバック・法的情報の統合
 * アプリ情報とヘルプ機能を一元化
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface SupportInfoScreenProps {
  visible: boolean;
  onClose: () => void;
}

interface SettingItemProps {
  title: string;
  description?: string;
  icon: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightText?: string;
  disabled?: boolean;
}

function SettingItem({ 
  title, 
  description, 
  icon, 
  onPress, 
  showArrow = true,
  rightText,
  disabled = false
}: SettingItemProps) {
  const handlePress = () => {
    if (!disabled && onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.settingItem, disabled && styles.settingItemDisabled]} 
      onPress={handlePress} 
      activeOpacity={disabled ? 1 : 0.7}
      disabled={disabled}
    >
      <View style={styles.settingItemLeft}>
        <View style={styles.iconContainer}>
          <FontAwesome 
            name={icon as any} 
            size={20} 
            color={disabled ? "#666666" : "#007bff"} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.settingTitle, disabled && styles.settingTitleDisabled]}>
            {title}
          </Text>
          {description && (
            <Text style={[styles.settingDescription, disabled && styles.settingDescriptionDisabled]}>
              {description}
            </Text>
          )}
        </View>
      </View>
      {rightText ? (
        <Text style={styles.rightText}>{rightText}</Text>
      ) : (
        showArrow && !disabled && (
          <FontAwesome name="chevron-right" size={14} color="#666666" />
        )
      )}
    </TouchableOpacity>
  );
}

export default function SupportInfoScreen({ visible, onClose }: SupportInfoScreenProps) {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackType, setFeedbackType] = useState('suggestion');

  const handleFAQPress = () => {
    Alert.alert(
      'よくある質問',
      '以下の質問をタップして詳細を確認できます',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '音声生成について', onPress: () => showFAQDetail('audio') },
        { text: 'アカウント設定', onPress: () => showFAQDetail('account') },
        { text: 'トラブルシューティング', onPress: () => showFAQDetail('trouble') },
      ]
    );
  };

  const showFAQDetail = (topic: string) => {
    const faqContent = {
      audio: '音声生成に関するFAQ\n\n• Auto-Pickが動作しない場合\n→ RSS フィードが正常に設定されているか確認してください\n\n• 音声品質を変更したい場合\n→ コンテンツと再生設定から変更できます',
      account: 'アカウント設定に関するFAQ\n\n• パスワードを忘れた場合\n→ ログイン画面の「パスワードを忘れた方」をタップしてください\n\n• メールアドレスを変更したい場合\n→ アカウント設定から変更できます',
      trouble: 'トラブルシューティング\n\n• アプリが重い場合\n→ データとストレージからキャッシュをクリアしてください\n\n• 音声が再生されない場合\n→ デバイスの音量設定とアプリの権限を確認してください'
    };
    
    Alert.alert('FAQ詳細', faqContent[topic as keyof typeof faqContent]);
  };

  const handleTutorialPress = () => {
    Alert.alert(
      'チュートリアル',
      'アプリの使い方を最初から学習しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '開始する', onPress: () => {
          // 実際の実装では、チュートリアル画面を表示
          Alert.alert('実装予定', 'チュートリアル機能は実装予定です');
        }}
      ]
    );
  };

  const handleContactPress = () => {
    setShowFeedbackModal(true);
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('入力エラー', 'フィードバック内容を入力してください');
      return;
    }

    try {
      // 実際の実装では、バックエンドAPIにフィードバックを送信
      // const response = await sendFeedbackAPI(feedbackType, feedbackText);
      
      Alert.alert('送信完了', 'フィードバックを送信しました。ご協力ありがとうございます！');
      setShowFeedbackModal(false);
      setFeedbackText('');
    } catch (error) {
      Alert.alert('送信エラー', 'フィードバックの送信に失敗しました');
    }
  };

  const handleAppReview = () => {
    Alert.alert(
      'アプリ評価',
      'App Store/Google Playでアプリを評価していただけますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '評価する', onPress: () => {
          // 実際の実装では、ストアのURLを開く
          // const storeUrl = Platform.OS === 'ios' ? 'iOS App Store URL' : 'Google Play Store URL';
          // Linking.openURL(storeUrl);
          Alert.alert('ありがとうございます', 'ストア画面を開きます（実装予定）');
        }}
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'プライバシーポリシー',
      'Audionプライバシーポリシー\n\n当アプリは以下の情報を収集します：\n• アカウント情報（メールアドレス）\n• アプリ利用統計\n• 音声生成履歴\n\n収集した情報は：\n• サービス向上のみに使用\n• 第三者への提供は行いません\n• ユーザーの同意なく変更しません\n\n詳細は公式ウェブサイトをご確認ください。'
    );
  };

  const handleTermsOfService = () => {
    Alert.alert(
      '利用規約',
      'Audion利用規約\n\n第1条（サービス内容）\n本サービスはAIによる音声ニュース生成サービスです。\n\n第2条（利用制限）\n• 商用利用は禁止\n• 著作権侵害となる利用は禁止\n• サービスの妨害行為は禁止\n\n第3条（免責事項）\n• 生成コンテンツの正確性は保証しません\n• サービス停止による損害は保証しません\n\n詳細は公式ウェブサイトをご確認ください。'
    );
  };

  const handleOpenSourceLicenses = () => {
    Alert.alert(
      'オープンソースライセンス',
      '本アプリは以下のオープンソースライブラリを使用しています：\n\n• React Native (MIT License)\n• Expo (MIT License)\n• @react-native-async-storage/async-storage (MIT License)\n• @expo/vector-icons (MIT License)\n• React Navigation (MIT License)\n\n各ライブラリのライセンス詳細は公式ドキュメントをご確認ください。'
    );
  };

  const handleContentRightsPolicy = () => {
    Alert.alert(
      'コンテンツ権利・利用ポリシー',
      '• 出典明記（タイトル/媒体/URL）\n• 原文の丸読み禁止（要約/再構成）\n• 生成音声の二次配布禁止\n• 申立て時の速やかな削除対応\n\n詳しくはドキュメントをご参照ください。',
      [
        { text: '閉じる', style: 'cancel' },
        { text: '詳細を開く', onPress: () => {
            const url = 'https://github.com/PLACEHOLDER_REPO/docs/CONTENT_RIGHTS_POLICY.md';
            Linking.openURL(url).catch(() => {
              Alert.alert('案内', 'docs/CONTENT_RIGHTS_POLICY.md をご確認ください');
            });
          }
        }
      ]
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          
          {/* ヘッダー */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <FontAwesome name="arrow-left" size={18} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>サポートと情報</Text>
            <View style={styles.headerRight} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* ヘルプ・サポートセクション */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>ヘルプ・サポート</Text>
              
              <SettingItem
                title="よくある質問（FAQ）"
                description="基本的な使い方・トラブルシューティング"
                icon="question-circle"
                onPress={handleFAQPress}
              />
              
              <SettingItem
                title="チュートリアルを再開"
                description="アプリの使い方を最初から学習"
                icon="play-circle"
                onPress={handleTutorialPress}
              />
              
              <SettingItem
                title="お問い合わせ"
                description="サポートチームに直接連絡"
                icon="envelope"
                onPress={handleContactPress}
              />
              
              <SettingItem
                title="ユーザーガイド"
                description="詳細な機能説明とヒント"
                icon="book"
                onPress={() => Alert.alert('実装予定', 'ユーザーガイドは実装予定です')}
                disabled={true}
              />
            </View>

            {/* フィードバック・改善セクション */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>フィードバック・改善</Text>
              
              <SettingItem
                title="アプリ評価"
                description="App Store/Google Playで評価"
                icon="star"
                onPress={handleAppReview}
              />
              
              <SettingItem
                title="機能要望"
                description="新機能のリクエスト・投票"
                icon="lightbulb-o"
                onPress={handleContactPress}
              />
              
              <SettingItem
                title="バグ報告"
                description="不具合・問題の報告"
                icon="bug"
                onPress={handleContactPress}
              />
              
              <SettingItem
                title="ユーザーフォーラム"
                description="ユーザー同士の情報交換"
                icon="users"
                onPress={() => Alert.alert('実装予定', 'ユーザーフォーラムは実装予定です')}
                disabled={true}
              />
            </View>

            {/* アプリ情報セクション */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>アプリ情報</Text>
              
              <View style={styles.appInfoCard}>
                <View style={styles.appIconContainer}>
                  <FontAwesome name="volume-up" size={32} color="#007bff" />
                </View>
                <View style={styles.appDetails}>
                  <Text style={styles.appName}>Audion</Text>
                  <Text style={styles.appVersion}>Version 1.0.0</Text>
                  <Text style={styles.appDescription}>AI音声ニュースアプリ</Text>
                </View>
              </View>
              
              <SettingItem
                title="バージョン情報"
                description="現在のバージョン・ビルド情報"
                icon="info-circle"
                rightText="v1.0.0"
                onPress={() => Alert.alert('バージョン情報', 'Audion v1.0.0\nBuild: 2024123101\n最終更新: 2024年12月31日')}
              />
              
              <SettingItem
                title="更新履歴"
                description="過去のアップデート内容"
                icon="history"
                onPress={() => Alert.alert('実装予定', '更新履歴表示機能は実装予定です')}
                disabled={true}
              />
            </View>

            {/* 法的情報セクション */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>法的情報</Text>
              
              <SettingItem
                title="利用規約"
                description="サービス利用規約"
                icon="file-text-o"
                onPress={handleTermsOfService}
              />
              
              <SettingItem
                title="プライバシーポリシー"
                description="データ収集・利用方針"
                icon="shield"
                onPress={handlePrivacyPolicy}
              />
              
              <SettingItem
                title="オープンソースライセンス"
                description="使用ライブラリのライセンス"
                icon="code"
                onPress={handleOpenSourceLicenses}
              />

              <SettingItem
                title="コンテンツ権利・利用ポリシー"
                description="出典明記・要約前提・二次配布禁止など"
                icon="balance-scale"
                onPress={handleContentRightsPolicy}
              />
            </View>

            {/* サポート状況表示 */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>サポート状況</Text>
              
              <View style={styles.supportCard}>
                <View style={styles.supportItem}>
                  <FontAwesome name="clock-o" size={16} color="#4CAF50" />
                  <Text style={styles.supportLabel}>平均応答時間</Text>
                  <Text style={styles.supportValue}>24時間</Text>
                </View>
                
                <View style={styles.supportItem}>
                  <FontAwesome name="check-circle" size={16} color="#4CAF50" />
                  <Text style={styles.supportLabel}>サポート状況</Text>
                  <Text style={styles.supportValue}>稼働中</Text>
                </View>
                
                <View style={styles.supportItem}>
                  <FontAwesome name="globe" size={16} color="#007bff" />
                  <Text style={styles.supportLabel}>対応言語</Text>
                  <Text style={styles.supportValue}>日本語</Text>
                </View>
              </View>
            </View>

            {/* 下部の余白 */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </Modal>

      {/* フィードバック送信モーダル */}
      <Modal
        visible={showFeedbackModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => setShowFeedbackModal(false)}
            >
              <FontAwesome name="arrow-left" size={18} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>フィードバック</Text>
            <TouchableOpacity 
              style={styles.sendButton} 
              onPress={handleSendFeedback}
            >
              <Text style={styles.sendButtonText}>送信</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.inputLabel}>フィードバックの種類</Text>
              <View style={styles.typeSelector}>
                {[
                  { id: 'suggestion', label: '機能要望' },
                  { id: 'bug', label: 'バグ報告' },
                  { id: 'general', label: '一般的な意見' }
                ].map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeButton,
                      feedbackType === type.id && styles.typeButtonActive
                    ]}
                    onPress={() => setFeedbackType(type.id)}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      feedbackType === type.id && styles.typeButtonTextActive
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>詳細内容</Text>
              <TextInput
                style={styles.textArea}
                value={feedbackText}
                onChangeText={setFeedbackText}
                multiline
                numberOfLines={6}
                placeholder="お気づきの点、改善のご提案、バグの詳細などをお書きください"
                placeholderTextColor="#666666"
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerRight: {
    width: 32,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#007bff',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 12,
    marginHorizontal: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#888888',
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  settingTitleDisabled: {
    color: '#666666',
  },
  settingDescriptionDisabled: {
    color: '#444444',
  },
  rightText: {
    fontSize: 14,
    color: '#888888',
    marginRight: 8,
  },
  appInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
  },
  appIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  appDetails: {
    flex: 1,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#007bff',
    marginBottom: 2,
  },
  appDescription: {
    fontSize: 14,
    color: '#888888',
  },
  supportCard: {
    backgroundColor: '#111111',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  supportLabel: {
    flex: 1,
    fontSize: 14,
    color: '#cccccc',
    marginLeft: 12,
  },
  supportValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 8,
    marginTop: 16,
    marginHorizontal: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  typeButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
  },
  typeButtonTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: '#111111',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
    minHeight: 120,
  },
  bottomSpacer: {
    height: 32,
  },
});
