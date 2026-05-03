# Robust imports
import os  # Standard library should be top level
try:
    import joblib
    import numpy as np
    from PIL import Image
    import io
    IMPORTS_SUCCESS = True
except ImportError:
    IMPORTS_SUCCESS = False

# Paths to ML models
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CROP_MODEL_PATH = os.path.join(BASE_DIR, "ml_models", "crop_recommendation", "models", "crop_model_best.joblib")
LABEL_ENCODER_PATH = os.path.join(BASE_DIR, "ml_models", "crop_recommendation", "models", "label_encoder.joblib")

# Load crop recommendation model
crop_model = None
label_encoder = None

# ViT pest detection model
vit_pest_detector = None

# Plant disease detection model
disease_detector = None

def load_models():
    """Load ML models explicitly"""
    global crop_model, label_encoder, vit_pest_detector, disease_detector
    
    # Load Crop Model
    try:
        if joblib is not None and os.path.exists(CROP_MODEL_PATH):
            crop_model = joblib.load(CROP_MODEL_PATH)
            label_encoder = joblib.load(LABEL_ENCODER_PATH)
    except:
        pass
    
    # Load ViT Pest Detection Model
    try:
        vit_models_dir = os.path.join(BASE_DIR, "ml_models", "pest_detection", "models")
        vit_model_path = os.path.join(vit_models_dir, "vit_pest_detector.pth")
        vit_metadata_path = os.path.join(vit_models_dir, "vit_metadata.json")
        
        if os.path.exists(vit_model_path) and os.path.exists(vit_metadata_path):
            import sys
            vit_src_path = os.path.join(BASE_DIR, "ml_models", "pest_detection", "src")
            if vit_src_path not in sys.path:
                sys.path.insert(0, vit_src_path)
            
            from predict_vit import ViTPestDetector
            vit_pest_detector = ViTPestDetector(vit_model_path, vit_metadata_path)
    except:
        pass
    
    # Load Plant Disease Detection Model
    try:
        global disease_detector
        from transformers import AutoImageProcessor, AutoModelForImageClassification
        import torch
        
        model_name = "wambugu71/crop_leaf_diseases_vit"
        disease_processor = AutoImageProcessor.from_pretrained(model_name)
        disease_model = AutoModelForImageClassification.from_pretrained(model_name)
        disease_model.eval()
        
        disease_detector = {
            'processor': disease_processor,
            'model': disease_model,
            'name': model_name
        }
    except:
        pass

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
    except:
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


def predict_pest_vit(image_bytes):
    """
    Predict pest using ViT model (google/vit-base-patch16-224)
    Pure ML inference - No LLM
    
    Args:
        image_bytes: Raw image bytes
        
    Returns:
        dict: Prediction results with treatment recommendations
    """
    global vit_pest_detector
    
    if vit_pest_detector is None:
        return {
            "pest": "ViT Model Not Available",
            "confidence": 0,
            "treatment": "ViT model not loaded. Train the model first using train_vit.py",
            "prevention": "See ml_models/pest_detection/DATASETS.md for dataset instructions",
            "method": "error"
        }
    
    try:
        # Use ViT predictor
        result = vit_pest_detector.predict_with_treatment(image_bytes)
        return result
        
    except:
        return {
            "pest": "Processing Error",
            "confidence": 0,
            "treatment": str(e),
            "method": "error"
        }

def predict_pest(image_bytes, model='resnet50'):
    """
    Predict pest from image using ML model
    
    Args:
        image_bytes: Raw image bytes
        model: Model to use ('resnet50' or 'vit')
        
    Returns:
        dict: Prediction results
    """
    # Use ViT model if requested
    if model == 'vit':
        return predict_pest_vit(image_bytes)
    
    # Default: ResNet50
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
    except:
        return {
            "pest": "Processing Error",
            "confidence": 0,
            "treatment": str(e),
            "method": "error"
        }
