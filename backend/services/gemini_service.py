import os
import google.generativeai as genai
from typing import Optional, Dict, Any, List
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env using absolute path
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Load API Key from .env or environment
API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("gemini_api")

if API_KEY:
    genai.configure(api_key=API_KEY)

# Model Selection
# Using gemini-1.5-flash for stable production usage
TEXT_MODEL = "gemini-1.5-flash"

def is_ready() -> bool:
    """Check if Gemini API is configured."""
    return bool(API_KEY)

def generate_response(prompt: str, system_instruction: str = "", temperature: float = 0.3) -> str:
    """Generate a text response using Gemini."""
    if not API_KEY:
        return "Gemini API key not configured. Please check your .env file."
    
    try:
        if system_instruction:
            model = genai.GenerativeModel(
                model_name=TEXT_MODEL,
                system_instruction=system_instruction
            )
        else:
            model = genai.GenerativeModel(model_name=TEXT_MODEL)
            
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=2000, # Increased to allow for ~150-200 words
            )
        )
        return response.text.strip()
    except Exception as e:
        # Re-raise to allow the calling service (agri_chat_service) to handle fallback
        raise e

def analyze_image(image_bytes: bytes, prompt: str) -> str:
    """Analyze an image providing expert agricultural context."""
    if not API_KEY:
        return "Gemini API key not configured."
    
    try:
        model = genai.GenerativeModel(model_name=TEXT_MODEL)
        
        # Prepare image part
        image_part = {
            "mime_type": "image/jpeg",
            "data": image_bytes
        }
        
        response = model.generate_content([prompt, image_part])
        return response.text.strip()
    except Exception as e:
        return f"Gemini Vision Error: {str(e)}"

def get_recommendations(disease: str, crop: str, language: str = "en") -> str:
    """Get expert agricultural recommendations for a specific disease."""
    # User requested English ONLY for the Disease Detection solutions
    lang_name = "English"
    
    prompt = (
        f"Expert advice for {disease} in {crop}.\n"
        f"Provide 4-5 concise prevention/treatment points.\n"
        f"Simple list format. Respond ONLY in {lang_name}."
    )
    
    return generate_response(prompt)
