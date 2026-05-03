"""
Transformers Inference Service (Tier 1)
=======================================
Downloads and runs a Vision Transformer plant disease classifier locally via the 
Hugging Face `transformers` library, completely bypassing local TensorFlow files.
"""

import io
from PIL import Image
from typing import List, Dict, Any

# Globals to heavily cache the AI models in memory
_processor = None
_model = None

hf_model_id = "wambugu71/crop_leaf_diseases_vit"

def is_ready() -> bool:
    """Check if the model is downloaded and loaded into memory."""
    global _processor, _model
    return _processor is not None and _model is not None

def load_keras_model() -> bool:
    """
    Downloads the model from the HF Cloud if not locally cached, 
    or loads the local plant_disease_model.h5 as a fallback.
    """
    global _processor, _model
    if is_ready():
        return True

    # 1. Try Cloud ViT Model (High Accuracy)
    try:
        from transformers import AutoImageProcessor, AutoModelForImageClassification
        import torch
        
        model_name = hf_model_id
        print(f"[ML] Attempting to load {model_name} from Hugging Face Cloud...")
        _processor = AutoImageProcessor.from_pretrained(model_name, local_files_only=False)
        _model = AutoModelForImageClassification.from_pretrained(model_name, local_files_only=False)
        _model.eval()
        
        print(f"[ML] Tier 1 ViT-v2 Cloud Model LOADED SUCCESSFULLY.")
        return True
    except Exception as e:
        print(f"[ML] Cloud model load failed: {e}. Checking for local Keras model...")

    # 2. Fallback to Local Keras Model (.h5) if Cloud fails
    try:
        import os
        import tensorflow as tf
        
        # Look in workspace root
        local_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "plant_disease_model.h5")
        
        if os.path.exists(local_path):
            print(f"[ML] Found local Keras model at {local_path}. Loading...")
            _model = tf.keras.models.load_model(local_path)
            # Use a dummy processor for Keras since it's manual
            _processor = "keras_local" 
            print(f"[ML] Local Keras Model (.h5) LOADED SUCCESSFULLY.")
            return True
        else:
            print(f"[ML] No local Keras model found at {local_path}.")
    except Exception as e:
        print(f"[ML] Local Keras model load failed: {e}")

    return False


def predict_disease(image_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Run inference on an image using the loaded HF Transformers model.
    """
    import torch
    
    if not is_ready():
        if not load_keras_model():
            return []

    try:
        # 1. Parse Image
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # 2. Preprocess & 3. Inference
        if _processor == "keras_local":
            # Local Keras (.h5) branch
            import numpy as np
            import tensorflow as tf
            
            # Resize to 256x256 as found in inspection
            img_resized = img.resize((256, 256))
            img_array = tf.keras.preprocessing.image.img_to_array(img_resized)
            img_array = np.expand_dims(img_array, axis=0) / 255.0
            
            predictions = _model.predict(img_array, verbose=0)
            top_class_idx = np.argmax(predictions[0])
            confidence_pct = round(float(predictions[0][top_class_idx]) * 100, 2)
            
            # Since we only have 3 classes and don't have labels, we use generic ones
            # User can provide labels later
            labels = ["Condition A", "Condition B", "Condition C"]
            label = labels[top_class_idx]
        else:
            # Cloud ViT branch
            inputs = _processor(img, return_tensors="pt")
            with torch.no_grad():
                outputs = _model(**inputs)
                logits = outputs.logits
                probabilities = torch.nn.functional.softmax(logits, dim=-1)[0]
                top_class_idx = logits.argmax(-1).item()
                confidence_pct = round(probabilities[top_class_idx].item() * 100, 2)
                label = _model.config.id2label[top_class_idx]


        # 4. Standardize output for Farmi UI
        # Typical format: "Crop___Disease"
        if "___" in label:
            crop, disease = label.split("___", 1)
            crop = crop.replace("_", " ").title()
            disease = disease.replace("_", " ")
        else:
            crop = "Plant"
            disease = label.replace("_", " ")

        is_healthy = "healthy" in disease.lower() or "background" in disease.lower()
        if is_healthy:
            disease = "Healthy (Good Plant)"

        # Determine Severity based on confidence rules
        if is_healthy:
            severity = "low"
        elif confidence_pct >= 75:
            severity = "high"
        elif confidence_pct >= 50:
            severity = "medium"
        else:
            severity = "low"

        return [{
            "disease"    : disease,
            "crop"       : crop,
            "confidence" : confidence_pct,
            "bbox"       : [0, 0, 0, 0], 
            "bbox_norm"  : [0.0, 0.0, 1.0, 1.0],
            "is_healthy" : is_healthy,
            "severity"   : severity,
            "label"      : f"{crop} - {disease}",
        }]

    except Exception as e:
        print(f"[ML] Hugging Face Transformers Inference Error: {e}")
        return []
