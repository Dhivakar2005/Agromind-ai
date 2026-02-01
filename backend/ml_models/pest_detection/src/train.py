"""
Pest Detection Model - Training Script
Train the CNN model on pest/disease dataset
"""

import os
import sys
import json
import matplotlib.pyplot as plt
from datetime import datetime

# Add src to path
sys.path.append(os.path.dirname(__file__))

from data_loader import PestDataLoader
from model import PestDetectionModel

class ModelTrainer:
    def __init__(self, data_dir, output_dir='models'):
        """
        Initialize model trainer
        
        Args:
            data_dir: Path to dataset directory
            output_dir: Directory to save models and results
        """
        self.data_dir = data_dir
        self.output_dir = output_dir
        self.history = None
        
        os.makedirs(output_dir, exist_ok=True)
    
    def train(self, epochs=50, batch_size=32, fine_tune_epochs=30):
        """
        Train the model
        
        Args:
            epochs: Number of epochs for initial training
            batch_size: Batch size
            fine_tune_epochs: Number of epochs for fine-tuning
        """
        print("="*60)
        print("PEST DETECTION MODEL TRAINING")
        print("="*60)
        
        # Load data
        print("\n[1/5] Loading dataset...")
        loader = PestDataLoader(self.data_dir, batch_size=batch_size)
        train_gen, val_gen, class_names = loader.load_dataset()
        
        print(f"Classes found: {len(class_names)}")
        print(f"Class names: {class_names}")
        print(f"Training samples: {train_gen.samples}")
        print(f"Validation samples: {val_gen.samples}")
        
        # Build model
        print("\n[2/5] Building model...")
        model_builder = PestDetectionModel(num_classes=len(class_names))
        model = model_builder.build_model()
        model_builder.summary()
        
        # Train model
        print(f"\n[3/5] Training model ({epochs} epochs)...")
        callbacks = model_builder.get_callbacks(
            checkpoint_path=os.path.join(self.output_dir, 'pest_detector_best.h5')
        )
        
        history1 = model.fit(
            train_gen,
            epochs=epochs,
            validation_data=val_gen,
            callbacks=callbacks,
            verbose=1
        )
        
        # Fine-tune model
        print(f"\n[4/5] Fine-tuning model ({fine_tune_epochs} epochs)...")
        model_builder.fine_tune(trainable_layers=20)
        
        history2 = model.fit(
            train_gen,
            epochs=fine_tune_epochs,
            validation_data=val_gen,
            callbacks=callbacks,
            verbose=1
        )
        
        # Combine histories
        self.history = {
            'accuracy': history1.history['accuracy'] + history2.history['accuracy'],
            'val_accuracy': history1.history['val_accuracy'] + history2.history['val_accuracy'],
            'loss': history1.history['loss'] + history2.history['loss'],
            'val_loss': history1.history['val_loss'] + history2.history['val_loss']
        }
        
        # Save final model
        print("\n[5/5] Saving models...")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save Keras model
        model_path = os.path.join(self.output_dir, f'pest_detector_{timestamp}.h5')
        model_builder.save_model(model_path)
        
        # Convert to TFLite
        tflite_path = os.path.join(self.output_dir, f'pest_detector_{timestamp}.tflite')
        model_builder.convert_to_tflite(tflite_path)
        
        # Save class names
        class_names_path = os.path.join(self.output_dir, 'class_names.json')
        with open(class_names_path, 'w') as f:
            json.dump(class_names, f, indent=2)
        
        # Save training history
        history_path = os.path.join(self.output_dir, f'training_history_{timestamp}.json')
        with open(history_path, 'w') as f:
            json.dump(self.history, f, indent=2)
        
        # Plot training history
        self.plot_history(save_path=os.path.join(self.output_dir, f'training_plot_{timestamp}.png'))
        
        # Evaluate model
        print("\n" + "="*60)
        print("TRAINING COMPLETE!")
        print("="*60)
        print(f"\nFinal Validation Accuracy: {self.history['val_accuracy'][-1]:.4f}")
        print(f"Final Validation Loss: {self.history['val_loss'][-1]:.4f}")
        print(f"\nModels saved:")
        print(f"  - Keras model: {model_path}")
        print(f"  - TFLite model: {tflite_path}")
        print(f"  - Class names: {class_names_path}")
        
        return model, self.history
    
    def plot_history(self, save_path=None):
        """
        Plot training history
        
        Args:
            save_path: Path to save plot image
        """
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
        
        # Accuracy plot
        ax1.plot(self.history['accuracy'], label='Training Accuracy')
        ax1.plot(self.history['val_accuracy'], label='Validation Accuracy')
        ax1.set_title('Model Accuracy')
        ax1.set_xlabel('Epoch')
        ax1.set_ylabel('Accuracy')
        ax1.legend()
        ax1.grid(True)
        
        # Loss plot
        ax2.plot(self.history['loss'], label='Training Loss')
        ax2.plot(self.history['val_loss'], label='Validation Loss')
        ax2.set_title('Model Loss')
        ax2.set_xlabel('Epoch')
        ax2.set_ylabel('Loss')
        ax2.legend()
        ax2.grid(True)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"Training plot saved to {save_path}")
        else:
            plt.show()

if __name__ == "__main__":
    # Configuration
    DATA_DIR = 'data/raw'  # Update this to your dataset path
    OUTPUT_DIR = 'models'
    
    # Check if data directory exists
    if not os.path.exists(DATA_DIR):
        print(f"Data directory not found: {DATA_DIR}")
        print("Creating sample dataset for testing...")
        
        loader = PestDataLoader(DATA_DIR)
        loader.create_sample_dataset(DATA_DIR)
        print(f"Sample dataset created at {DATA_DIR}")
        print("Replace with real dataset for actual training.")
    
    # Train model
    trainer = ModelTrainer(DATA_DIR, OUTPUT_DIR)
    model, history = trainer.train(
        epochs=10,  # Reduce for testing
        batch_size=16,
        fine_tune_epochs=5
    )
