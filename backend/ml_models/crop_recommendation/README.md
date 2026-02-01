# Crop Recommendation ML Model

Machine learning model for recommending optimal crops based on soil and climate parameters.

## Dataset

**File:** `data/crop_data.csv`  
**Rows:** 2,202  
**Crops:** 22 different crops  

### Columns:
- `N`: Nitrogen content (kg/ha)
- `P`: Phosphorus content (kg/ha)
- `K`: Potassium content (kg/ha)
- `temperature`: Temperature (°C)
- `humidity`: Humidity (%)
- `ph`: Soil pH
- `rainfall`: Rainfall (mm)
- `label`: Crop name (target)

### Supported Crops:
rice, maize, chickpea, kidneybeans, pigeonpeas, mothbeans, mungbean, blackgram, lentil, pomegranate, banana, mango, grapes, watermelon, muskmelon, apple, orange, papaya, coconut, cotton, jute, coffee

## Quick Start

### 1. Install Dependencies

```bash
cd backend/ml_models/crop_recommendation
pip install -r requirements.txt
```

### 2. Train Model

```bash
cd src
python train.py
```

**Training Output:**
- Model file: `models/crop_model_best.joblib`
- Label encoder: `models/label_encoder.joblib`
- Metadata: `models/model_metadata.json`
- Confusion matrix plot
- Feature importance plot

### 3. Make Predictions

```python
from src.predict import CropRecommender

# Initialize recommender
recommender = CropRecommender(
    model_path='models/crop_model_best.joblib',
    encoder_path='models/label_encoder.joblib',
    metadata_path='models/model_metadata.json'
)

# Get recommendations
result = recommender.predict(
    N=90,           # Nitrogen
    P=42,           # Phosphorus
    K=43,           # Potassium
    temperature=20.8,
    humidity=82,
    ph=6.5,
    rainfall=202
)

# Display results
for crop in result['recommended_crops']:
    print(f"{crop['crop_name']}: {crop['confidence']*100:.1f}%")
```

## Model Architecture

- **Algorithm:** XGBoost Classifier
- **Features:** 7 (N, P, K, temperature, humidity, pH, rainfall)
- **Classes:** 22 crops
- **Train/Test Split:** 80/20
- **Expected Accuracy:** 95-99%

## Features

✅ Multi-class classification (22 crops)  
✅ Top-K recommendations  
✅ Confidence scores  
✅ Expected yield estimates  
✅ Market potential assessment  
✅ Detailed reasoning  
✅ Feature importance analysis  

## Integration with Backend

```python
# In backend/services/advisory_service/main.py
from ml_models.crop_recommendation.src.predict import CropRecommender

# Initialize once at startup
crop_recommender = CropRecommender()

@app.post("/api/v1/advisory/recommend-crops")
async def recommend_crops(request: CropRequest):
    result = crop_recommender.predict(
        N=request.nitrogen,
        P=request.phosphorus,
        K=request.potassium,
        temperature=request.temperature,
        humidity=request.humidity,
        ph=request.ph,
        rainfall=request.rainfall,
        top_k=3
    )
    return result
```

## Files

- `src/train.py` - Training script
- `src/predict.py` - Prediction module
- `data/crop_data.csv` - Training dataset
- `models/` - Saved models directory
- `requirements.txt` - Python dependencies

## Performance

**Expected Metrics:**
- Accuracy: 95-99%
- Training Time: 10-30 seconds
- Inference Time: <10ms per prediction

## Example Output

```json
{
  "recommended_crops": [
    {
      "crop_name": "rice",
      "confidence": 0.92,
      "expected_yield": "45-55 quintals/acre",
      "market_potential": "Very High",
      "reasons": [
        "Excellent match for your soil and climate conditions",
        "High nitrogen content supports rice growth",
        "High rainfall suitable for water-intensive crop"
      ]
    },
    {
      "crop_name": "maize",
      "confidence": 0.75,
      "market_potential": "High",
      ...
    }
  ],
  "confidence_score": 0.92,
  "reasoning": "Based on your soil parameters...",
  "sources": ["ML Model Prediction", "Agricultural Guidelines"],
  "assumptions": [...]
}
```

## Next Steps

- [ ] Train model on uploaded dataset
- [ ] Integrate with advisory service
- [ ] Add seasonal recommendations
- [ ] Include regional variations
- [ ] Deploy to production

---

**Ready to train!** Run `python src/train.py` to build the model.
