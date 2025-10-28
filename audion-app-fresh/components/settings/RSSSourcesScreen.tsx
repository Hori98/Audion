/**
 * RSS Sources Settings Screen - Modal version
 * Settings画面内で使用するモーダル版のRSSソース管理画面
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRSSFeedContext } from '../../context/RSSFeedContext';
import RSSSourceService, { UserRSSSource } from '../../services/RSSSourceService';
import { FEATURE_FLAGS } from '../../services/config';
import InfoBanner from '../InfoBanner';
import RSSChangeNotifier from '../../services/RSSChangeNotifier';

interface RSSSourceWithStatus extends UserRSSSource {
  isToggling?: boolean;
  name?: string;
  url?: string;
}

interface RSSSourcesScreenProps {
  visible: boolean;
  onClose: () => void;
}

// おすすめプリセット5件（動的取得 - API一元化実装）
// 初期値はフォールバック用
const FALLBACK_PRESETS = [
  { id: 'nhk-news', name: 'NHK ニュース' },
  { id: 'itmedia-news', name: 'ITmedia NEWS' }, 
  { id: 'asahi-news', name: '朝日新聞デジタル' },
  { id: 'techcrunch-jp', name: 'TechCrunch Japan' },
  { id: 'cnet-jp', name: 'CNET Japan' },
];

interface RecommendedSectionProps {
  sources: UserRSSSource[];
  onSourceAdded: (presetId: string) => Promise<void>;
}

function RecommendedSection({ sources, onSourceAdded }: RecommendedSectionProps) {
  const { token } = useAuth();
  const [addingStates, setAddingStates] = useState<Record<string, boolean>>({});
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);
  const [recommendedPresets, setRecommendedPresets] = useState(FALLBACK_PRESETS);
  const [loading, setLoading] = useState(true);

  // プリセット動的取得
  useEffect(() => {
    const fetchRecommendedPresets = async () => {
      try {
        setLoading(true);
        const presets = await RSSSourceService.getRecommendedSources(5, token);
        const mapped = presets.map(preset => ({
          id: preset.id,
          name: preset.name
        }));
        setRecommendedPresets(mapped);
      } catch (error) {
        console.warn('[RecommendedSection] Failed to fetch presets, using fallback:', error);
        setRecommendedPresets(FALLBACK_PRESETS);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchRecommendedPresets();
    } else {
      setLoading(false);
    }
  }, [token]);

  // 登録済みソースのURLから追加済みプリセットを判定
  const existingUrls = sources.map(source => source.url);
  const addedPresetIds = recommendedPresets.filter(preset => {
    // プリセットIDから実際のURLを解決して比較（簡易版）
    const presetUrls = {
      'nhk-news': 'nhk.or.jp',
      'asahi-news': 'asahi.com',
      'mainichi-news': 'mainichi.jp',
      'mainichi-english': 'mainichi.jp',
      'ndl-news': 'ndl.go.jp',
      'digital-agency': 'digital.go.jp',
      'fsa-news': 'fsa.go.jp',
      'nims-events': 'nims.go.jp',
      'nims-recruitment': 'nims.go.jp',
      'nims-press': 'nims.go.jp',
      'itmedia-news': 'itmedia.co.jp',
      'wired-us': 'wired.com',
      'verge-news': 'theverge.com',
      'toyokeizai': 'toyokeizai.net',
      'bbc-news': 'bbci.co.uk',
      'guardian-world': 'theguardian.com',
      'un-news': 'news.un.org',
      'science-daily': 'sciencedaily.com',
      'nasa-breaking': 'nasa.gov'
    };
    const presetUrlPart = presetUrls[preset.id];
    return presetUrlPart && existingUrls.some(url => url.includes(presetUrlPart));
  }).map(preset => preset.id);

  // 未追加のプリセットのみ表示
  const remainingSources = recommendedPresets.filter(
    preset => !addedPresetIds.includes(preset.id)
  );

  const completionRate = addedPresetIds.length / recommendedPresets.length;

  // 全完了時の処理
  useEffect(() => {
    if (remainingSources.length === 0 && addedPresetIds.length > 0) {
      setShowCompletionBanner(true);
      setTimeout(() => setShowCompletionBanner(false), 5000); // 5秒後に自動非表示
    }
  }, [remainingSources.length, addedPresetIds.length]);

  const handleAddPreset = async (presetId: string, presetName: string) => {
    if (addingStates[presetId]) return;

    setAddingStates(prev => ({ ...prev, [presetId]: true }));
    
    try {
      await onSourceAdded(presetId);
    } catch (error) {
      // 409重複エラーは成功扱い（ログのみ）
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('DUPLICATE_RSS_URL') && !errorMessage.includes('409')) {
        console.error(`Failed to add preset ${presetName}:`, error);
        Alert.alert('エラー', `${presetName}の追加に失敗しました`);
      }
    } finally {
      setAddingStates(prev => ({ ...prev, [presetId]: false }));
    }
  };

  // 完了バナーのみ表示
  if (remainingSources.length === 0 && showCompletionBanner) {
    return (
      <View style={styles.recommendedSection}>
        <View style={styles.completionBanner}>
          <Text style={styles.completionIcon}>🎉</Text>
          <Text style={styles.completionTitle}>おすすめRSSの追加が完了しました</Text>
          <Text style={styles.completionSubtitle}>
            すべてのおすすめソースが追加されました
          </Text>
          <TouchableOpacity 
            style={styles.dismissButton}
            onPress={() => setShowCompletionBanner(false)}
          >
            <Text style={styles.dismissButtonText}>非表示</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // セクション非表示（全完了かつバナーも非表示）
  if (remainingSources.length === 0) {
    return null;
  }

  return (
    <View style={styles.recommendedSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          🌟 おすすめのRSS (残り{remainingSources.length}件)
        </Text>
        <Text style={styles.sectionProgress}>
          {addedPresetIds.length}/{recommendedPresets.length}件追加済み
        </Text>
      </View>

      <View style={styles.presetList}>
        {remainingSources.map((preset) => (
          <View key={preset.id} style={styles.presetItem}>
            <View style={styles.presetInfo}>
              <Text style={styles.presetName}>{preset.name}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.presetAddButton,
                addingStates[preset.id] && styles.presetAddingButton
              ]}
              onPress={() => handleAddPreset(preset.id, preset.name)}
              disabled={addingStates[preset.id]}
            >
              {addingStates[preset.id] ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.presetAddText}>+ 追加</Text>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <Text style={styles.helpText}>
        💡 お好みのソースを選んで追加してください
      </Text>
    </View>
  );
}


export default function RSSSourcesScreen({ visible, onClose }: RSSSourcesScreenProps) {
  const { token } = useAuth();
  const { fetchRSSData } = useRSSFeedContext(); // Context更新用
  
  const [sources, setSources] = useState<RSSSourceWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingSource, setAddingSource] = useState(false);
  const [pendingRefresh, setPendingRefresh] = useState(false);
  const hasActiveSources = sources.some(s => s.is_active);
  
  // 新しいRSSソース追加用の状態
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');

  useEffect(() => {
    if (visible) {
      fetchRSSSources();
    }
  }, [visible]);

  // プリセット追加のハンドラー（計画通りの実装）
  const handlePresetSourceAdded = async (presetId: string) => {
    if (!token) throw new Error('認証が必要です');

    // 必ず /api/rss-sources/add を使用（URL無しプリセット）
    const newSource = await RSSSourceService.addUserSource({
      preconfigured_source_id: presetId,
    }, token);

    // 楽観的更新でローカル状態に追加
    const sourceWithName = {
      ...newSource,
      name: newSource.name || newSource.custom_name || 'RSS Source',
      url: newSource.url || newSource.custom_url || ''
    };
    setSources(prev => [...prev, sourceWithName]);

    // 代表者による500msデバウンス再取得（スパイク回避）
    if (!pendingRefresh) {
      setPendingRefresh(true);
      setTimeout(async () => {
        try {
          await fetchRSSData(); // Context更新
          RSSChangeNotifier.notifySourceAdded(newSource.id);
        } finally {
          setPendingRefresh(false);
        }
      }, 500);
    }
  };



  const activateAllSources = async () => {
    if (!token) return;
    try {
      const targets = sources.filter(s => !s.is_active);
      for (const s of targets) {
        try {
          await RSSSourceService.updateUserSource(s.id, { is_active: true }, token);
        } catch (e) {
          console.warn('Activate failed:', s.id, e);
        }
      }
      await fetchRSSSources();
      await fetchRSSData();
      // 成功ポップアップは出さない（静かに反映）
    } catch (e) {
      // エラーのみ通知
      Alert.alert('エラー', '有効化に失敗しました');
    }
  };

  const fetchRSSSources = async () => {
    if (!token) {
      console.error('No authentication token available');
      return;
    }

    try {
      setLoading(true);
      const userSources = await RSSSourceService.getUserSources({}, token);
      // custom_alias || custom_name を name として設定
      const sourcesWithName = userSources.map(source => ({
        ...source,
        name: source.custom_alias || source.custom_name || 'RSS Source',
        url: source.custom_url || source.display_url || ''
      }));
      setSources(sourcesWithName);
      console.log(`✅ Loaded ${userSources.length} RSS sources`);
    } catch (error) {
      console.error('Error fetching RSS sources:', error);
      Alert.alert('エラー', 'RSSソースの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRSSSources().finally(() => setRefreshing(false));
  };

  const toggleSourceStatus = async (sourceId: string, currentStatus: boolean) => {
    if (!token) return;

    // UI即時反映（楽観的更新）
    setSources(prev => prev.map(source => 
      source.id === sourceId 
        ? { ...source, is_active: !currentStatus, isToggling: true }
        : source
    ));

    try {
      await RSSSourceService.updateUserSource(sourceId, { is_active: !currentStatus }, token);
      await RSSSourceService.clearCache(token);
      
      // トグル完了
      setSources(prev => prev.map(source => 
        source.id === sourceId 
          ? { ...source, isToggling: false }
          : source
      ));

      // Context更新してFeedUIに反映
      await fetchRSSData();

      // RSS変更通知を発火
      RSSChangeNotifier.notifySourceToggled(sourceId);
      
    } catch (error) {
      console.error('Error toggling RSS source:', error);
      
      // エラー時は元に戻す
      setSources(prev => prev.map(source => 
        source.id === sourceId 
          ? { ...source, is_active: currentStatus, isToggling: false }
          : source
      ));
      
      Alert.alert('エラー', 'ソースの更新に失敗しました');
    }
  };

  const deleteSource = (sourceId: string, sourceName: string) => {
    Alert.alert(
      'RSSソース削除',
      `「${sourceName}」を削除してもよろしいですか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除', 
          style: 'destructive',
          onPress: () => performDeleteSource(sourceId)
        }
      ]
    );
  };

  const performDeleteSource = async (sourceId: string) => {
    if (!token) return;

    try {
      await RSSSourceService.deleteUserSource(sourceId, token);
      await RSSSourceService.clearCache(token);
      setSources(prev => prev.filter(source => source.id !== sourceId));
      
      // Context更新してFeedUIに反映
      await fetchRSSData();

      // RSS変更通知を発火
      RSSChangeNotifier.notifySourceDeleted(sourceId);

      Alert.alert('成功', 'RSSソースを削除しました');
    } catch (error) {
      console.error('Error deleting RSS source:', error);
      Alert.alert('エラー', 'ソースの削除に失敗しました');
    }
  };

  const addNewSource = async () => {
    if (!token) return;
    if (!newSourceName.trim() || !newSourceUrl.trim()) {
      Alert.alert('エラー', '名前とURLを入力してください');
      return;
    }

    setAddingSource(true);
    
    try {
      const newSource = await RSSSourceService.addUserSource({
        custom_name: newSourceName.trim(),
        custom_url: newSourceUrl.trim()
      }, token);
      await RSSSourceService.clearCache(token);

      const sourceWithName = {
        ...newSource,
        name: newSource.custom_alias || newSource.custom_name || 'RSS Source',
        url: newSource.custom_url || newSource.display_url || ''
      };

      setSources(prev => [...prev, sourceWithName]);
      setNewSourceName('');
      setNewSourceUrl('');
      setShowAddForm(false);

      // Context更新してFeedUIに反映
      await fetchRSSData();

      // RSS変更通知を発火
      RSSChangeNotifier.notifySourceAdded(newSource.id);

      Alert.alert('成功', 'RSSソースを追加しました');
      
    } catch (error) {
      console.error('Error adding RSS source:', error);
      Alert.alert('エラー', 'RSSソースの追加に失敗しました');
    } finally {
      setAddingSource(false);
    }
  };


  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {!hasActiveSources && (
          <InfoBanner
            type="warn"
            message="現在、すべてのRSSソースが無効です。フィードに記事が表示されません。"
            ctaText="すべて有効化"
            onPressCTA={activateAllSources}
            storageKey="@audion_hide_all_off_hint_settings"
          />
        )}
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>RSSソース管理</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddForm(!showAddForm)}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={styles.loadingText}>RSSソースを読み込み中...</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* 新規追加フォーム */}
            {showAddForm && (
              <View style={styles.addForm}>
                <Text style={styles.addFormTitle}>新しいRSSソースを追加</Text>
                
                <TextInput
                  style={styles.input}
                  placeholder="ソース名 (例: TechCrunch Japan)"
                  placeholderTextColor="#666666"
                  value={newSourceName}
                  onChangeText={setNewSourceName}
                  editable={!addingSource}
                />
                
                <TextInput
                  style={styles.input}
                  placeholder="RSS URL (例: https://example.com/feed.xml)"
                  placeholderTextColor="#666666"
                  value={newSourceUrl}
                  onChangeText={setNewSourceUrl}
                  keyboardType="url"
                  autoCapitalize="none"
                  editable={!addingSource}
                />
                
                <View style={styles.addFormButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowAddForm(false);
                      setNewSourceName('');
                      setNewSourceUrl('');
                    }}
                    disabled={addingSource}
                  >
                    <Text style={styles.cancelButtonText}>キャンセル</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={addNewSource}
                    disabled={addingSource}
                  >
                    {addingSource ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.saveButtonText}>追加</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ソース一覧 */}
            <View style={styles.sourcesSection}>
              <Text style={styles.sectionTitle}>
                登録済みRSSソース ({sources.length}件)
              </Text>
              
              {sources.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📰</Text>
                  <Text style={styles.emptyTitle}>RSSソースが登録されていません</Text>
                  <Text style={styles.emptyDescription}>
                    上部の「+」ボタンまたは下記のおすすめから追加してください
                  </Text>
                </View>
              ) : (
                sources.map((source) => (
                  <View key={source.id} style={styles.sourceItem}>
                    <View style={styles.sourceHeader}>
                      <View style={styles.sourceInfo}>
                        <Text style={styles.sourceName}>{source.name}</Text>
                        <Text style={styles.sourceUrl} numberOfLines={1}>
                          {source.url}
                        </Text>
                      </View>
                      
                      <View style={styles.sourceActions}>
                        <Switch
                          value={source.is_active}
                          onValueChange={() => toggleSourceStatus(source.id, source.is_active)}
                          trackColor={{ false: '#3a3a3a', true: '#007bff' }}
                          thumbColor={source.is_active ? '#ffffff' : '#f4f3f4'}
                          disabled={source.isToggling}
                        />
                      </View>
                    </View>
                    
                    <View style={styles.sourceFooter}>
                      <Text style={styles.sourceStatus}>
                        {source.is_active ? '✅ 有効' : '⏸️ 無効'}
                        {source.isToggling && ' (更新中...)'}
                      </Text>
                      
                      <View style={styles.sourceButtons}>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => deleteSource(source.id, source.name || '')}
                        >
                          <Text style={styles.deleteButtonText}>削除</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* おすすめRSSセクション（常時表示） */}
            <RecommendedSection 
              sources={sources} 
              onSourceAdded={handlePresetSourceAdded} 
            />

            <View style={styles.bottomSpacer} />
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#ffffff',
    marginLeft: -2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888888',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
  },
  addForm: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222222',
  },
  addFormTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#333333',
  },
  addFormButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333333',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  sourcesSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222222',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  recommendedButton: {
    backgroundColor: '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    minHeight: 44,
  },
  recommendedButtonIcon: {
    fontSize: 18,
    marginRight: 8,
    color: '#ffffff',
  },
  recommendedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  recommendedDescription: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  sourceItem: {
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222222',
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sourceInfo: {
    flex: 1,
    marginRight: 16,
  },
  sourceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  sourceUrl: {
    fontSize: 14,
    color: '#888888',
  },
  sourceActions: {
    alignItems: 'flex-end',
  },
  sourceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceStatus: {
    fontSize: 14,
    color: '#cccccc',
  },
  sourceButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  bottomSpacer: {
    height: 40,
  },
  // プリセットリスト用のスタイル
  presetList: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  presetInfo: {
    flex: 1,
    marginRight: 12,
  },
  presetName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  presetAddButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  presetAddedButton: {
    backgroundColor: '#28a745',
  },
  presetAddText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  presetAddedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  presetNote: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  // RecommendedSection styles
  recommendedSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionProgress: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  completionBanner: {
    backgroundColor: '#1a5f3f',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#28a745',
  },
  completionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  completionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  completionSubtitle: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
    marginBottom: 16,
  },
  dismissButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  dismissButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  presetAddingButton: {
    backgroundColor: '#666666',
  },
  helpText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
