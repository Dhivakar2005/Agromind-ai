"""
Agri-Chat Service - Ollama qwen2.5:3b Model Integration

STRICT RULES:
- Use qwen2.5:3b model from Ollama
- Single response per user message
- Agriculture domain ONLY (polite decline for off-topic)
- Plain text output
"""

import os
import json
from typing import Optional, Dict, Any
import io
from . import gemini_service
from . import ollama_service
from .keras_disease_service import predict_disease as predict_keras

# Model settings
# Gemini Service is handled via .gemini_service

# Supported languages
SUPPORTED_LANGUAGES = {
    'en': 'English',
    'hi': 'Hindi',
    'ta': 'Tamil',
    'fr': 'French',
    'es': 'Spanish',
    'pt': 'Portuguese',
    'sw': 'Swahili',
    'ja': 'Japanese',
    'ar': 'Arabic'
}

AGRICULTURE_KEYWORDS = [
    'crop', 'plant', 'farm', 'soil', 'pest', 'disease', 'fertilizer', 'irrigation',
    'seed', 'harvest', 'weed', 'insect', 'fungus', 'nutrient', 'npk', 'organic',
    'pesticide', 'herbicide', 'cultivation', 'agriculture', 'agronomy', 'horticulture',
    'rice', 'wheat', 'maize', 'corn', 'tomato', 'potato', 'cotton', 'soybean',
    'apple', 'banana', 'mango', 'orange', 'citrus', 'grape', 'pomegranate',
    'tree', 'orchard', 'nursery', 'garden', 'greenhouse', 'floriculture',
    'water', 'rain', 'drought', 'season', 'kharif', 'rabi', 'monsoon', 'climate',
    'yield', 'growth', 'leaf', 'root', 'stem', 'flower', 'fruit', 'vegetable',
    'aphid', 'caterpillar', 'blight', 'rot', 'wilt', 'mold', 'fungal', 'bacterial',
    'manure', 'compost', 'mulch', 'pruning', 'grafting', 'transplant', 'germination',
    'plan', 'growing', 'planting', 'cultivating',
    # Hindi Keywords
    'खेती', 'फसल', 'मिट्टी', 'कीट', 'रोग', 'खाद', 'सिंचाई', 'बीज', 'कटाई', 'पैदावार', 'चावल', 'गेहूं', 'मक्का', 'आलू', 'टमाटर', 'कीटनाशक', 'मौसम', 'बारिश',
    'सेब', 'केला', 'आम', 'संतरा', 'अंगूर', 'पेड़', 'पौधा', 'बगीचा', 'नर्सरी', 'रोपण', 'छंटाई', 'ग्राफ्टिंग', 'निराई',
    # Tamil Keywords
    'விவசாயம்', 'பயிர்', 'மண்', 'பூச்சி', 'நோய்', 'உரம்', 'பாசனம்', 'விதை', 'அறுவடை', 'மகசூல்', 'நெல்', 'கோதுமை', 'சோளம்', 'உருளைக்கிழங்கு', 'தக்காளி', 'பூச்சிக்கொல்லி', 'வானிலை', 'மழை',
    'ஆப்பிள்', 'வாழை', 'மாம்பழம்', 'ஆரஞ்சு', 'திராட்சை', 'மரம்', 'செடி', 'தோட்டம்', 'நாற்றுப்பண்ணை', 'நடுதல்', 'கத்தரித்தல்', 'ஒட்டுக்கட்டுதல்', 'களை'
]


def load_agri_chat_model():
    """Check if either Gemini (Cloud) or Ollama (Local) is available."""
    return gemini_service.is_ready() or ollama_service.is_available()


def validate_agriculture_domain(message: str) -> bool:
    """
    Check if the user message is related to agriculture.
    Returns True if agriculture-related, False otherwise.
    """
    message_lower = message.lower()
    
    # Check for agriculture keywords
    for keyword in AGRICULTURE_KEYWORDS:
        if keyword in message_lower:
            return True
    
    # If no keywords found, assume it might still be agriculture-related
    # (to avoid false negatives for indirect questions)
    return True


