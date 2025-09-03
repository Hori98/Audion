"""
PromptService - Centralized prompt management with dependency injection
Replaces the hardcoded get_system_message_by_prompt_style function
"""

from typing import Optional
from config.prompt_config import prompt_config, PromptTemplate

class PromptService:
    """Service for managing prompt templates and generation logic"""
    
    def __init__(self):
        self.config = prompt_config
        
        # 後方互換性のためのプリセット名マッピング
        self.preset_mapping = {
            "速報": "ニュース",
            "解説": "学習", 
            "物語": "エンタメ",
            "分析": "レポート",
            "論説": "意見"
        }
    
    def get_system_message(
        self,
        prompt_style: str = "standard",
        custom_prompt: Optional[str] = None,
        voice_language: str = "en-US",
        target_length: Optional[int] = None
    ) -> str:
        """
        Get system message for AI audio generation
        
        Args:
            prompt_style: Style of prompt (standard, recommended, friendly, insightful, strict)
            custom_prompt: Custom prompt to override template
            voice_language: Language code (ja-JP, en-US)
            target_length: Override target length (unused - maintained for API compatibility)
            
        Returns:
            System message string for OpenAI API
        """
        # プリセット名を新方式にマッピング（後方互換性）
        mapped_style = self.preset_mapping.get(prompt_style, prompt_style)
        
        template = self.config.get_template(
            voice_language=voice_language,
            prompt_style=mapped_style,
            custom_prompt=custom_prompt
        )
        
        return template.system_message
    
    def get_template_info(
        self,
        prompt_style: str = "standard",
        voice_language: str = "en-US"
    ) -> PromptTemplate:
        """
        Get complete template information including metadata
        
        Args:
            prompt_style: Style of prompt
            voice_language: Language code
            
        Returns:
            PromptTemplate with system_message, description, target_length, etc.
        """
        return self.config.get_template(voice_language, prompt_style)
    
    def get_available_styles(self, voice_language: str = "en-US") -> list[str]:
        """Get available prompt styles for a language"""
        return self.config.get_available_styles(voice_language)
    
    def get_available_languages(self) -> list[str]:
        """Get available languages"""
        return self.config.get_available_languages()
    
    def validate_style(self, prompt_style: str, voice_language: str = "en-US") -> bool:
        """Check if a prompt style is valid for the given language"""
        available = self.get_available_styles(voice_language)
        return prompt_style in available
    
    def validate_language(self, voice_language: str) -> bool:
        """Check if a language is supported"""
        available = self.get_available_languages()
        return voice_language in available

# Global instance for dependency injection
prompt_service = PromptService()