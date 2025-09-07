"""
Text processing utilities for XML content extraction.
"""

import xml.etree.ElementTree as ET
import re
import logging


def extract_clean_script_text(xml_string: str) -> str:
    """
    audion_script XMLから自然言語テキストのみを安全に抽出します。
    
    DOMParserと同等の処理をPythonのElementTreeで実装し、
    フロントエンドのgetCleanScriptText関数と同じ結果を返します。
    
    Args:
        xml_string: audion_script XMLタグで囲まれた文字列
        
    Returns:
        str: script部分のみのクリーンな自然言語テキスト
    """
    if not isinstance(xml_string, str) or not xml_string.strip():
        return ""
    
    try:
        # XMLをパースしてルート要素を取得
        root = ET.fromstring(xml_string)
        
        # <script>タグを検索（子孫要素も含む）
        script_element = root.find('.//script')
        
        if script_element is not None:
            # itertext()を使って要素内のすべてのテキストノードを結合
            # ネストされたタグ内のテキストもすべて取得される
            clean_text = "".join(script_element.itertext())
            return _clean_and_format_text(clean_text)
        else:
            # <script>タグが見つからない場合は正規表現でフォールバック
            logging.warning(f"No <script> tag found in XML, falling back to regex extraction")
            return _extract_script_with_regex(xml_string)
            
    except ET.ParseError as e:
        # XMLパースに失敗した場合
        logging.warning(f"XML parse error: {e}, falling back to regex extraction")
        return _extract_script_with_regex(xml_string)
    except Exception as e:
        # その他のエラー
        logging.error(f"Unexpected error in extract_clean_script_text: {e}")
        return _extract_script_with_regex(xml_string)


def _extract_script_with_regex(xml_string: str) -> str:
    """
    正規表現を使ったフォールバック処理。
    DOMParserが使用できない場合やエラー時に使用。
    
    Args:
        xml_string: XML文字列
        
    Returns:
        str: クリーンなテキスト
    """
    try:
        # <script>タグ内のコンテンツを抽出
        script_match = re.search(r'<script>([\s\S]*?)</script>', xml_string, re.IGNORECASE)
        if script_match:
            script_content = script_match.group(1)
            # XMLタグを除去
            clean_text = re.sub(r'<[^>]*>', '', script_content)
            return _clean_and_format_text(clean_text)
        
        # <script>タグが見つからない場合は、全体からタグを除去
        clean_text = re.sub(r'<[^>]*>', '', xml_string)
        return _clean_and_format_text(clean_text)
        
    except Exception as e:
        logging.error(f"Error in regex fallback: {e}")
        return ""


def _clean_and_format_text(text: str) -> str:
    """
    テキストをクリーンアップして読みやすい形式に整形。
    フロントエンドのcleanAndFormatText関数と同等の処理。
    
    Args:
        text: 生のテキスト
        
    Returns:
        str: 整形されたテキスト
    """
    if not text:
        return ""
    
    return (re.sub(r'\s+', ' ', text.replace('\n', ' ')).strip())


def strip_xml_tags(text: str) -> str:
    """
    文字列からXML/HTMLタグを除去します。
    フロントエンドのstripXmlTags関数と同等の処理。
    
    Args:
        text: タグを含む可能性のある文字列
        
    Returns:
        str: タグが除去された文字列
    """
    if not isinstance(text, str) or not text:
        return ""
    
    # /<[^>]*>/g に相当する処理
    return re.sub(r'<[^>]*>', '', text)


def strip_xml_tags_preserve_structure(text: str) -> str:
    """
    XMLタグのみを除去し、改行と段落構造を保持します。
    フロントエンドのstripXmlTagsPreserveStructure関数と同等の処理。
    
    Args:
        text: タグを含む可能性のある文字列
        
    Returns:
        str: タグが除去され、改行が整理された文字列
    """
    if not isinstance(text, str) or not text:
        return ""
    
    # XMLタグを除去
    text = re.sub(r'<[^>]*>', '', text)
    # 複数の改行を単一のスペースに変換
    text = re.sub(r'\n+', ' ', text)
    # 複数のスペースを単一のスペースに変換
    text = re.sub(r'\s+', ' ', text)
    # 先頭と末尾の空白を除去
    return text.strip()


# 後方互換性のためのエイリアス関数
def extract_script_from_audion_xml(audion_script: str) -> str:
    """
    後方互換性のためのエイリアス関数。
    既存のコードで使用されている関数名を維持。
    
    Args:
        audion_script: audion_script XMLタグで囲まれた文字列
        
    Returns:
        str: script部分のみのクリーンなテキスト
    """
    return extract_clean_script_text(audion_script)