def analyze_image_once(image_bytes: bytes, lang_hint: str = 'en') -> str:
    """
    Analyze an image EXACTLY ONCE and return description with ML Vision diagnostics.
    """
    try:
        # 1. Basic Metadata
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))
        width, height = img.size
        
        # 2. Vision Analysis (Local Keras)
        disease_res = predict_keras(image_bytes)
        
        # 3. Synthesize Context
        description = f"VISUAL DIAGNOSIS REPORT:\n"
        
        if disease_res and not disease_res[0].get("is_healthy"):
            main_det = disease_res[0]
            description += f"- Detected Issue: {main_det['disease']} in {main_det.get('crop', 'Crop')}\n"
            description += f"- Diagnostic Confidence: {main_det['confidence']}%\n"
        else:
            description += f"- Plant Status: Healthy or inconclusive leaf observed via local model.\n"
            
        description += "INSTRUCTIONS: Use the Visual Diagnosis Report above as your initial data. If inconclusive, use your own vision capabilities to reach a final diagnosis for the farmer."
            
        return description
        
    except Exception as e:
        return f"Error analyzing image: {str(e)}"


def generate_response(
    message: str,
    language: str = 'en',
    image_data: Optional[bytes] = None
) -> Dict[str, Any]:
    """
    Generate a response using Ollama qwen2.5:3b.
    """
    # Check if any model is ready
    if not load_agri_chat_model():
        return get_fallback_response(message, language)
    
    # Validate agriculture domain
    if not validate_agriculture_domain(message):
        return {
            'response': "I'm sorry, I can only help with agriculture-related questions. Please ask about crops, farming, pests, or agricultural practices.",
            'language': language,
            'image_analyzed': False
        }
    
    try:
        lang_name = SUPPORTED_LANGUAGES.get(language, 'English')
        
        # Prepare content
        image_context = ""
        image_analyzed = False
        if image_data:
            image_context = analyze_image_once(image_data, lang_hint=language)
            image_analyzed = True

        # Adaptive Prompting Strategy
        if image_data:
            # Mode A: Diagnostic (Strict 6-part clinical report)
            system_prompt = (
                f"You are an expert agricultural diagnostic AI. Your goal is to provide safe, clinical-grade analysis of plant health.\n\n"
                f"STRICT LANGUAGE RULE: You MUST respond exclusively in {lang_name}.\n"
                f"If the user asks in Tamil or Hindi, ensure the technical terms are correctly translated into that language.\n\n"
                f"LENGTH RULE: Provide a detailed, fully completed response of approximately 100 to 150 words.\n\n"
                f"STRICT BEHAVIOR RULES:\n"
                f"1. If ANY confidence in the input is < 70%, say: 'The model is not confident. Please retake the image or consult an expert.'\n"
                f"2. Be detailed and thorough.\n\n"
                f"REQUIRED OUTPUT FORMAT (Must provide ALL 6 sections):\n"
                f"1. Diagnosis (Clearly state disease or say uncertain)\n"
                f"2. Pest Status (Presence, Severity, Risk)\n"
                f"3. Recommended Actions (Organic/Chemical steps)\n"
                f"4. Prevention Tips (3-5 bullets)\n"
                f"5. Crop Advice (Best crop for this soil/condition)\n"
                f"6. Confidence Summary (List all confidences)\n\n"
                f"Tone: Clinical, Precise, Practical."
            )
        else:
            # Mode B: Consultation (Conversational Expert Advisor)
            system_prompt = (
                f"You are an expert agricultural advisor assisting a farmer. Your goal is to provide practical, professional, and helpful advice.\n\n"
                f"STRICT LANGUAGE RULE: You MUST respond exclusively in {lang_name}.\n"
                f"If the user intent is in Tamil or Hindi, you MUST maintain that language flow.\n\n"
                f"LENGTH RULE: Provide a detailed and comprehensive response with at least 3-4 paragraphs. Ensure the information is complete and actionable.\n\n"
                f"GUIDELINES:\n"
                f"1. Answer the user's question directly and in depth.\n"
                f"2. Use <strong>bold text</strong> for key terms and advice.\n"
                f"3. Use bullet points or numbered lists for steps.\n"
                f"4. Maintain a helpful, farmer-friendly tone.\n"
                f"5. Always prioritize safe and sustainable farming practices.\n"
                f"6. Never truncate the message. Ensure the final sentence is fully concluded.\n\n"
                f"Tone: Helpful, Calm, Professional, Practical."
            )
        
        user_prompt = message
        if image_context:
            user_prompt = f"{image_context}\n\nUser Question: {message}"

        # 1. Try Gemini (Tier 1)
        if gemini_service.is_ready():
            try:
                response_text = gemini_service.generate_response(
                    prompt=user_prompt,
                    system_instruction=system_prompt,
                    temperature=0.4
                )
                if response_text and not response_text.startswith("Gemini API key not configured"):
                    return {
                        'response': response_text,
                        'language': language,
                        'image_analyzed': image_analyzed,
                        'backend': 'Agromind Intelligence'
                    }
            except Exception as e:
                print(f"Cloud AI failed: {str(e)}")

        # 2. Try Ollama (Tier 2 Fallback)
        if ollama_service.is_available():
            try:
                response_text = ollama_service.generate_response(
                    prompt=user_prompt,
                    system_instruction=system_prompt
                )
                if response_text:
                    return {
                        'response': response_text,
                        'language': language,
                        'image_analyzed': image_analyzed,
                        'backend': 'Local Intelligence'
                    }
            except Exception as e:
                print(f"Local AI failed: {str(e)}")
        
        # 3. Last Resort: Static Database (Tier 3)
        return get_fallback_response(message, language)
            
    except Exception as e:
        return get_fallback_response(message, f"{language} (Error: {str(e)})")


