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
import { FEED_DEFAULT_RSS_SOURCES } from '../../data/rss-sources';
import InfoBanner from '../InfoBanner';

interface RSSSourceWithStatus extends UserRSSSource {
  isToggling?: boolean;
  name?: string;
  url?: string;
}

interface RSSSourcesScreenProps {
  visible: boolean;
  onClose: () => void;
}

export default function RSSSourcesScreen({ visible, onClose }: RSSSourcesScreenProps) {
  const { token } = useAuth();
  const { fetchRSSData } = useRSSFeedContext(); // Context更新用
  
  const [sources, setSources] = useState<RSSSourceWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingSource, setAddingSource] = useState(false);
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

  // デフォルトRSSソースの初期化
  useEffect(() => {
    initializeDefaultSources();
  }, []);

  const initializeDefaultSources = async () => {
    if (!token) return;
    
    try {
      const userSources = await RSSSourceService.getUserSources({}, token);
      
      // ソースが1つもない場合はデフォルトソースを追加
      if (userSources.length === 0) {
        console.log('🔧 Initializing default RSS sources...');
        
        // 新しい包括的なデフォルトRSSソース（日米混合10選）
        const defaultSources = FEED_DEFAULT_RSS_SOURCES.map(source => ({
          name: source.name,
          url: source.url
        }));
        
        for (const source of defaultSources) {
          try {
            await RSSSourceService.addUserSource({
              custom_name: source.name,
              custom_url: source.url,
              is_active: true
            }, token);
            console.log(`✅ Added default source: ${source.name}`);
          } catch (error) {
            console.error(`❌ Failed to add ${source.name}:`, error);
          }
        }
        
        // Context更新
        await fetchRSSData();
      }
    } catch (error) {
      console.error('Error initializing default sources:', error);
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
                  <Text style={styles.emptyIcon}>📡</Text>
                  <Text style={styles.emptyTitle}>RSSソースがありません</Text>
                  <Text style={styles.emptyDescription}>
                    上記の「+」ボタンからRSSソースを追加してください
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
});
