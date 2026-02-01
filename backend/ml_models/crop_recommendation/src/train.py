"""
Crop Recommendation Model - Training Script
Train XGBoost classifier on crop recommendation dataset
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from xgboost import XGBClassifier
import joblib
import json
import os
from datetime import datetime

class CropRecommendationTrainer:
    def __init__(self, data_path='data/crop_data.csv', output_dir='models'):
        """
        Initialize crop recommendation trainer
        
        Args:
            data_path: Path to CSV dataset
            output_dir: Directory to save models
        """
        self.data_path = data_path
        self.output_dir = output_dir
        self.model = None
        self.label_encoder = None
        self.feature_names = None
        
        os.makedirs(output_dir, exist_ok=True)
    
    def load_data(self):
        """Load and explore the dataset"""
        print("="*60)
        print("CROP RECOMMENDATION MODEL TRAINING")
        print("="*60)
        
        print("\n[1/6] Loading dataset...")
        self.df = pd.read_csv(self.data_path)
        
        print(f"\nDataset shape: {self.df.shape}")
        print(f"\nColumns: {list(self.df.columns)}")
        print(f"\nFirst few rows:")
        print(self.df.head())
        
        print(f"\nCrop distribution:")
        print(self.df['label'].value_counts())
        
        print(f"\nMissing values:")
        print(self.df.isnull().sum())
        
        print(f"\nDataset statistics:")
        print(self.df.describe())
        
        return self.df
    
    def preprocess_data(self):
        """Preprocess the data"""
        print("\n[2/6] Preprocessing data...")
        
        # Separate features and target
        X = self.df.drop('label', axis=1)
        y = self.df['label']
        
        # Store feature names
        self.feature_names = list(X.columns)
        print(f"Features: {self.feature_names}")
        
        # Encode target labels
        self.label_encoder = LabelEncoder()
        y_encoded = self.label_encoder.fit_transform(y)
        
        print(f"\nCrops encoded:")
        for i, crop in enumerate(self.label_encoder.classes_):
            print(f"  {i}: {crop}")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
        )
        
        print(f"\nTraining set: {X_train.shape[0]} samples")
        print(f"Test set: {X_test.shape[0]} samples")
        
        return X_train, X_test, y_train, y_test
    
    def train_model(self, X_train, y_train):
        """Train XGBoost model"""
        print("\n[3/6] Training XGBoost model...")
        
        self.model = XGBClassifier(
            n_estimators=200,
            max_depth=10,
            learning_rate=0.1,
            random_state=42,
            eval_metric='mlogloss'
        )
        
        self.model.fit(X_train, y_train)
        
        print("Training complete!")
        return self.model
    
    def evaluate_model(self, X_test, y_test):
        """Evaluate model performance"""
        print("\n[4/6] Evaluating model...")
        
        # Predictions
        y_pred = self.model.predict(X_test)
        
        # Accuracy
        accuracy = accuracy_score(y_test, y_pred)
        print(f"\nTest Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")
        
        # Classification report
        print("\nClassification Report:")
        print(classification_report(
            y_test, y_pred,
            target_names=self.label_encoder.classes_,
            zero_division=0
        ))
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        
        # Plot confusion matrix
        plt.figure(figsize=(12, 10))
        sns.heatmap(
            cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=self.label_encoder.classes_,
            yticklabels=self.label_encoder.classes_
        )
        plt.title('Confusion Matrix')
        plt.ylabel('True Label')
        plt.xlabel('Predicted Label')
        plt.xticks(rotation=45, ha='right')
        plt.yticks(rotation=0)
        plt.tight_layout()
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        cm_path = os.path.join(self.output_dir, f'confusion_matrix_{timestamp}.png')
        plt.savefig(cm_path, dpi=300, bbox_inches='tight')
        print(f"\nConfusion matrix saved to {cm_path}")
        
        # Feature importance
        self.plot_feature_importance(timestamp)
        
        return accuracy
    
    def plot_feature_importance(self, timestamp):
        """Plot feature importance"""
        importance = self.model.feature_importances_
        indices = np.argsort(importance)[::-1]
        
        plt.figure(figsize=(10, 6))
        plt.title('Feature Importance')
        plt.bar(range(len(importance)), importance[indices])
        plt.xticks(range(len(importance)), 
                   [self.feature_names[i] for i in indices],
                   rotation=45)
        plt.tight_layout()
        
        fi_path = os.path.join(self.output_dir, f'feature_importance_{timestamp}.png')
        plt.savefig(fi_path, dpi=300, bbox_inches='tight')
        print(f"Feature importance saved to {fi_path}")
    
    def save_model(self):
        """Save model and metadata"""
        print("\n[5/6] Saving model...")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save model
        model_path = os.path.join(self.output_dir, f'crop_model_{timestamp}.joblib')
        joblib.dump(self.model, model_path)
        print(f"Model saved to {model_path}")
        
        # Save best model (overwrite)
        best_model_path = os.path.join(self.output_dir, 'crop_model_best.joblib')
        joblib.dump(self.model, best_model_path)
        print(f"Best model saved to {best_model_path}")
        
        # Save label encoder
        encoder_path = os.path.join(self.output_dir, 'label_encoder.joblib')
        joblib.dump(self.label_encoder, encoder_path)
        print(f"Label encoder saved to {encoder_path}")
        
        # Save metadata
        metadata = {
            'crops': list(self.label_encoder.classes_),
            'features': self.feature_names,
            'n_crops': len(self.label_encoder.classes_),
            'n_features': len(self.feature_names),
            'timestamp': timestamp
        }
        
        metadata_path = os.path.join(self.output_dir, 'model_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        print(f"Metadata saved to {metadata_path}")
        
        return model_path
    
    def train(self):
        """Complete training pipeline"""
        # Load data
        self.load_data()
        
        # Preprocess
        X_train, X_test, y_train, y_test = self.preprocess_data()
        
        # Train
        self.train_model(X_train, y_train)
        
        # Evaluate
        accuracy = self.evaluate_model(X_test, y_test)
        
        # Save
        model_path = self.save_model()
        
        print("\n" + "="*60)
        print("TRAINING COMPLETE!")
        print("="*60)
        print(f"\nFinal Test Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")
        print(f"Model saved to: {model_path}")
        print(f"\nCrops supported: {len(self.label_encoder.classes_)}")
        print(f"Crops: {', '.join(self.label_encoder.classes_)}")
        
        return self.model, accuracy

if __name__ == "__main__":
    # Train model
    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(os.path.dirname(script_dir), 'data', 'crop_data.csv')
    output_dir = os.path.join(os.path.dirname(script_dir), 'models')
    
    trainer = CropRecommendationTrainer(
        data_path=data_path,
        output_dir=output_dir
    )
    
    model, accuracy = trainer.train()
    
    print("\n✅ Model ready for predictions!")
