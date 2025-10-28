/**
 * Audio Generation Menu Component
 * 4つの音声生成方式を明確に分離・表示するメニュー
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Article } from '../services/ArticleService';

interface AudioGenerationMenuProps {
  visible: boolean;
  onClose: () => void;
  currentArticle?: Article; // 個別記事生成用
  onSingleGenerate?: (article: Article) => Promise<void>;
  onAutoPick?: () => Promise<void>;
  onManualPick?: () => void;
  onInstantMulti?: () => Promise<void>;
}

export default function AudioGenerationMenu({
  visible,
  onClose,
  currentArticle,
  onSingleGenerate,
  onAutoPick,
  onManualPick,
  onInstantMulti,
}: AudioGenerationMenuProps) {
  const [processing, setProcessing] = useState(false);

  const handleMethodSelect = async (method: string) => {
    try {
      setProcessing(true);
      
      switch (method) {
        case 'single':
          if (currentArticle && onSingleGenerate) {
            await onSingleGenerate(currentArticle);
          }
          break;
        case 'autopick':
          if (onAutoPick) {
            await onAutoPick();
          }
          break;
        case 'manual':
          if (onManualPick) {
            onManualPick();
          }
          break;
        case 'instant':
          if (onInstantMulti) {
            await onInstantMulti();
          }
          break;
        default:
          Alert.alert('エラー', '不明な音声生成方式です');
          return;
      }
      
      onClose();
    } catch (error) {
      console.error(`Audio generation method ${method} failed:`, error);
      Alert.alert('エラー', '音声生成に失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const methods = [
    {
      id: 'single',
      title: '単記事音声生成',
      description: '選択中の記事1つから音声生成',
      icon: '🎯',
      available: !!currentArticle,
      color: '#007AFF',
    },
    {
      id: 'autopick',
      title: 'Auto-Pick生成',
      description: 'AIが自動で記事を選択して音声生成',
      icon: '🤖',
      available: true,
      color: '#34C759',
    },
    {
      id: 'manual',
      title: 'Manual Pick生成',
      description: '既読記事から手動で複数選択',
      icon: '📋',
      available: true,
      color: '#FF9500',
    },
    {
      id: 'instant',
      title: 'インスタント複数生成',
      description: '最新記事から即座に複数選択',
      icon: '⚡',
      available: true,
      color: '#FF3B30',
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>閉じる</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>音声生成方式</Text>
          
          <View style={styles.spacer} />
        </View>

        <Text style={styles.subtitle}>
          生成方式を選択してください
        </Text>

        <ScrollView style={styles.methodsList} showsVerticalScrollIndicator={false}>
          {methods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodItem,
                { borderLeftColor: method.color },
                !method.available && styles.disabledMethodItem
              ]}
              onPress={() => handleMethodSelect(method.id)}
              disabled={!method.available || processing}
            >
              <View style={styles.methodIcon}>
                <Text style={styles.methodIconText}>{method.icon}</Text>
              </View>
              
              <View style={styles.methodContent}>
                <Text style={[
                  styles.methodTitle,
                  !method.available && styles.disabledMethodTitle
                ]}>
                  {method.title}
                </Text>
                <Text style={[
                  styles.methodDescription,
                  !method.available && styles.disabledMethodDescription
                ]}>
                  {method.description}
                </Text>
                {!method.available && method.id === 'single' && (
                  <Text style={styles.unavailableText}>
                    記事が選択されていません
                  </Text>
                )}
              </View>

              <View style={[styles.colorIndicator, { backgroundColor: method.color }]} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            各方式の詳細は設定画面で確認できます
          </Text>
        </View>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  spacer: {
    width: 50,
  },
  subtitle: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  methodsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    padding: 20,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  disabledMethodItem: {
    opacity: 0.5,
  },
  methodIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  methodIconText: {
    fontSize: 24,
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    color: '#cccccc',
    lineHeight: 20,
  },
  disabledMethodTitle: {
    color: '#666666',
  },
  disabledMethodDescription: {
    color: '#555555',
  },
  unavailableText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  colorIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerText: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
  },
});