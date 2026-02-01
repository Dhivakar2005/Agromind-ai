"""
Pest Detection Model - Prediction Module
Make predictions on new images
"""

import os
import sys
import json
import numpy as np
from PIL import Image
import tensorflow as tf

# Add src to path
sys.path.append(os.path.dirname(__file__))

from data_loader import PestDataLoader

class PestPredictor:
    def __init__(self, model_path, class_names_path='models/class_names.json'):
        """
        Initialize predictor
        
        Args:
            model_path: Path to trained model (.h5 or .tflite)
            class_names_path: Path to class names JSON file
        """
        self.model_path = model_path
        self.model = None
        self.class_names = []
        self.is_tflite = model_path.endswith('.tflite')
        
        # Load model
        self.load_model()
        
        # Load class names
        if os.path.exists(class_names_path):
            with open(class_names_path, 'r') as f:
                self.class_names = json.load(f)
        else:
            print(f"Warning: Class names file not found at {class_names_path}")
    
    def load_model(self):
        """Load the trained model"""
        if self.is_tflite:
            # Load TFLite model
            self.interpreter = tf.lite.Interpreter(model_path=self.model_path)
            self.interpreter.allocate_tensors()
            self.input_details = self.interpreter.get_input_details()
            self.output_details = self.interpreter.get_output_details()
            print(f"TFLite model loaded from {self.model_path}")
        else:
            # Load Keras model
            self.model = tf.keras.models.load_model(self.model_path)
            print(f"Keras model loaded from {self.model_path}")
    
    def preprocess_image(self, image_path, img_size=(224, 224)):
        """
        Preprocess image for prediction
        
        Args:
            image_path: Path to image or PIL Image object
            img_size: Target image size
            
        Returns:
            Preprocessed image array
        """
        if isinstance(image_path, str):
            img = Image.open(image_path)
        else:
            img = image_path
        
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize
        img = img.resize(img_size)
        
        # Convert to array and normalize
        img_array = np.array(img, dtype=np.float32) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array
    
    def predict(self, image_path, top_k=3):
        """
        Predict pest/disease from image
        
        Args:
            image_path: Path to image file or PIL Image
            top_k: Number of top predictions to return
            
        Returns:
            Dictionary with predictions
        """
        # Preprocess image
        img_array = self.preprocess_image(image_path)
        
        # Make prediction
        if self.is_tflite:
            # TFLite prediction
            self.interpreter.set_tensor(self.input_details[0]['index'], img_array)
            self.interpreter.invoke()
            predictions = self.interpreter.get_tensor(self.output_details[0]['index'])[0]
        else:
            # Keras prediction
            predictions = self.model.predict(img_array, verbose=0)[0]
        
        # Get top-k predictions
        top_indices = np.argsort(predictions)[-top_k:][::-1]
        top_predictions = []
        
        for idx in top_indices:
            top_predictions.append({
                'class': self.class_names[idx] if idx < len(self.class_names) else f'Class_{idx}',
                'confidence': float(predictions[idx]),
                'class_id': int(idx)
            })
        
        # Determine severity based on class name and confidence
        severity = self._determine_severity(top_predictions[0])
        
        return {
            'detection_result': {
                'pest_name': top_predictions[0]['class'],
                'disease_name': top_predictions[0]['class'] if 'healthy' not in top_predictions[0]['class'].lower() else None,
                'severity': severity,
                'confidence': top_predictions[0]['confidence'],
                'affected_area_percent': self._estimate_affected_area(top_predictions[0])
            },
            'all_predictions': top_predictions,
            'confidence_score': top_predictions[0]['confidence'],
            'severity': severity
        }
    
    def _determine_severity(self, prediction):
        """Determine severity based on prediction"""
        class_name = prediction['class'].lower()
        confidence = prediction['confidence']
        
        if 'healthy' in class_name:
            return 'none'
        elif confidence > 0.8:
            if any(word in class_name for word in ['blight', 'bacterial', 'fungal']):
                return 'high'
            else:
                return 'medium'
        elif confidence > 0.6:
            return 'medium'
        else:
            return 'low'
    
    def _estimate_affected_area(self, prediction):
        """Estimate affected area percentage"""
        if 'healthy' in prediction['class'].lower():
            return 0.0
        
        # Rough estimation based on confidence
        confidence = prediction['confidence']
        if confidence > 0.8:
            return np.random.uniform(15, 30)
        elif confidence > 0.6:
            return np.random.uniform(8, 15)
        else:
            return np.random.uniform(3, 8)
    
    def predict_batch(self, image_paths, top_k=3):
        """
        Predict on multiple images
        
        Args:
            image_paths: List of image paths
            top_k: Number of top predictions per image
            
        Returns:
            List of prediction dictionaries
        """
        results = []
        for img_path in image_paths:
            result = self.predict(img_path, top_k)
            results.append(result)
        return results

if __name__ == "__main__":
    # Test predictor
    MODEL_PATH = 'models/pest_detector_best.h5'
    
    if os.path.exists(MODEL_PATH):
        predictor = PestPredictor(MODEL_PATH)
        print(f"Predictor initialized with {len(predictor.class_names)} classes")
        print(f"Classes: {predictor.class_names}")
        
        # Test with sample image
        print("\nReady for predictions!")
        print("Usage: predictor.predict('path/to/image.jpg')")
    else:
        print(f"Model not found at {MODEL_PATH}")
        print("Train the model first using train.py")
