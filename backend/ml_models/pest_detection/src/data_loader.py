"""
Pest Detection Model - Data Loader
Handles image loading, preprocessing, and augmentation
"""

import os
import numpy as np
from PIL import Image
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.model_selection import train_test_split

class PestDataLoader:
    def __init__(self, data_dir, img_size=(224, 224), batch_size=32):
        """
        Initialize data loader
        
        Args:
            data_dir: Path to dataset directory
            img_size: Target image size (height, width)
            batch_size: Batch size for training
        """
        self.data_dir = data_dir
        self.img_size = img_size
        self.batch_size = batch_size
        self.class_names = []
        
    def load_dataset(self, validation_split=0.2):
        """
        Load and split dataset into train and validation sets
        
        Args:
            validation_split: Fraction of data to use for validation
            
        Returns:
            train_generator, val_generator, class_names
        """
        # Data augmentation for training
        train_datagen = ImageDataGenerator(
            rescale=1./255,
            rotation_range=20,
            width_shift_range=0.2,
            height_shift_range=0.2,
            shear_range=0.2,
            zoom_range=0.2,
            horizontal_flip=True,
            fill_mode='nearest',
            validation_split=validation_split
        )
        
        # Only rescaling for validation
        val_datagen = ImageDataGenerator(
            rescale=1./255,
            validation_split=validation_split
        )
        
        # Training generator
        train_generator = train_datagen.flow_from_directory(
            self.data_dir,
            target_size=self.img_size,
            batch_size=self.batch_size,
            class_mode='categorical',
            subset='training',
            shuffle=True
        )
        
        # Validation generator
        val_generator = val_datagen.flow_from_directory(
            self.data_dir,
            target_size=self.img_size,
            batch_size=self.batch_size,
            class_mode='categorical',
            subset='validation',
            shuffle=False
        )
        
        self.class_names = list(train_generator.class_indices.keys())
        
        return train_generator, val_generator, self.class_names
    
    def preprocess_image(self, image_path):
        """
        Preprocess a single image for prediction
        
        Args:
            image_path: Path to image file
            
        Returns:
            Preprocessed image array
        """
        img = Image.open(image_path)
        img = img.resize(self.img_size)
        img_array = np.array(img) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        return img_array
    
    def create_sample_dataset(self, output_dir):
        """
        Create a sample dataset structure for testing
        
        Args:
            output_dir: Directory to create sample dataset
        """
        classes = [
            'healthy',
            'leaf_blight',
            'aphid_infestation',
            'whitefly',
            'bacterial_blight',
            'fungal_infection'
        ]
        
        for class_name in classes:
            class_dir = os.path.join(output_dir, class_name)
            os.makedirs(class_dir, exist_ok=True)
            
            # Create placeholder images
            for i in range(10):
                img = Image.new('RGB', self.img_size, color=(
                    np.random.randint(0, 255),
                    np.random.randint(0, 255),
                    np.random.randint(0, 255)
                ))
                img.save(os.path.join(class_dir, f'sample_{i}.jpg'))
        
        print(f"Sample dataset created at {output_dir}")
        return classes

if __name__ == "__main__":
    # Test data loader
    loader = PestDataLoader(data_dir='data/raw')
    
    # Create sample dataset for testing
    sample_dir = 'data/sample'
    classes = loader.create_sample_dataset(sample_dir)
    print(f"Created {len(classes)} classes: {classes}")
