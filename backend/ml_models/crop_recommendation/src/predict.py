"""
Crop Recommendation Model - Prediction Module
Make crop recommendations based on soil and climate parameters
"""

import pandas as pd
import numpy as np
import joblib
import json
import os

class CropRecommender:
    def __init__(self, model_path='models/crop_model_best.joblib',
                 encoder_path='models/label_encoder.joblib',
                 metadata_path='models/model_metadata.json'):
        """
        Initialize crop recommender
        
        Args:
            model_path: Path to trained model
            encoder_path: Path to label encoder
            metadata_path: Path to metadata JSON
        """
        self.model_path = model_path
        self.encoder_path = encoder_path
        self.metadata_path = metadata_path
        
        # Load model and encoder
        self.load_model()
    
    def load_model(self):
        """Load trained model and metadata"""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model not found at {self.model_path}")
        
        self.model = joblib.load(self.model_path)
        self.label_encoder = joblib.load(self.encoder_path)
        
        with open(self.metadata_path, 'r') as f:
            self.metadata = json.load(f)
        
        self.crops = self.metadata['crops']
        self.features = self.metadata['features']
        
        print(f"Model loaded successfully!")
        print(f"Supports {len(self.crops)} crops: {', '.join(self.crops)}")
    
    def predict(self, N, P, K, temperature, humidity, ph, rainfall, top_k=3):
        """
        Predict best crops for given conditions
        
        Args:
            N: Nitrogen content (kg/ha)
            P: Phosphorus content (kg/ha)
            K: Potassium content (kg/ha)
            temperature: Temperature (°C)
            humidity: Humidity (%)
            ph: Soil pH
            rainfall: Rainfall (mm)
            top_k: Number of top recommendations
            
        Returns:
            Dictionary with recommendations
        """
        # Create input dataframe
        input_data = pd.DataFrame({
            'N': [N],
            'P': [P],
            'K': [K],
            'temperature': [temperature],
            'humidity': [humidity],
            'ph': [ph],
            'rainfall': [rainfall]
        })
        
        # Get probabilities for all crops
        probabilities = self.model.predict_proba(input_data)[0]
        
        # Get top-k predictions
        top_indices = np.argsort(probabilities)[-top_k:][::-1]
        
        recommendations = []
        for idx in top_indices:
            crop_name = self.crops[idx]
            confidence = float(probabilities[idx])
            
            # Get expected yield and market potential (simplified)
            yield_info = self._get_yield_info(crop_name)
            market_potential = self._get_market_potential(confidence)
            
            recommendations.append({
                'crop_name': crop_name,
                'confidence': confidence,
                'expected_yield': yield_info,
                'market_potential': market_potential,
                'reasons': self._get_reasons(crop_name, input_data, confidence)
            })
        
        # Overall confidence
        overall_confidence = float(probabilities[top_indices[0]])
        
        # Reasoning
        reasoning = self._generate_reasoning(input_data, recommendations)
        
        return {
            'recommended_crops': recommendations,
            'confidence_score': overall_confidence,
            'reasoning': reasoning,
            'sources': ["ML Model Prediction", "Agricultural Guidelines", "Historical Data"],
            'assumptions': [
                "Based on provided soil and climate parameters",
                "Assuming standard farming practices",
                "Market conditions may vary by region",
                "Consult local agricultural experts for final decision"
            ]
        }
    
    def _get_yield_info(self, crop_name):
        """Get expected yield information"""
        # Simplified yield estimates (quintals/acre)
        yield_map = {
            'rice': '45-55 quintals/acre',
            'maize': '28-35 quintals/acre',
            'chickpea': '12-15 quintals/acre',
            'kidneybeans': '8-12 quintals/acre',
            'pigeonpeas': '10-14 quintals/acre',
            'mothbeans': '6-10 quintals/acre',
            'mungbean': '8-12 quintals/acre',
            'blackgram': '8-12 quintals/acre',
            'lentil': '10-14 quintals/acre',
            'pomegranate': '80-120 quintals/acre',
            'banana': '200-300 quintals/acre',
            'mango': '40-60 quintals/acre',
            'grapes': '80-120 quintals/acre',
            'watermelon': '150-200 quintals/acre',
            'muskmelon': '100-150 quintals/acre',
            'apple': '60-100 quintals/acre',
            'orange': '80-120 quintals/acre',
            'papaya': '150-200 quintals/acre',
            'coconut': '60-80 nuts/tree/year',
            'cotton': '18-22 quintals/acre',
            'jute': '20-25 quintals/acre',
            'coffee': '8-12 quintals/acre'
        }
        return yield_map.get(crop_name.lower(), '10-15 quintals/acre')
    
    def _get_market_potential(self, confidence):
        """Determine market potential based on confidence"""
        if confidence > 0.8:
            return "Very High"
        elif confidence > 0.6:
            return "High"
        elif confidence > 0.4:
            return "Good"
        else:
            return "Moderate"
    
    def _get_reasons(self, crop_name, input_data, confidence):
        """Generate reasons for recommendation"""
        reasons = []
        
        # Confidence-based reason
        if confidence > 0.7:
            reasons.append(f"Excellent match for your soil and climate conditions")
        elif confidence > 0.5:
            reasons.append(f"Good compatibility with your parameters")
        else:
            reasons.append(f"Suitable option for your conditions")
        
        # NPK-based reasons
        N, P, K = input_data['N'][0], input_data['P'][0], input_data['K'][0]
        if N > 70:
            reasons.append(f"High nitrogen content supports {crop_name} growth")
        if P > 50:
            reasons.append(f"Good phosphorus levels for root development")
        if K > 40:
            reasons.append(f"Adequate potassium for disease resistance")
        
        # Climate-based reasons
        temp = input_data['temperature'][0]
        if 20 <= temp <= 30:
            reasons.append(f"Optimal temperature range for {crop_name}")
        
        rainfall = input_data['rainfall'][0]
        if rainfall > 200:
            reasons.append(f"High rainfall suitable for water-intensive crop")
        elif rainfall < 100:
            reasons.append(f"Low water requirement matches rainfall pattern")
        
        return reasons[:3]  # Return top 3 reasons
    
    def _generate_reasoning(self, input_data, recommendations):
        """Generate overall reasoning"""
        top_crop = recommendations[0]['crop_name']
        confidence = recommendations[0]['confidence']
        
        N, P, K = input_data['N'][0], input_data['P'][0], input_data['K'][0]
        temp = input_data['temperature'][0]
        rainfall = input_data['rainfall'][0]
        
        reasoning = f"Based on your soil parameters (N:{N:.0f}, P:{P:.0f}, K:{K:.0f}, pH:{input_data['ph'][0]:.1f}) "
        reasoning += f"and climate conditions (Temp:{temp:.1f}°C, Humidity:{input_data['humidity'][0]:.0f}%, "
        reasoning += f"Rainfall:{rainfall:.0f}mm), {top_crop} is the most suitable crop with {confidence*100:.1f}% confidence. "
        reasoning += f"The soil nutrient levels and climate parameters align well with {top_crop} requirements."
        
        return reasoning

