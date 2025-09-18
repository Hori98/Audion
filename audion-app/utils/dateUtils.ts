/**
 * 日付ユーティリティ関数
 */

export const formatTimeAgo = (dateString: string | null | undefined): string => {
  if (!dateString) return '時刻不明';
  
  // デバッグ: 日付文字列をログ出力
  console.log('formatTimeAgo - Date string received:', dateString, 'Type:', typeof dateString);
  
  const now = new Date();
  const publishedDate = new Date(dateString);
  
  // 不正な日付の場合のフォールバック
  if (isNaN(publishedDate.getTime())) {
    console.warn('formatTimeAgo - Invalid date string:', dateString, 'Parsed as:', publishedDate);
    return '時刻不明';
  }
  
  const diffInMs = now.getTime() - publishedDate.getTime();
  
  // 未来の日付の場合
  if (diffInMs < 0) {
    return '配信予定';
  }
  
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInHours < 1) return '数分前';
  if (diffInHours < 24) return `${diffInHours}時間前`;
  if (diffInDays < 30) return `${diffInDays}日前`;
  
  // 30日以上前は月単位で表示
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths}ヶ月前`;
};

export const isValidDate = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};