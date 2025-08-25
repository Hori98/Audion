"""
Dynamic Prompt Service - プロンプト動的文字数指示システム
記事数・内容量・プランに基づいて、AIに最適な文字数を指示するシステム

Core Issue Solution:
- AIプロンプトに動的文字数指示を追加
- 785文字/20記事 → 3000-7000文字の適切な長さに改善
"""

from typing import Dict, List, Optional, Tuple
from config.prompt_config import prompt_service
import logging

class DynamicPromptService:
    """動的プロンプト生成サービス - 文字数指示を含む最適化されたプロンプトを生成"""
    
    def __init__(self):
        self.prompt_service = prompt_service
        
        # 文字数プリセット辞書システム
        self.CHARACTER_COUNT_PRESETS = {
            "ja-JP": {
                "ultra_brief": {
                    "range": "150-300文字",
                    "instruction": "非常に簡潔に、要点のみを150-300文字程度でまとめてください。",
                    "target_per_article": 25,
                    "description": "極限まで短縮（緊急時用）"
                },
                "brief": {
                    "range": "400-800文字", 
                    "instruction": "簡潔に、重要なポイントを400-800文字程度でまとめてください。",
                    "target_per_article": 50,
                    "description": "短縮版（時間制約時）"
                },
                "standard": {
                    "range": "1000-1500文字",
                    "instruction": "適度な詳しさで、1000-1500文字程度の聞きやすい原稿を作成してください。",
                    "target_per_article": 100,
                    "description": "標準版（通勤時間向け）"
                },
                "detailed": {
                    "range": "2000-3500文字",
                    "instruction": "詳しい解説を含めて、2000-3500文字程度の充実した原稿を作成してください。重要な背景情報や文脈も適切に含めてください。",
                    "target_per_article": 200,
                    "description": "詳細版（じっくり聞く用）"
                },
                "comprehensive": {
                    "range": "4000-7000文字",
                    "instruction": "包括的で詳細な解説を含めて、4000-7000文字程度の充実した長い原稿を作成してください。背景情報、関連する文脈、詳細な分析を含め、聞き手が深く理解できるよう丁寧に説明してください。",
                    "target_per_article": 300,
                    "description": "包括版（長時間視聴用）"
                },
                "extensive": {
                    "range": "7000-12000文字",
                    "instruction": "非常に詳細で包括的な解説を含めて、7000-12000文字程度の非常に長い原稿を作成してください。深い背景分析、多角的な視点、詳細な解説を含め、専門的な理解が得られるよう徹底的に説明してください。",
                    "target_per_article": 500,
                    "description": "超詳細版（専門学習用）"
                }
            },
            "en-US": {
                "ultra_brief": {
                    "range": "200-400 words",
                    "instruction": "Please create a very concise script of 200-400 words, focusing only on the key points.",
                    "target_per_article": 35,
                    "description": "Ultra brief for urgent situations"
                },
                "brief": {
                    "range": "500-1000 words",
                    "instruction": "Please create a concise script of 500-1000 words, covering the important points clearly.",
                    "target_per_article": 70,
                    "description": "Brief version for time constraints"
                },
                "standard": {
                    "range": "1200-2000 words",
                    "instruction": "Please create a well-balanced script of 1200-2000 words that is engaging and informative for listeners.",
                    "target_per_article": 130,
                    "description": "Standard version for commute time"
                },
                "detailed": {
                    "range": "2500-4500 words",
                    "instruction": "Please create a detailed script of 2500-4500 words with comprehensive explanations. Include important background information and context to help listeners understand the topics thoroughly.",
                    "target_per_article": 250,
                    "description": "Detailed version for focused listening"
                },
                "comprehensive": {
                    "range": "5000-9000 words", 
                    "instruction": "Please create a comprehensive and detailed script of 5000-9000 words. Include extensive background information, relevant context, detailed analysis, and thorough explanations to provide deep understanding for listeners.",
                    "target_per_article": 400,
                    "description": "Comprehensive version for long-form listening"
                },
                "extensive": {
                    "range": "9000-15000 words",
                    "instruction": "Please create an extensive and highly detailed script of 9000-15000 words. Include deep background analysis, multiple perspectives, detailed explanations, and professional-level insights to provide comprehensive understanding.",
                    "target_per_article": 650,
                    "description": "Extensive version for professional learning"
                }
            }
        }
    
    def determine_optimal_preset(
        self,
        article_count: int,
        total_content_chars: int,
        user_plan: str,
        voice_language: str = "ja-JP"
    ) -> str:
        """
        記事数・内容量・プランに基づいて最適な文字数プリセットを決定
        
        Args:
            article_count: 記事数
            total_content_chars: 記事内容の合計文字数
            user_plan: ユーザープラン (free, basic, premium)
            voice_language: 音声言語
            
        Returns:
            最適なプリセット名 (ultra_brief, brief, standard, detailed, comprehensive, extensive)
        """
        
        # プラン別基本ポリシー
        plan_policies = {
            "free": {"max_preset": "brief", "bias": -1},      # 短めに制限
            "basic": {"max_preset": "standard", "bias": 0},   # 標準的
            "premium": {"max_preset": "extensive", "bias": 1} # 長めに寄せる
        }
        
        policy = plan_policies.get(user_plan, plan_policies["free"])
        
        # 記事数ベースの基本判定
        if article_count <= 2:
            base_preset = "brief"
        elif article_count <= 5:
            base_preset = "standard"  
        elif article_count <= 10:
            base_preset = "detailed"
        elif article_count <= 20:
            base_preset = "comprehensive"
        else:
            base_preset = "extensive"
        
        # 内容量による調整（1記事あたりの平均文字数）
        avg_chars_per_article = total_content_chars / article_count if article_count > 0 else 0
        
        content_adjustment = 0
        if avg_chars_per_article < 200:    # 短い記事
            content_adjustment = -1
        elif avg_chars_per_article < 500:  # 通常記事
            content_adjustment = 0
        elif avg_chars_per_article < 1000: # 長い記事
            content_adjustment = 1
        else:                              # 非常に長い記事
            content_adjustment = 2
        
        # プリセットレベル計算
        preset_levels = ["ultra_brief", "brief", "standard", "detailed", "comprehensive", "extensive"]
        base_level = preset_levels.index(base_preset)
        
        # 調整を適用
        adjusted_level = base_level + policy["bias"] + content_adjustment
        adjusted_level = max(0, min(adjusted_level, len(preset_levels) - 1))
        
        # プラン制限を適用
        max_level = preset_levels.index(policy["max_preset"])
        final_level = min(adjusted_level, max_level)
        
        final_preset = preset_levels[final_level]
        
        logging.info(f"📏 DYNAMIC PROMPT: Articles={article_count}, Content={total_content_chars}chars, Plan={user_plan}")
        logging.info(f"📏 DYNAMIC PROMPT: Base={base_preset}→Adjusted={preset_levels[adjusted_level]}→Final={final_preset}")
        
        return final_preset
    
    def get_character_count_instruction(
        self,
        preset_name: str,
        article_count: int,
        voice_language: str = "ja-JP"
    ) -> str:
        """
        指定されたプリセットの文字数指示文を取得
        
        Args:
            preset_name: プリセット名
            article_count: 記事数（個別指示用）
            voice_language: 音声言語
            
        Returns:
            文字数指示文
        """
        language_presets = self.CHARACTER_COUNT_PRESETS.get(voice_language, self.CHARACTER_COUNT_PRESETS["en-US"])
        preset = language_presets.get(preset_name, language_presets["standard"])
        
        base_instruction = preset["instruction"]
        
        # 記事数に応じた個別指示を追加
        if article_count > 1:
            if voice_language == "ja-JP":
                individual_instruction = f"\n\n各記事について平均{preset['target_per_article']}文字程度を目安に、全体で{preset['range']}の原稿を作成してください。"
            else:
                individual_instruction = f"\n\nAim for approximately {preset['target_per_article']} words per article on average, creating a total script of {preset['range']}."
        else:
            individual_instruction = ""
        
        return base_instruction + individual_instruction
    
    def generate_enhanced_prompt(
        self,
        base_prompt_style: str,
        custom_prompt: Optional[str],
        voice_language: str,
        article_count: int,
        total_content_chars: int,
        user_plan: str
    ) -> Tuple[str, Dict]:
        """
        動的文字数指示を含む強化されたプロンプトを生成
        
        Args:
            base_prompt_style: 基本プロンプトスタイル
            custom_prompt: カスタムプロンプト
            voice_language: 音声言語
            article_count: 記事数
            total_content_chars: 総文字数
            user_plan: ユーザープラン
            
        Returns:
            (enhanced_prompt, metadata)
        """
        
        # 1. 基本プロンプトを取得
        base_prompt = self.prompt_service.get_system_message(
            prompt_style=base_prompt_style,
            custom_prompt=custom_prompt,
            voice_language=voice_language
        )
        
        # 2. 最適なプリセットを決定
        optimal_preset = self.determine_optimal_preset(
            article_count=article_count,
            total_content_chars=total_content_chars,
            user_plan=user_plan,
            voice_language=voice_language
        )
        
        # 3. 文字数指示を生成
        length_instruction = self.get_character_count_instruction(
            preset_name=optimal_preset,
            article_count=article_count,
            voice_language=voice_language
        )
        
        # 4. プロンプトを結合
        if voice_language == "ja-JP":
            separator = "\n\n【重要】文字数に関する指示:"
        else:
            separator = "\n\n【IMPORTANT】Character count requirements:"
        
        enhanced_prompt = base_prompt + separator + "\n" + length_instruction
        
        # 5. メタデータを準備
        preset_info = self.CHARACTER_COUNT_PRESETS[voice_language][optimal_preset]
        metadata = {
            "optimal_preset": optimal_preset,
            "target_range": preset_info["range"],
            "target_per_article": preset_info["target_per_article"],
            "expected_total_chars": preset_info["target_per_article"] * article_count,
            "description": preset_info["description"],
            "article_count": article_count,
            "total_content_chars": total_content_chars,
            "user_plan": user_plan,
            "voice_language": voice_language
        }
        
        logging.info(f"🚀 ENHANCED PROMPT: Using {optimal_preset} preset for {article_count} articles")
        logging.info(f"🚀 ENHANCED PROMPT: Expected output {preset_info['range']} ({preset_info['target_per_article']}*{article_count})")
        
        return enhanced_prompt, metadata
    
    def get_preset_info(self, preset_name: str, voice_language: str = "ja-JP") -> Dict:
        """プリセット情報を取得"""
        language_presets = self.CHARACTER_COUNT_PRESETS.get(voice_language, self.CHARACTER_COUNT_PRESETS["en-US"])
        return language_presets.get(preset_name, language_presets["standard"])
    
    def get_available_presets(self, voice_language: str = "ja-JP") -> List[str]:
        """利用可能なプリセット一覧を取得"""
        language_presets = self.CHARACTER_COUNT_PRESETS.get(voice_language, self.CHARACTER_COUNT_PRESETS["en-US"])
        return list(language_presets.keys())

# グローバルインスタンス
dynamic_prompt_service = DynamicPromptService()