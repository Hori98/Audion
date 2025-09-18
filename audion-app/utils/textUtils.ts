/**
 * Text Utilities
 * テキスト処理関連のユーティリティ関数
 */

/**
 * 文字列からXML/HTMLタグを除去します
 * TTS読み上げでタグが読まれないようにするために使用
 * @param text タグを含む可能性のある文字列
 * @returns タグが除去された文字列
 */
export const stripXmlTags = (text: string): string => {
  if (typeof text !== 'string' || !text) {
    return '';
  }
  
  // /<[^>]*>/g は、'<'、'任意の文字(0回以上)'、'>' にマッチする部分を
  // グローバル(g)に検索して空文字に置換する正規表現
  return text.replace(/<[^>]*>/g, '');
};

/**
 * XMLタグのみを除去し、改行と段落構造を保持します
 * より自然な読み上げのために改行を適切にスペースに変換
 * @param text タグを含む可能性のある文字列
 * @returns タグが除去され、改行が整理された文字列
 */
export const stripXmlTagsPreserveStructure = (text: string): string => {
  if (typeof text !== 'string' || !text) {
    return '';
  }
  
  return text
    // XMLタグを除去
    .replace(/<[^>]*>/g, '')
    // 複数の改行を単一のスペースに変換
    .replace(/\n+/g, ' ')
    // 複数のスペースを単一のスペースに変換
    .replace(/\s+/g, ' ')
    // 先頭と末尾の空白を除去
    .trim();
};

/**
 * DOMParserを使ってXMLから自然言語テキストのみを安全に抽出
 * バックエンドと同じロジックでTTSと表示の整合性を保つ
 * @param xmlString audion_script XMLタグで囲まれた文字列
 * @returns script部分のクリーンな自然言語テキスト
 */
export const getCleanScriptText = (xmlString: string): string => {
  if (typeof xmlString !== 'string' || !xmlString) {
    return '';
  }

  try {
    // DOMParserを使って安全にXMLをパース
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    
    // パースエラーをチェック
    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      console.warn('XML parse error, falling back to regex:', parserError.textContent);
      return extractScriptWithRegex(xmlString);
    }
    
    const scriptNode = xmlDoc.querySelector("script");
    if (scriptNode) {
      // textContentプロパティで全ての子孫ノードのテキストを取得
      // これにより<break>や<emphasis>のようなタグは無視される
      const cleanText = scriptNode.textContent || '';
      return cleanAndFormatText(cleanText);
    }
    
    // <script>タグが見つからない場合は、全体からタグを除去
    return extractScriptWithRegex(xmlString);
    
  } catch (error) {
    console.error('Error parsing XML:', error);
    return extractScriptWithRegex(xmlString);
  }
};

/**
 * 正規表現を使ったフォールバック処理
 * DOMParserが使用できない環境やエラー時に使用
 * @param xmlString XML文字列
 * @returns クリーンなテキスト
 */
const extractScriptWithRegex = (xmlString: string): string => {
  // <script>タグ内のコンテンツを抽出
  const scriptMatch = xmlString.match(/<script>([\s\S]*?)<\/script>/i);
  if (scriptMatch && scriptMatch[1]) {
    return cleanAndFormatText(stripXmlTags(scriptMatch[1]));
  }
  
  // <script>タグが見つからない場合は、全体からタグを除去
  return cleanAndFormatText(stripXmlTags(xmlString));
};

/**
 * テキストをクリーンアップして読みやすい形式に整形
 * @param text 生のテキスト
 * @returns 整形されたテキスト
 */
const cleanAndFormatText = (text: string): string => {
  return text
    // 複数の改行を単一のスペースに変換
    .replace(/\n+/g, ' ')
    // 複数のスペースを単一のスペースに変換
    .replace(/\s+/g, ' ')
    // 先頭と末尾の空白を除去
    .trim();
};

/**
 * 後方互換性のためのエイリアス関数
 * 既存のコードで使用されている関数名を維持
 * @param audionScript audion_script XMLタグで囲まれた文字列
 * @returns script部分のみのクリーンなテキスト
 */
export const extractScriptFromAudionXml = (audionScript: string): string => {
  return getCleanScriptText(audionScript);
};

/**
 * テキストの長さを制限し、必要に応じて省略記号を追加します
 * @param text 対象のテキスト
 * @param maxLength 最大長（デフォルト: 100）
 * @param ellipsis 省略記号（デフォルト: '...'）
 * @returns 長さが制限されたテキスト
 */
export const truncateText = (text: string, maxLength: number = 100, ellipsis: string = '...'): string => {
  if (typeof text !== 'string' || !text) {
    return '';
  }
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
};