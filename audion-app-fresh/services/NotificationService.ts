/**
 * NotificationService
 * Expo Notificationsを使用したプッシュ通知管理サービス
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// 通知の表示設定（フォアグラウンドでも表示する）
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

class NotificationService {
  private static instance: NotificationService;
  private pushToken: string | null = null;
  private permissionStatus: NotificationPermissionStatus | null = null;

  constructor() {
    if (NotificationService.instance) {
      return NotificationService.instance;
    }
    NotificationService.instance = this;
    this.setupNotificationChannel();
  }

  /**
   * Android用の通知チャンネルを設定
   */
  private async setupNotificationChannel() {
    // Web環境では何もしない（expo-notificationsはWeb未対応）
    if (Platform.OS === 'web') {
      return;
    }

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });

        // 音声生成完了用の特別なチャンネル
        await Notifications.setNotificationChannelAsync('audio_generation', {
          name: 'Audio Generation',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#007bff',
          sound: 'default',
          description: '音声生成完了時の通知',
        });

        // 新着コンテンツ用のチャンネル
        await Notifications.setNotificationChannelAsync('content', {
          name: 'Content Updates',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250],
          lightColor: '#4CAF50',
          sound: 'default',
          description: '新着記事・おすすめコンテンツの通知',
        });

        // システム通知用のチャンネル
        await Notifications.setNotificationChannelAsync('system', {
          name: 'System Notifications',
          importance: Notifications.AndroidImportance.LOW,
          vibrationPattern: [0, 100],
          lightColor: '#FF9800',
          description: 'アプリアップデート・メンテナンス情報',
        });
      } catch (error) {
        console.warn('[Notifications] Android通知チャンネル設定に失敗:', error);
      }
    }
  }

  /**
   * プッシュ通知の許可を取得し、Expo Push Tokenを登録
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Web環境では早期リターン（expo-notificationsはWeb未対応）
      if (Platform.OS === 'web') {
        console.log('[Notifications] Web環境のため、プッシュ通知はスキップされます');
        return null;
      }

      // 物理デバイスでのみ動作
      if (!Constants.isDevice) {
        console.warn('プッシュ通知は実機でのみ利用できます');
        return null;
      }

      // 既存の許可状況を確認
      const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      this.permissionStatus = {
        granted: existingStatus === 'granted',
        canAskAgain,
        status: existingStatus,
      };

      // 許可されていない場合、許可を求める
      if (existingStatus !== 'granted') {
        if (!canAskAgain) {
          console.warn('プッシュ通知の許可が拒否されており、再度求めることができません');
          return null;
        }

        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        
        this.permissionStatus = {
          granted: status === 'granted',
          canAskAgain: false, // 一度求めたら false になる
          status,
        };
      }

      if (finalStatus !== 'granted') {
        console.log('プッシュ通知の許可が得られませんでした');
        return null;
      }

      // Expo Push Tokenを取得
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                       Constants.manifest?.extra?.eas?.projectId ||
                       Constants.manifest2?.extra?.eas?.projectId;

      if (!projectId) {
        // プロジェクトIDがない場合はデバッグ用のダミートークンを生成
        console.warn('Project ID not found, generating mock token for development');
        this.pushToken = `ExponentPushToken[mock-${Date.now()}]`;
        return this.pushToken;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ 
        projectId: projectId.toString() 
      });
      this.pushToken = tokenData.data;
      
      console.log('Expo Push Token取得成功:', this.pushToken);
      return this.pushToken;

    } catch (error) {
      console.error('プッシュ通知登録エラー:', error);
      return null;
    }
  }

  /**
   * 現在のプッシュトークンを取得
   */
  getCurrentPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * 通知許可状況を取得
   */
  getPermissionStatus(): NotificationPermissionStatus | null {
    return this.permissionStatus;
  }

  /**
   * 通知許可状況を再確認
   */
  async refreshPermissionStatus(): Promise<NotificationPermissionStatus> {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    this.permissionStatus = {
      granted: status === 'granted',
      canAskAgain,
      status,
    };
    return this.permissionStatus;
  }

  /**
   * OS設定画面を開く
   */
  async openSystemSettings() {
    await Notifications.requestPermissionsAsync();
  }

  /**
   * ローカル通知をスケジュール（テスト用）
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    seconds: number = 5,
    data?: any
  ): Promise<string> {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: {
        seconds,
      },
    });

    console.log('ローカル通知をスケジュール:', identifier);
    return identifier;
  }

  /**
   * スケジュールされた通知をキャンセル
   */
  async cancelScheduledNotification(identifier: string) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  /**
   * 全ての通知をクリア
   */
  async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * 通知バッジ数を設定
   */
  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * 現在のバッジ数を取得
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * 通知履歴を取得
   */
  async getDeliveredNotifications(): Promise<Notifications.Notification[]> {
    return await Notifications.getPresentedNotificationsAsync();
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo() {
    return {
      pushToken: this.pushToken,
      permissionStatus: this.permissionStatus,
      isDevice: Constants.isDevice,
      platform: Platform.OS,
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    };
  }
}

export default new NotificationService();