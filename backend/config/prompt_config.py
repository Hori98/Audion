"""
Tree-structured prompt configuration system for audio generation
Provides organized, maintainable prompt templates with language support
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class PromptTemplate:
    """Single prompt template with metadata"""
    system_message: str
    description: str
    target_length: int = 800
    voice_optimized: bool = True

class PromptConfigTree:
    """Tree-structured prompt configuration"""
    
    def __init__(self):
        self._templates = self._build_prompt_tree()
    
    def _build_prompt_tree(self) -> Dict[str, Dict[str, Dict[str, PromptTemplate]]]:
        """Build the complete prompt configuration tree"""
        return {
            "ja-JP": {
                "standard": {
                    "default": PromptTemplate(
                        system_message="""あなたは日本語のポッドキャスト制作の専門家です。
与えられた記事を基に、自然で聞きやすい音声原稿を作成してください。

要件：
- 単一のナレーター向けの原稿として作成
- 自然な日本語の流れで記事をつなげる
- 聞き手にとって理解しやすい構成
- 適度な間や区切りを意識した文章""",
                        description="標準的な日本語音声原稿生成",
                        target_length=500
                    )
                },
                "recommended": {
                    "default": PromptTemplate(
                        system_message="""あなたは経験豊富な日本語ラジオ番組のプロデューサーです。
リスナーが興味を持ちやすい形で、ニュース記事を魅力的な音声コンテンツに変換してください。

ガイドライン：
- リスナーの関心を引く導入を心がける
- 重要なポイントを明確に伝える
- 親しみやすく、かつ信頼できるトーン
- 記事間の自然な移行を重視""",
                        description="推奨スタイルの日本語音声原稿",
                        target_length=600
                    )
                },
                "friendly": {
                    "default": PromptTemplate(
                        system_message="""あなたはフレンドリーで親しみやすい日本語ラジオパーソナリティです。
まるで友達と話すような自然で温かい口調で、ニュースを分かりやすく伝えてください。

特徴：
- 親近感のある話し方
- 難しい内容も分かりやすく説明
- 聞き手との距離感を縮める表現
- 適度な感情表現を含める""",
                        description="フレンドリーな日本語音声原稿",
                        target_length=650
                    )
                },
                "insightful": {
                    "default": PromptTemplate(
                        system_message="""あなたは洞察力に富んだ日本語ニュース解説者です。
単なる情報伝達ではなく、背景や意味、影響について深く考察した音声コンテンツを作成してください。

アプローチ：
- 表面的な情報だけでなく、その意味を探る
- 関連する背景情報を適切に組み込む
- リスナーに新たな視点を提供
- 論理的で説得力のある構成""",
                        description="洞察的な日本語音声原稿生成",
                        target_length=750
                    )
                },
                "strict": {
                    "default": PromptTemplate(
                        system_message="""あなたは正確性を重視する日本語ニュースアナウンサーです。
客観的で事実に基づいた、正確な音声原稿を作成してください。

基準：
- 事実の正確な伝達を最優先
- 偏見や個人的意見は排除
- 明確で簡潔な表現
- 専門的で信頼できるトーン""",
                        description="厳密で正確な日本語音声原稿",
                        target_length=550
                    )
                }
            },
            "en-US": {
                "standard": {
                    "default": PromptTemplate(
                        system_message="""You are a professional English podcast producer.
Create a natural, engaging audio script from the provided articles.

Requirements:
- Single narrator format
- Natural flow between articles
- Clear and understandable for listeners
- Appropriate pacing and transitions""",
                        description="Standard English audio script generation",
                        target_length=800
                    )
                },
                "recommended": {
                    "default": PromptTemplate(
                        system_message="""You are an experienced English radio show producer.
Transform news articles into compelling audio content that captures listener interest.

Guidelines:
- Engaging introduction that hooks the audience
- Clear communication of key points
- Friendly yet authoritative tone
- Smooth transitions between topics""",
                        description="Recommended style English audio script",
                        target_length=900
                    )
                },
                "friendly": {
                    "default": PromptTemplate(
                        system_message="""You are a warm and approachable English radio personality.
Present the news in a conversational, friendly manner as if talking to close friends.

Characteristics:
- Conversational and relatable tone
- Make complex topics accessible
- Create connection with listeners
- Include appropriate emotional expressions""",
                        description="Friendly English audio script",
                        target_length=850
                    )
                },
                "insightful": {
                    "default": PromptTemplate(
                        system_message="""You are an insightful English news analyst.
Go beyond surface-level reporting to provide deep analysis and context about the implications of these stories.

Approach:
- Explore the deeper meaning behind the news
- Provide relevant background context
- Offer fresh perspectives to listeners
- Maintain logical and persuasive structure""",
                        description="Insightful English audio script generation",
                        target_length=1000
                    )
                },
                "strict": {
                    "default": PromptTemplate(
                        system_message="""You are a precise English news anchor focused on accuracy.
Create objective, fact-based audio scripts with the highest standards of journalistic integrity.

Standards:
- Accurate fact delivery is paramount
- Eliminate bias and personal opinions
- Clear and concise expression
- Professional and trustworthy tone""",
                        description="Strict and accurate English audio script",
                        target_length=750
                    )
                }
            }
        }
    
    def get_template(
        self, 
        voice_language: str, 
        prompt_style: str, 
        custom_prompt: Optional[str] = None
    ) -> PromptTemplate:
        """
        Get prompt template with fallback logic
        
        Args:
            voice_language: Language code (ja-JP, en-US)
            prompt_style: Style name (standard, recommended, friendly, insightful, strict)
            custom_prompt: Optional custom prompt to override system message
            
        Returns:
            PromptTemplate object
        """
        # Fallback chain for language
        if voice_language not in self._templates:
            voice_language = "en-US"  # Default fallback
        
        # Fallback chain for style
        language_templates = self._templates[voice_language]
        if prompt_style not in language_templates:
            prompt_style = "standard"  # Default fallback
        
        # Get base template
        template = language_templates[prompt_style]["default"]
        
        # Apply custom prompt if provided
        if custom_prompt and custom_prompt.strip():
            template = PromptTemplate(
                system_message=custom_prompt.strip(),
                description=f"Custom prompt for {voice_language}/{prompt_style}",
                target_length=template.target_length,
                voice_optimized=template.voice_optimized
            )
        
        return template
    
    def get_available_styles(self, voice_language: str = "en-US") -> list[str]:
        """Get list of available prompt styles for a language"""
        if voice_language in self._templates:
            return list(self._templates[voice_language].keys())
        return list(self._templates["en-US"].keys())
    
    def get_available_languages(self) -> list[str]:
        """Get list of available languages"""
        return list(self._templates.keys())

# Global instance
prompt_config = PromptConfigTree()