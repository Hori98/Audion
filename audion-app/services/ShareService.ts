import { Share, Alert } from 'react-native';
import * as Linking from 'expo-linking';

export interface ShareContent {
  title: string;
  message: string;
  url: string;
}

class ShareService {
  private static instance: ShareService;

  private constructor() {}

  static getInstance(): ShareService {
    if (!ShareService.instance) {
      ShareService.instance = new ShareService();
    }
    return ShareService.instance;
  }

  async shareArticle(article: any): Promise<void> {
    try {
      const shareContent: ShareContent = {
        title: article.title,
        message: `Check out this article: ${article.title}\n\n${article.summary}\n\nRead more:`,
        url: article.link,
      };

      const result = await Share.share({
        title: shareContent.title,
        message: `${shareContent.message} ${shareContent.url}`,
        url: shareContent.url,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared via specific app
          console.log('Article shared via:', result.activityType);
        } else {
          // Shared via general share
          console.log('Article shared successfully');
        }
      }
    } catch (error) {
      console.error('Error sharing article:', error);
      Alert.alert('Error', 'Failed to share article');
    }
  }

  async shareViaTwitter(article: any): Promise<void> {
    try {
      const text = encodeURIComponent(`${article.title} ${article.link}`);
      const twitterUrl = `https://twitter.com/intent/tweet?text=${text}`;
      
      const supported = await Linking.canOpenURL(twitterUrl);
      if (supported) {
        await Linking.openURL(twitterUrl);
      } else {
        // Fallback to native share
        await this.shareArticle(article);
      }
    } catch (error) {
      console.error('Error sharing to Twitter:', error);
      Alert.alert('Error', 'Failed to share to Twitter');
    }
  }

  async shareViaFacebook(article: any): Promise<void> {
    try {
      const url = encodeURIComponent(article.link);
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      
      const supported = await Linking.canOpenURL(facebookUrl);
      if (supported) {
        await Linking.openURL(facebookUrl);
      } else {
        // Fallback to native share
        await this.shareArticle(article);
      }
    } catch (error) {
      console.error('Error sharing to Facebook:', error);
      Alert.alert('Error', 'Failed to share to Facebook');
    }
  }

  async shareViaWhatsApp(article: any): Promise<void> {
    try {
      const text = encodeURIComponent(`${article.title}\n\n${article.summary}\n\nRead more: ${article.link}`);
      const whatsappUrl = `whatsapp://send?text=${text}`;
      
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback to native share
        await this.shareArticle(article);
      }
    } catch (error) {
      console.error('Error sharing to WhatsApp:', error);
      Alert.alert('Error', 'Failed to share to WhatsApp');
    }
  }

  async copyToClipboard(article: any): Promise<void> {
    try {
      const { Clipboard } = await import('react-native');
      const shareText = `${article.title}\n\n${article.summary}\n\nRead more: ${article.link}`;
      
      await Clipboard.setString(shareText);
      Alert.alert('Copied', 'Article link copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  }

  showShareOptions(article: any): void {
    Alert.alert(
      'Share Article',
      'Choose how to share this article:',
      [
        {
          text: 'Native Share',
          onPress: () => this.shareArticle(article),
        },
        {
          text: 'Twitter',
          onPress: () => this.shareViaTwitter(article),
        },
        {
          text: 'Facebook',
          onPress: () => this.shareViaFacebook(article),
        },
        {
          text: 'WhatsApp',
          onPress: () => this.shareViaWhatsApp(article),
        },
        {
          text: 'Copy Link',
          onPress: () => this.copyToClipboard(article),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  }

  // Share audio content (for future use)
  async shareAudioContent(audioData: any): Promise<void> {
    try {
      const shareContent: ShareContent = {
        title: audioData.title,
        message: `Listen to this AI-generated podcast: ${audioData.title}\n\nGenerated from ${audioData.article_titles.length} articles`,
        url: audioData.audio_url || 'https://audion.app', // Replace with actual app URL
      };

      await Share.share({
        title: shareContent.title,
        message: `${shareContent.message}\n\n${shareContent.url}`,
        url: shareContent.url,
      });
    } catch (error) {
      console.error('Error sharing audio content:', error);
      Alert.alert('Error', 'Failed to share audio content');
    }
  }
}

export default ShareService;