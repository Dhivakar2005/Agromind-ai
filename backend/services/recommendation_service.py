"""
AI Recommendation Engine
========================
Uses Ollama (qwen2.5:3b) to generate dynamic, farmer-friendly
treatment and prevention recommendations for detected plant diseases.

Purpose:
    Given a detected disease and crop, generates a contextual response
    from a local LLM — no external API needed.
"""

from typing import List, Dict, Any
from . import gemini_service
from . import ollama_service

def generate_recommendation(
    disease  : str,
    crop     : str,
    confidence: float,
    severity : str = "medium",
    language : str = "en",
) -> str:
    """
    Generate a dynamic recommendation using Cloud (Gemini) or Local (Ollama) AI.
    """
    # Tier 1: Gemini
    if gemini_service.is_ready():
        try:
            res = gemini_service.get_recommendations(disease, crop, language)
            if res and not res.startswith("Gemini API"):
                return res
        except: pass

    # Tier 2: Ollama (Local)
    if ollama_service.is_available():
        try:
            res = ollama_service.get_recommendations(disease, crop, language)
            if res:
                return res
        except: pass

    # Tier 3: Static Fallback
    return _static_recommendation_fallback(disease, crop)


def generate_batch_recommendations(
    detections: List[Dict[str, Any]],
    language  : str = "en",
) -> List[Dict[str, Any]]:
    """
    Add AI-generated recommendations to a list of detection results.

    Args:
        detections : List of detection dicts from yolo_disease_service
        language   : Language for recommendations

    Returns:
        Same list with 'recommendation' key added to each detection.
    """
    enriched = []

    for det in detections:
        disease    = det.get("disease", "Unknown Disease")
        crop       = det.get("crop", "Plant")
        confidence = det.get("confidence", 0.0)
        severity   = det.get("severity", "medium")
        is_healthy = det.get("is_healthy", False)

        if is_healthy:
            recommendation = (
                "✅ **Plant is Healthy (Good Plant)!**\n\n"
                "**Expert Upkeep Checklist:**\n"
                "• **Hydration**: Maintain consistent soil moisture; water at the base to keep foliage dry.\n"
                "• **Nutrition**: Apply a balanced organic fertilizer (like compost tea) every 4-6 weeks.\n"
                "• **Environment**: Ensure 6-8 hours of sunlight and clear away any fallen debris.\n"
                "• **Vigilance**: Continue weekly inspections for early signs of aphids or mites."
            )
        else:
            recommendation = generate_recommendation(
                disease    = disease,
                crop       = crop,
                confidence = confidence,
                severity   = severity,
                language   = language,
            )

        enriched.append({**det, "recommendation": recommendation})

    return enriched


# ── Static Fallback (when Ollama is offline) ───────────────────────────────────
_STATIC_FALLBACKS = {
    "blight": (
        "🦠 **Blight Detected**\n\n"
        "**Treatment:**\n"
        "1. Remove and destroy all infected plant parts immediately\n"
        "2. Apply systemic fungicide (Metalaxyl or Mancozeb)\n"
        "3. Avoid overhead watering to reduce humidity\n"
        "4. Improve plant spacing for airflow\n\n"
        "**Prevention:**\n"
        "• Use certified, disease-resistant seed varieties\n"
        "• Rotate crops every season\n"
        "• Monitor plants weekly for early signs"
    ),
    "rust": (
        "🟫 **Rust Disease Detected**\n\n"
        "**Treatment:**\n"
        "1. Remove infected leaves and destroy (don't compost)\n"
        "2. Apply triazole-based fungicide (Tebuconazole)\n"
        "3. Reduce leaf wetness by watering at the base\n\n"
        "**Prevention:**\n"
        "• Plant rust-resistant varieties\n"
        "• Avoid planting near alternate hosts\n"
        "• Apply preventive fungicide in spring"
    ),
    "spot": (
        "🔴 **Leaf Spot Detected**\n\n"
        "**Treatment:**\n"
        "1. Remove affected leaves and dispose away from field\n"
        "2. Apply copper-based fungicide every 7-10 days\n"
        "3. Reduce crop density to improve airflow\n\n"
        "**Prevention:**\n"
        "• Avoid overhead irrigation\n"
        "• Mulch beds to prevent soil splash\n"
        "• Use disease-free planting material"
    ),
    "healthy": (
        "✅ **Plant Appears Healthy!**\n\n"
        "**Maintenance Tips:**\n"
        "• Continue regular watering and fertilization\n"
        "• Monitor weekly for pest activity\n"
        "• Ensure good soil drainage"
    ),
}


def _static_recommendation_fallback(disease: str, crop: str) -> str:
    """Keyword-based static fallback when Ollama is not available."""
    disease_lower = disease.lower()

    for keyword, rec in _STATIC_FALLBACKS.items():
        if keyword in disease_lower:
            return rec

    return (
        f"⚠️ **{disease} detected on {crop}**\n\n"
        "**General Treatment:**\n"
        "1. Isolate affected plants to prevent spread\n"
        "2. Remove and destroy visibly infected parts\n"
        "3. Apply appropriate fungicide or bactericide\n"
        "4. Consult your local agricultural extension officer\n\n"
        "**Prevention:**\n"
        "• Use crop rotation\n"
        "• Ensure good field hygiene\n"
        "• Use certified disease-free seeds\n\n"
        "⚡ *For detailed AI recommendations, start Ollama: `ollama serve`*"
    )
