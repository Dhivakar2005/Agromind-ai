import requests
import json
from typing import Optional, Dict, Any, List

OLLAMA_BASE_URL = "http://localhost:11434/api"
DEFAULT_MODEL = "qwen2.5:3b"

def is_available() -> bool:
    """Check if Ollama service is running and accessible."""
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/tags", timeout=2)
        return response.status_code == 200
    except:
        return False

def generate_response(prompt: str, system_instruction: str = "", model: str = DEFAULT_MODEL) -> str:
    """Generate a text response using local Ollama."""
    if not is_available():
        return "Ollama service is not available. Please ensure 'ollama serve' is running."

    try:
        payload = {
            "model": model,
            "prompt": prompt,
            "system": system_instruction,
            "stream": False,
            "options": {
                "temperature": 0.4,
                "num_predict": 1024
            }
        }
        
        response = requests.post(f"{OLLAMA_BASE_URL}/generate", json=payload, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        return result.get("response", "No response received from Ollama.")
    except Exception as e:
        return f"Error communicating with Ollama: {str(e)}"

def get_recommendations(disease: str, crop: str, language: str = "en") -> str:
    """Generate an agricultural recommendation using Ollama."""
    prompt = (
        f"Generate a detailed, professional prevention and treatment plan for {disease} on {crop} plants. "
        f"Respond ONLY in {language}. Provide actionable steps including biological and chemical controls. "
        f"Aim for approximately 100-150 words of depth."
    )
    
    system_instruction = "You are a senior plant pathologist and agricultural expert. Provide clinical-grade, practical advice for farmers."
    
    return generate_response(prompt, system_instruction)
