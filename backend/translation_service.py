"""
Translation Service for Farmi App
Supports multiple Indian languages using free translation
"""
from googletrans import Translator
import logging

# Initialize translator
translator = Translator()

# Supported languages
SUPPORTED_LANGUAGES = {
    'en': 'English',
    'hi': 'हिंदी (Hindi)',
    'ta': 'தமிழ் (Tamil)',
    'te': 'తెలుగు (Telugu)',
    'kn': 'ಕನ್ನಡ (Kannada)',
    'ml': 'മലയാളം (Malayalam)',
    'mr': 'मराठी (Marathi)',
    'bn': 'বাংলা (Bengali)',
    'gu': 'ગુજરાતી (Gujarati)',
    'pa': 'ਪੰਜਾਬੀ (Punjabi)'
}

def translate_text(text: str, target_lang: str = 'en', source_lang: str = 'auto') -> str:
    """
    Translate text to target language
    
    Args:
        text: Text to translate
        target_lang: Target language code (e.g., 'hi', 'ta')
        source_lang: Source language code ('auto' for auto-detect)
    
    Returns:
        Translated text
    """
    try:
        if target_lang == source_lang or target_lang == 'en' and source_lang == 'en':
            return text
        
        result = translator.translate(text, dest=target_lang, src=source_lang)
        return result.text
    except Exception as e:
        logging.error(f"Translation error: {e}")
        return text  # Return original text if translation fails

def detect_language(text: str) -> str:
    """
    Detect language of text
    
    Args:
        text: Text to detect language
    
    Returns:
        Language code (e.g., 'en', 'hi')
    """
    try:
        result = translator.detect(text)
        return result.lang
    except Exception as e:
        logging.error(f"Language detection error: {e}")
        return 'en'  # Default to English

def get_supported_languages():
    """Get list of supported languages"""
    return SUPPORTED_LANGUAGES