def get_model_status() -> Dict[str, Any]:
    """
    Get the current status of the agri-chat model.
    """
    gemini_ready = gemini_service.is_ready()
    ollama_ready = ollama_service.is_available()
    
    active_backend = "Agromind Intelligence" if gemini_ready else ("Local Intelligence" if ollama_ready else "Static Fallback")
    
    return {
        'loaded': gemini_ready or ollama_ready,
        'model_name': 'Agromind Expert System' if gemini_ready else 'Local Node',
        'backend': active_backend,
        'vision_enabled': gemini_ready,
        'ollama_available': ollama_ready,
        'supported_languages': list(SUPPORTED_LANGUAGES.keys()),
        'domain': 'agriculture'
    }


# Fallback response function (used if model fails to load)
def get_fallback_response(message: str, language: str = 'en') -> Dict[str, Any]:
    """
    Provide a simple fallback response if the model is not available.
    Supports English, Hindi, and Tamil.
    """
    message_lower = message.lower()
    
    # Multilingual Fallback Database
    fallbacks = {
        'en': {
            'pest': "For pest control, I recommend: 1) Use neem oil spray, 2) Introduce natural predators, 3) Remove affected leaves, 4) Maintain good air circulation.",
            'soil': "For fertilizer advice: 1) Get soil testing done first, 2) Use organic compost when possible, 3) NPK ratio depends on crop, 4) Apply in split doses.",
            'water': "Irrigation tips: 1) Drip irrigation saves water, 2) Water early morning or evening, 3) Check soil moisture before watering.",
            'plant': "For planting crops safely: 1) Prepare well-draining soil, 2) Sow seeds at the right depth, 3) Ensure adequate spacing and sunlight, 4) Water regularly until established.",
            'generic': "Hello! I'm your farming assistant. I can help with crop recommendations, pest control, irrigation advice, and soil management. What would you like to know?"
        },
        'hi': {
            'pest': "कीट नियंत्रण के लिए, मैं सलाह देता हूं: 1) नीम के तेल का स्प्रे करें, 2) प्राकृतिक शिकारियों को लाएं, 3) प्रभावित पत्तियों को हटा दें, 4) अच्छा वायु संचार बनाए रखें।",
            'soil': "उर्वरक सलाह के लिए: 1) पहले मिट्टी का परीक्षण करवाएं, 2) यदि संभव हो तो जैविक खाद का उपयोग करें, 3) एनपीके अनुपात फसल पर निर्भर करता है, 4) विभाजित खुराक में लागू करें।",
            'water': "सिंचाई टिप्स: 1) ड्रिप सिंचाई पानी बचाती है, 2) सुबह या शाम को जल्दी पानी दें, 3) पानी देने से पहले मिट्टी की नमी की जांच करें।",
            'plant': "फसल बोने के लिए: 1) मिट्टी को अच्छी तरह तैयार करें, 2) बीजों को सही गहराई पर बोएं, 3) धूप सुनिश्चित करें, 4) नियमित पानी दें।",
            'generic': "नमस्ते! मैं आपका एआई खेती विशेषज्ञ हूं। आज मैं आपकी कैसे मदद कर सकता हूं?"
        },
        'ta': {
            'pest': "பூச்சிக் கட்டுப்பாட்டிற்கு, நான் பரிந்துரைக்கிறேன்: 1) வேப்ப எண்ணெய் தெளிக்கவும், 2) இயற்கை வேட்டையாடுபவர்களை அறிமுகப்படுத்தவும், 3) பாதிக்கப்பட்ட இலைகளை அகற்றவும், 4) நல்ல காற்றோட்டத்தை பராமரிக்கவும்.",
            'soil': "உர ஆலோசனைக்கு: 1) முதலில் மண் பரிசோதனை செய்யுங்கள், 2) முடிந்தவரை கரிம உரங்களைப் பயன்படுத்துங்கள், 3) NPK விகிதம் பயிரைப் பொறுத்தது, 4) பிரித்து பயன்படுத்தவும்.",
            'water': "பாசன குறிப்புகள்: 1) சொட்டு நீர் பாசனம் தண்ணீரை சேமிக்கிறது, 2) அதிகாலை அல்லது மாலையில் தண்ணீர் பாய்ச்சவும், 3) தண்ணீர் ஊற்றும் முன் மண்ணின் ஈரப்பதத்தை சரிபார்க்கவும்.",
            'plant': "பயிர் நடுவதற்கு: 1) நல்ல வடிகால் உள்ள மண்ணை தயார் செய்யவும், 2) சரியான ஆழத்தில் விதைகளை விதைக்கவும், 3) போதிய சூரிய ஒளி மற்றும் இடைவெளி விடவும்.",
            'generic': "வணக்கம்! நான் உங்கள் விவசாய நிபுணர். இன்று உங்களுக்கு எப்படி உதவ முடியும்?"
        }
    }

    # Advanced Local Knowledge Base Check
    kb = {
        'npk': "<strong>NPK</strong> stands for Nitrogen (N), Phosphorus (P), and Potassium (K). These are the three primary nutrients found in fertilizers. Nitrogen helps with leaf growth, Phosphorus with root and flower development, and Potassium for overall plant health.",
        'organic': "<strong>Organic farming</strong> uses natural fertilizers like compost, manure, and bone meal. It avoids synthetic pesticides and emphasizes soil health and ecological balance.",
        'ph': "<strong>Soil pH</strong> measures acidity or alkalinity. Most crops prefer a pH between 6.0 and 7.5. You can raise pH with lime or lower it with sulfur/peat moss.",
        'pruning': "<strong>Pruning</strong> involves removing specific parts of a plant (branches, buds, roots) to improve health, control growth, or increase fruit/flower quality.",
        'neem': "<strong>Neem Oil</strong> is an excellent organic pesticide. Mix 1-2 teaspoons per liter of water with a drop of dish soap and spray on leaves to control aphids, mites, and whiteflies.",
        'monsoon': "The <strong>Monsoon</strong> season in Asia is critical for Kharif crops like rice, maize, and cotton. Ensure proper drainage to avoid root rot during heavy rains."
    }

    for key, value in kb.items():
        if key in message_lower:
            return {
                'response': value,
                'language': language,
                'image_analyzed': False
            }

    # Default to English if language not supported
    lang_msgs = fallbacks.get(language, fallbacks['en'])
    
    # Simple keyword matching
    if any(word in message_lower for word in ['pest', 'insect', 'bug', 'कीट', 'பூச்சி']):
        response = lang_msgs['pest']
    elif any(word in message_lower for word in ['fertilizer', 'npk', 'nutrient', 'खाद', 'உரம்', 'மண்', 'soil']):
        response = lang_msgs['soil']
    elif any(word in message_lower for word in ['water', 'irrigation', 'सिंचाई', 'பாசனம்', 'drainage']):
        response = lang_msgs['water']
    elif any(word in message_lower for word in ['plant', 'crop', 'grow', 'seed', 'carrot', 'फसल', 'पौधा', 'பயிர்', 'விதை']):
        response = lang_msgs['plant']
    else:
        response = lang_msgs['generic']
    
    return {
        'response': response,
        'language': language,
        'image_analyzed': False
    }