# Disease Treatment Knowledge Base
DISEASE_TREATMENTS = {
    "Apple___Apple_scab": {
        "treatment": "1) Remove and destroy infected leaves, 2) Apply fungicide (captan or myclobutanil), 3) Improve air circulation by pruning, 4) Avoid overhead watering",
        "prevention": "Plant resistant varieties, remove fallen leaves, apply preventive fungicide in spring"
    },
    "Apple___Black_rot": {
        "treatment": "1) Prune out infected branches, 2) Remove mummified fruits, 3) Apply copper-based fungicide, 4) Improve tree vigor with proper fertilization",
        "prevention": "Prune for good air circulation, remove infected fruit immediately, apply fungicide during bloom"
    },
    "Apple___Cedar_apple_rust": {
        "treatment": "1) Remove nearby cedar trees if possible, 2) Apply fungicide (myclobutanil), 3) Remove infected leaves, 4) Improve drainage",
        "prevention": "Plant resistant apple varieties, remove cedar trees within 2 miles, apply preventive fungicide"
    },
    "Corn___Gray_Leaf_Spot": {
        "treatment": "1) Apply fungicide (azoxystrobin or pyraclostrobin), 2) Remove infected plant debris, 3) Improve field drainage, 4) Rotate crops",
        "prevention": "Use resistant hybrids, practice 2-year crop rotation, till under crop residue"
    },
    "Corn___Common_Rust": {
        "treatment": "1) Apply fungicide if severe (triazole or strobilurin), 2) Monitor regularly, 3) Ensure adequate nutrition",
        "prevention": "Plant resistant hybrids, avoid late planting, maintain good plant health"
    },
    "Potato___Early_Blight": {
        "treatment": "1) Remove infected leaves, 2) Apply fungicide (chlorothalonil or mancozeb), 3) Improve air circulation, 4) Avoid overhead watering, 5) Ensure adequate nutrition",
        "prevention": "Use certified disease-free seed, rotate crops (3-4 years), mulch to prevent soil splash, apply preventive fungicide"
    },
    "Potato___Late_Blight": {
        "treatment": "1) Remove and destroy infected plants immediately, 2) Apply systemic fungicide (metalaxyl), 3) Improve drainage, 4) Reduce humidity, 5) Harvest early if needed",
        "prevention": "Use certified seed, plant resistant varieties, avoid overhead irrigation, apply preventive fungicide, monitor weather for blight-favorable conditions"
    },
    "Rice___Brown_Spot": {
        "treatment": "1) Apply balanced fertilizer (NPK), 2) Improve soil quality, 3) Use certified seeds, 4) Apply fungicide (Edifenphos or Mancozeb) if severe",
        "prevention": "Maintain proper soil fertility, use resistant varieties, treat seeds before planting"
    },
    "Rice___Leaf_Blast": {
        "treatment": "1) Avoid excessive nitrogen, 2) Maintain water level in field, 3) Apply fungicide (Tricyclazole), 4) Remove weeds",
        "prevention": "Use resistant varieties, avoid dry soil conditions, space plants properly"
    },
    "Rice___Hispa": {
        "treatment": "1) Leaf topping to remove eggs, 2) Manual collection of adults, 3) Apply insecticide (Quinalphos or Chlorpyrifos) if damage exceeds threshold",
        "prevention": "Avoid over-fertilizing, monitor field regularly during early stages, encourage natural predators"
    },
    "Grape___Black_rot": {
        "treatment": "1) Remove and destroy infected fruit and leaves, 2) Apply fungicide (mancozeb or captan), 3) Prune for air circulation, 4) Remove mummies",
        "prevention": "Prune properly, remove all mummified fruit, apply preventive fungicide from bud break"
    },
    "Grape___Esca_(Black_Measles)": {
        "treatment": "1) Prune out infected wood, 2) Improve vine nutrition, 3) Reduce stress, 4) No effective chemical control",
        "prevention": "Avoid pruning wounds, use proper pruning techniques, maintain vine health"
    },
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)": {
        "treatment": "1) Remove infected leaves, 2) Apply copper-based fungicide, 3) Improve air circulation, 4) Avoid overhead irrigation",
        "prevention": "Plant resistant varieties, ensure good drainage, apply preventive fungicide"
    },
    "Potato___Early_blight": {
        "treatment": "1) Remove infected leaves, 2) Apply fungicide (chlorothalonil or mancozeb), 3) Improve air circulation, 4) Avoid overhead watering, 5) Ensure adequate nutrition",
        "prevention": "Use certified disease-free seed, rotate crops (3-4 years), mulch to prevent soil splash, apply preventive fungicide"
    },
    "Potato___Late_blight": {
        "treatment": "1) Remove and destroy infected plants immediately, 2) Apply systemic fungicide (metalaxyl), 3) Improve drainage, 4) Reduce humidity, 5) Harvest early if needed",
        "prevention": "Use certified seed, plant resistant varieties, avoid overhead irrigation, apply preventive fungicide, monitor weather for blight-favorable conditions"
    },
    "Tomato___Bacterial_spot": {
        "treatment": "1) Immediate Isolation: Remove and destroy infected plants showing water-soaked spots. 2) Chemical Defense: Apply copper-based bactericide every 7-10 days. 3) Water Control: Switch to drip irrigation; avoid wetting foliage. 4) Sanitation: Sterilize tools with 10% bleach solution after pruning.",
        "prevention": "Use certified disease-free seeds; practice a 3-year crop rotation; avoid working with wet plants; use mulch to prevent soil splashing."
    },
    "Peach___Bacterial_spot": {
        "treatment": "1) Targeted Spraying: Use oxytetracycline or copper-based sprays during the growing season. 2) Pruning: Remove cankers during dormancy to reduce inoculum. 3) Nutrient Balance: Avoid excessive nitrogen which promotes susceptible growth. 4) Foliar health: Apply zinc-sulfate sprays if recommended locally.",
        "prevention": "Plant resistant cultivars (e.g., 'Bounty', 'Contender'); ensure good site drainage; maintain a regular scouting schedule for early spring signs."
    },
    "Tomato___Early_blight": {
        "treatment": "1) Defensive Pruning: Remove infected lower leaves immediately. 2) Fungicide: Apply chlorothalonil or mancozeb at first sign. 3) Soil Barrier: Apply fresh mulch to prevent spores from splashing onto leaves. 4) Support: Stake plants to improve vertical air movement.",
        "prevention": "Rotate crops annually; use disease-resistant varieties; stake and prune for maximum airflow; water at base only."
    },
    "Tomato___Late_blight": {
        "treatment": "1) Critical Action: Remove and destroy entire infected plants immediately (do not compost). 2) Emergency Spray: Apply systemic fungicides (metalaxyl) if weather is wet. 3) Moisture Control: Reduce plant density to lower humidity. 4) Harvest: Pick remaining healthy green fruit for indoor ripening.",
        "prevention": "Avoid overhead watering; space plants 3 feet apart; monitor weather for 'Blight-favorable' alerts; use certified transplants."
    },
    "Tomato___Leaf_Mold": {
        "treatment": "1) Humidity Control: Improve greenhouse ventilation to keep RH < 85%. 2) Spacing: Increase plant spacing to 36 inches. 3) Sanitization: Remove infected leaves at the bottom of the plant. 4) Fungicide: Use chlorothalonil according to label instructions.",
        "prevention": "Select resistant varieties; ensure superior air circulation; maintain low humidity levels; avoid wetting foliage during irrigation."
    },
    "Tomato___Septoria_leaf_spot": {
        "treatment": "1) Surface Cleaning: Clear all fallen debris around plants. 2) Fungicide: Use chlorothalonil or copper-based fungicides. 3) Mulching: Maintain 2-3 inches of straw mulch. 4) Airflow: Prune for better spacing. 5) Irrigation: Water only at the soil level.",
        "prevention": "Practice 4-year crop rotation; use disease-free seeds; keep field free of solanaceous weeds; avoid handling wet foliage."
    },
    "Tomato___Spider_mites Two-spotted_spider_mite": {
        "treatment": "1) Spray with water to dislodge mites, 2) Apply insecticidal soap or neem oil, 3) Introduce predatory mites, 4) Increase humidity, 5) Remove heavily infested leaves",
        "prevention": "Maintain adequate moisture, avoid over-fertilizing with nitrogen, monitor regularly, use resistant varieties"
    },
    "Tomato___Target_Spot": {
        "treatment": "1) Remove infected leaves, 2) Apply fungicide (chlorothalonil or mancozeb), 3) Improve air circulation, 4) Avoid overhead watering, 5) Mulch around plants",
        "prevention": "Rotate crops, use disease-free seeds, ensure good drainage, apply preventive fungicide"
    },
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": {
        "treatment": "1) Remove and destroy infected plants, 2) Control whitefly vectors with insecticide, 3) Use reflective mulch, 4) No cure available",
        "prevention": "Use virus-free transplants, control whiteflies, use resistant varieties, use insect-proof screens"
    },
    "Tomato___Tomato_mosaic_virus": {
        "treatment": "1) Remove and destroy infected plants, 2) Disinfect tools and hands, 3) Control aphid vectors, 4) No chemical cure",
        "prevention": "Use certified virus-free seeds, avoid tobacco use near plants, disinfect tools, control aphids, use resistant varieties"
    }
}

