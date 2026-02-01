# Robust imports
import os  # Standard library should be top level
try:
    import joblib
    import numpy as np
    from PIL import Image
    import io
    IMPORTS_SUCCESS = True
except ImportError as e:
    print(f"⚠️  ML dependencies missing: {e}")
    IMPORTS_SUCCESS = False

# Paths to ML models
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CROP_MODEL_PATH = os.path.join(BASE_DIR, "ml_models", "crop_recommendation", "models", "crop_model_best.joblib")
LABEL_ENCODER_PATH = os.path.join(BASE_DIR, "ml_models", "crop_recommendation", "models", "label_encoder.joblib")

# Load crop recommendation model
crop_model = None
label_encoder = None

def load_models():
    """Load ML models explicitly"""
    global crop_model, label_encoder
    
    # Load Crop Model
    try:
        if joblib is None:
             print("⚠️  Joblib not available, skipping crop model load")
             return

        if os.path.exists(CROP_MODEL_PATH):
            crop_model = joblib.load(CROP_MODEL_PATH)
            label_encoder = joblib.load(LABEL_ENCODER_PATH)
            print(f"✅ Crop recommendation model loaded from: {CROP_MODEL_PATH}")
        else:
            print(f"❌ Crop model file not found at: {CROP_MODEL_PATH}")
    except Exception as e:
        print(f"⚠️  Could not load crop model: {e}")

def get_crop_model_status():
    return crop_model is not None


def predict_crop(N, P, K, temperature, humidity, ph, rainfall):
    """
    Predict best crop based on soil and climate conditions
    
    Args:
        N: Nitrogen content
        P: Phosphorus content  
        K: Potassium content
        temperature: Temperature in Celsius
        humidity: Humidity percentage
        ph: Soil pH value
        rainfall: Rainfall in mm
    
    Returns:
        dict: Predicted crop and confidence score
    """
    if crop_model is None or label_encoder is None:
        # Fallback to rule-based recommendation
        return fallback_crop_recommendation(temperature, rainfall)
    
    try:
        # Prepare input features
        features = np.array([[N, P, K, temperature, humidity, ph, rainfall]])
        
        # Get prediction
        prediction = crop_model.predict(features)[0]
        crop_name = label_encoder.inverse_transform([prediction])[0]
        
        # Get probability scores if available
        if hasattr(crop_model, 'predict_proba'):
            probabilities = crop_model.predict_proba(features)[0]
            confidence = float(max(probabilities) * 100)
        else:
            confidence = 85.0  # Default confidence
        
        return {
            "crop": crop_name,
            "confidence": round(confidence, 2),
            "method": "ml_model"
        }
    except Exception as e:
        print(f"Error in crop prediction: {e}")
        return fallback_crop_recommendation(temperature, rainfall)

def fallback_crop_recommendation(temperature, rainfall):
    """Fallback rule-based recommendation if ML model fails"""
    if rainfall > 200:
        if temperature > 25:
            crop = "rice"
        else:
            crop = "wheat"
    elif rainfall > 100:
        if temperature > 25:
            crop = "maize"
        else:
            crop = "chickpea"
    else:
        if temperature > 25:
            crop = "cotton"
        else:
            crop = "mustard"
    
    return {
        "crop": crop,
        "confidence": 75.0,
        "method": "rule_based"
    }

def predict_pest(image_bytes):
    """
    Predict pest from image using ML model
    """
    try:
        # Import PyTorch and Torchvision
        import torch
        from torchvision import models, transforms
        import json
        
        # Open and validate image
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        # Define preprocessing transform
        preprocess = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        
        # Preprocess image
        input_tensor = preprocess(img)
        input_batch = input_tensor.unsqueeze(0)  # Add batch dimension
        
        # Load pre-trained ResNet50 model
        weights = models.ResNet50_Weights.DEFAULT
        model = models.resnet50(weights=weights)
        model.eval()
        
        # Run inference
        with torch.no_grad():
            output = model(input_batch)
            
        # Get probabilities
        probabilities = torch.nn.functional.softmax(output[0], dim=0)
        
        # Get top prediction
        confidence, class_idx = torch.max(probabilities, 0)
        confidence_pct = float(confidence.item()) * 100
        
        # Get specific class name
        class_name = weights.meta["categories"][class_idx.item()]
        
        class_id = class_idx.item()
        
        is_insect = 300 <= class_id <= 399
        is_fungus_or_plant = 980 <= class_id <= 999
        
        # Format the name (replace underscores, capitalize)
        display_name = class_name.replace('_', ' ').title()
        
        if is_insect:
            prediction_text = f"⚠️ Detected: {display_name}"
            recommendation = (
                f"1. **Identification:** The AI identified this as **{display_name}**.\n"
                "2. **Immediate Action:** Isolate affected plants to prevent spread.\n"
                "3. **Organic Solution:** Spray Neem oil (5ml/liter) or insecticidal soap every 3-5 days.\n"
                "4. **Chemical Control:** If severe, apply broad-spectrum insecticide (consult local approved list)."
            )
            prevention = (
                "• **Monitor:** Check undersides of leaves daily.\n"
                "• **Hygiene:** Remove weeds and debris where pests hide.\n"
                "• **Traps:** Use yellow sticky traps to monitor population."
            )
        elif is_fungus_or_plant:
             prediction_text = f"⚠️ Possible Issue: {display_name}"
             recommendation = (
                 f"1. **Analysis:** The AI detected patterns resembling **{display_name}**.\n"
                 "2. **Isolate:** Remove and destroy infected plant parts immediately (do not compost).\n"
                 "3. **Airflow:** Improve spacing between plants.\n"
                 "4. **Fungicide:** Apply copper-based fungicide or baking soda solution (1 tsp/liter)."
             )
             prevention = (
                 "• **Rotation:** Rotate crops every season.\n"
                 "• **Soil:** Ensure well-draining soil to prevent root rot.\n"
                 "• **Seeds:** Use disease-resistant seed varieties."
             )
        elif confidence_pct < 40:
             # Low confidence fallback
            prediction_text = f"❓ Unsure (Resembles {display_name})"
            recommendation = "The image analysis is inconclusive. Please upload a structured closeup of the specific leaf spot or insect."
            prevention = "Ensure good lighting and focus when taking photos."
        else:
            # High confidence on non-pest
            prediction_text = f"🌱 Analysis: {display_name}"
            recommendation = (
                f"• The image appears to be **{display_name}**.\n"
                "• No major active pests or disease patterns recognized.\n"
                "• Ensure balanced NPK fertilization."
            )
            prevention = "Continue regular monitoring and maintain good field hygiene."

        return {
            "pest": prediction_text,
            "confidence": round(confidence_pct, 2),
            "treatment": recommendation,
            "prevention": prevention,
            "method": "resnet50_imagenet_v2"
        }
        
    except ImportError:
        return {
            "pest": "ML Error",
            "confidence": 0,
            "treatment": "torchvision not installed",
            "method": "error"
        }
    except Exception as e:
        print(f"Error in real pest detection: {e}")
        return {
            "pest": "Processing Error",
            "confidence": 0,
            "treatment": str(e),
            "method": "error"
        }