if __name__ == "__main__":
    # Test recommender
    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(os.path.dirname(script_dir), 'models')
    
    MODEL_PATH = os.path.join(models_dir, 'crop_model_best.joblib')
    ENCODER_PATH = os.path.join(models_dir, 'label_encoder.joblib')
    METADATA_PATH = os.path.join(models_dir, 'model_metadata.json')
    
    if os.path.exists(MODEL_PATH):
        recommender = CropRecommender(
            model_path=MODEL_PATH,
            encoder_path=ENCODER_PATH,
            metadata_path=METADATA_PATH
        )
        
        # Example prediction
        print("\n" + "="*60)
        print("EXAMPLE PREDICTION")
        print("="*60)
        
        result = recommender.predict(
            N=90, P=42, K=43,
            temperature=20.8, humidity=82,
            ph=6.5, rainfall=202
        )
        
        print(f"\nTop Recommendations:")
        for i, crop in enumerate(result['recommended_crops'], 1):
            print(f"\n{i}. {crop['crop_name']}")
            print(f"   Confidence: {crop['confidence']*100:.1f}%")
            print(f"   Expected Yield: {crop['expected_yield']}")
            print(f"   Market Potential: {crop['market_potential']}")
            print(f"   Reasons:")
            for reason in crop['reasons']:
                print(f"     - {reason}")
        
        print(f"\nOverall Confidence: {result['confidence_score']*100:.1f}%")
        print(f"\nReasoning: {result['reasoning']}")
    else:
        print(f"Model not found at {MODEL_PATH}")
        print("Train the model first using train.py")