def get_disease_treatment(disease_key):
    """Get treatment recommendation for a disease"""
    if disease_key in DISEASE_TREATMENTS:
        return DISEASE_TREATMENTS[disease_key]["treatment"]
    return "Consult local agricultural extension service for specific treatment recommendations. General advice: Remove infected plant parts, improve air circulation, avoid overhead watering, and consider appropriate fungicide application."

def get_disease_prevention(disease_key):
    """Get prevention tips for a disease"""
    if disease_key in DISEASE_TREATMENTS:
        return DISEASE_TREATMENTS[disease_key]["prevention"]
    return "Practice crop rotation, use disease-resistant varieties, maintain good plant spacing, ensure proper drainage, and monitor plants regularly for early detection."


def predict_disease(image_bytes):
    """
    Detect plant diseases from leaf images using Hugging Face model
    
    Args:
        image_bytes: Raw image bytes
        
    Returns:
        dict: {
            'disease': str,
            'crop': str,
            'confidence': float,
            'treatment': str,
            'prevention': str,
            'method': str
        }
    """
    global disease_detector
    
    if disease_detector is None:
        return {
            "disease": "Model Not Available",
            "crop": "Unknown",
            "confidence": 0,
            "treatment": "Disease detection model not loaded. Please restart the backend server.",
            "prevention": "",
            "method": "error"
        }
    
    try:
        from PIL import Image
        import io
        import torch
        
        # Load and prepare image
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # Preprocess image
        inputs = disease_detector['processor'](images=image, return_tensors="pt")
        
        # Predict
        with torch.no_grad():
            outputs = disease_detector['model'](**inputs)
            logits = outputs.logits
            predicted_class = logits.argmax(-1).item()
            
            # Get confidence score
            probabilities = torch.nn.functional.softmax(logits, dim=-1)
            confidence = probabilities[0][predicted_class].item()
        
        # Get disease name from model
        disease_key = disease_detector['model'].config.id2label[predicted_class]
        
        # Parse disease name (format: "Crop___Disease_Name")
        parts = disease_key.split('___')
        crop = parts[0].replace('_', ' ') if len(parts) > 0 else "Unknown"
        disease = parts[1].replace('_', ' ') if len(parts) > 1 else disease_key.replace('_', ' ')
        
        # Check if it's healthy
        is_healthy = 'healthy' in disease.lower()
        
        if is_healthy:
            return {
                "disease": "Healthy",
                "crop": crop,
                "confidence": round(confidence * 100, 2),
                "treatment": "No treatment needed - plant is healthy!",
                "prevention": "Continue good agricultural practices: proper watering, fertilization, and pest monitoring.",
                "method": "huggingface_ensemble",
                "is_healthy": True
            }
        
        # Get treatment and prevention
        treatment = get_disease_treatment(disease_key)
        prevention = get_disease_prevention(disease_key)
        
        return {
            "disease": disease,
            "crop": crop,
            "confidence": round(confidence * 100, 2),
            "treatment": treatment,
            "prevention": prevention,
            "method": "huggingface_ensemble",
            "is_healthy": False
        }
        
    except:
        return {
            "disease": "Processing Error",
            "crop": "Unknown",
            "confidence": 0,
            "treatment": f"Error: {str(e)}",
            "prevention": "",
            "method": "error"
        }

