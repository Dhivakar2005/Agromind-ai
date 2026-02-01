# Pest Detection ML Model

Custom CNN model for detecting pests and diseases in crop images.

## Quick Start

### 1. Install Dependencies

```bash
cd backend/ml_models/pest_detection
pip install -r requirements.txt
```

### 2. Prepare Dataset

Organize your dataset in the following structure:

```
data/raw/
├── healthy/
│   ├── image1.jpg
│   ├── image2.jpg
│   └── ...
├── leaf_blight/
│   ├── image1.jpg
│   └── ...
├── aphid_infestation/
│   └── ...
└── ...
```

**Recommended datasets:**
- PlantVillage: https://github.com/spMohanty/PlantVillage-Dataset
- Kaggle Plant Disease: https://www.kaggle.com/datasets

### 3. Train Model

```bash
cd src
python train.py
```

This will:
- Load and augment the dataset
- Train MobileNetV2-based CNN
- Fine-tune the model
- Save models in `models/` directory
- Generate training plots

### 4. Make Predictions

```python
from src.predict import PestPredictor

# Initialize predictor
predictor = PestPredictor('models/pest_detector_best.h5')

# Predict on image
result = predictor.predict('path/to/crop_image.jpg')

print(f"Detected: {result['detection_result']['pest_name']}")
print(f"Confidence: {result['confidence_score']:.2%}")
print(f"Severity: {result['severity']}")
```

## Model Architecture

- **Base Model:** MobileNetV2 (pre-trained on ImageNet)
- **Input Size:** 224x224x3
- **Output:** Softmax classification
- **Training:** Transfer learning + fine-tuning
- **Optimization:** Adam optimizer with learning rate scheduling

## Features

✅ Transfer learning with MobileNetV2  
✅ Data augmentation (rotation, flip, zoom, etc.)  
✅ Fine-tuning for better accuracy  
✅ TensorFlow Lite conversion for mobile  
✅ Top-K predictions  
✅ Severity estimation  
✅ Training visualization  

## Performance Targets

- **Accuracy:** >85% on validation set
- **Inference Time:** <500ms
- **Model Size:** <20MB (TFLite)

## Files

- `src/data_loader.py` - Dataset loading and augmentation
- `src/model.py` - CNN model architecture
- `src/train.py` - Training script
- `src/predict.py` - Prediction module
- `requirements.txt` - Python dependencies

## Integration with Backend

To integrate with the vision service:

```python
# In backend/services/vision_service/main.py
from ml_models.pest_detection.src.predict import PestPredictor

# Initialize predictor
predictor = PestPredictor('ml_models/pest_detection/models/pest_detector_best.h5')

# Use in API endpoint
@app.post("/analyze")
async def analyze_image(image: UploadFile):
    result = predictor.predict(image.file)
    return result
```

## Training Tips

1. **Dataset Size:** Minimum 100 images per class, ideally 500+
2. **Balance Classes:** Equal number of images per class
3. **Data Quality:** High-resolution, clear images
4. **Augmentation:** Helps with small datasets
5. **Fine-tuning:** Improves accuracy by 5-10%

## Troubleshooting

**Out of Memory:**
- Reduce batch_size in train.py
- Use smaller image size (e.g., 128x128)

**Low Accuracy:**
- Increase dataset size
- Add more augmentation
- Train for more epochs
- Check data quality

**Slow Training:**
- Use GPU (Google Colab recommended)
- Reduce image size
- Use smaller batch size

## Next Steps

- [ ] Collect more training data
- [ ] Add more pest/disease classes
- [ ] Implement ensemble models
- [ ] Add explainability (Grad-CAM)
- [ ] Deploy to mobile app
