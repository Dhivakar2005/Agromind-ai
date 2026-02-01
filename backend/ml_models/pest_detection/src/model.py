"""
Pest Detection Model - CNN Architecture
Transfer learning with MobileNetV2
"""

import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau

class PestDetectionModel:
    def __init__(self, num_classes, img_size=(224, 224)):
        """
        Initialize pest detection model
        
        Args:
            num_classes: Number of pest/disease classes
            img_size: Input image size
        """
        self.num_classes = num_classes
        self.img_size = img_size
        self.model = None
        
    def build_model(self, trainable_layers=20):
        """
        Build CNN model using MobileNetV2 transfer learning
        
        Args:
            trainable_layers: Number of top layers to make trainable
            
        Returns:
            Compiled Keras model
        """
        # Load pre-trained MobileNetV2
        base_model = MobileNetV2(
            weights='imagenet',
            include_top=False,
            input_shape=(*self.img_size, 3)
        )
        
        # Freeze base model layers
        base_model.trainable = False
        
        # Build model
        self.model = models.Sequential([
            base_model,
            layers.GlobalAveragePooling2D(),
            layers.BatchNormalization(),
            layers.Dense(256, activation='relu'),
            layers.Dropout(0.5),
            layers.BatchNormalization(),
            layers.Dense(128, activation='relu'),
            layers.Dropout(0.3),
            layers.Dense(self.num_classes, activation='softmax')
        ])
        
        # Compile model
        self.model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss='categorical_crossentropy',
            metrics=['accuracy', tf.keras.metrics.TopKCategoricalAccuracy(k=3, name='top_3_accuracy')]
        )
        
        return self.model
    
    def fine_tune(self, trainable_layers=20):
        """
        Unfreeze top layers for fine-tuning
        
        Args:
            trainable_layers: Number of top layers to unfreeze
        """
        base_model = self.model.layers[0]
        base_model.trainable = True
        
        # Freeze all layers except the top ones
        for layer in base_model.layers[:-trainable_layers]:
            layer.trainable = False
        
        # Recompile with lower learning rate
        self.model.compile(
            optimizer=Adam(learning_rate=0.0001),
            loss='categorical_crossentropy',
            metrics=['accuracy', tf.keras.metrics.TopKCategoricalAccuracy(k=3, name='top_3_accuracy')]
        )
        
        print(f"Fine-tuning enabled for top {trainable_layers} layers")
    
    def get_callbacks(self, checkpoint_path='models/pest_detector_best.h5'):
        """
        Get training callbacks
        
        Args:
            checkpoint_path: Path to save best model
            
        Returns:
            List of callbacks
        """
        callbacks = [
            ModelCheckpoint(
                checkpoint_path,
                monitor='val_accuracy',
                save_best_only=True,
                mode='max',
                verbose=1
            ),
            EarlyStopping(
                monitor='val_loss',
                patience=10,
                restore_best_weights=True,
                verbose=1
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=5,
                min_lr=1e-7,
                verbose=1
            )
        ]
        return callbacks
    
    def summary(self):
        """Print model summary"""
        if self.model:
            return self.model.summary()
        else:
            print("Model not built yet. Call build_model() first.")
    
    def save_model(self, filepath):
        """Save model to file"""
        self.model.save(filepath)
        print(f"Model saved to {filepath}")
    
    def load_model(self, filepath):
        """Load model from file"""
        self.model = tf.keras.models.load_model(filepath)
        print(f"Model loaded from {filepath}")
        return self.model
    
    def convert_to_tflite(self, output_path='models/pest_detector.tflite'):
        """
        Convert model to TensorFlow Lite for mobile deployment
        
        Args:
            output_path: Path to save TFLite model
        """
        converter = tf.lite.TFLiteConverter.from_keras_model(self.model)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        tflite_model = converter.convert()
        
        with open(output_path, 'wb') as f:
            f.write(tflite_model)
        
        print(f"TFLite model saved to {output_path}")
        print(f"Model size: {len(tflite_model) / 1024:.2f} KB")

if __name__ == "__main__":
    # Test model creation
    model = PestDetectionModel(num_classes=6)
    model.build_model()
    model.summary()
