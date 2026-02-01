import os
import joblib
import sys

print(f"Python executable: {sys.executable}")
print(f"Working directory: {os.getcwd()}")

# Test Crop Model
print("\n--- Testing Crop Model ---")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CROP_MODEL_PATH = os.path.join(BASE_DIR, "ml_models", "crop_recommendation", "models", "crop_model_best.joblib")
print(f"Looking for crop model at: {CROP_MODEL_PATH}")

if os.path.exists(CROP_MODEL_PATH):
    print("✅ File exists.")
    try:
        model = joblib.load(CROP_MODEL_PATH)
        print("✅ Crop model loaded successfully!")
    except Exception as e:
        print(f"❌ Failed to load crop model: {e}")
else:
    print("❌ Crop model file NOT found!")

# Test Pest Model (Torchvision)
print("\n--- Testing Pest Model (ResNet50) ---")
try:
    import torch
    from torchvision import models
    print(f"Torch version: {torch.__version__}")
    
    print("Attempting to load ResNet50...")
    model = models.resnet50(weights='DEFAULT')
    print("✅ ResNet50 loaded successfully!")
except ImportError:
    print("❌ Torch/Torchvision not installed.")
except Exception as e:
    print(f"❌ Failed to load ResNet50: {e}")
