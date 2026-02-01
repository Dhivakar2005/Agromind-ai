"""
Pest Detection Training Script (PyTorch)
Compatible with Farmi Backend
"""
import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms
import time
import copy

def train_model(data_dir, num_epochs=25, batch_size=32):
    print(f"🚀 Starting training using data from: {data_dir}")
    
    # Data augmentation and normalization for training
    data_transforms = {
        'train': transforms.Compose([
            transforms.RandomResizedCrop(224),
            transforms.RandomHorizontalFlip(),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
        'val': transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
    }

    # Create datasets
    image_datasets = {}
    try:
        for x in ['train', 'val']:
            path = os.path.join(data_dir, x)
            if not os.path.exists(path):
                # Fallback to simple structure if train/val split doesn't exist
                print(f"⚠️ {path} not found. Using root dir split.")
                full_dataset = datasets.ImageFolder(data_dir, data_transforms['train'])
                train_size = int(0.8 * len(full_dataset))
                val_size = len(full_dataset) - train_size
                train_dataset, val_dataset = torch.utils.data.random_split(full_dataset, [train_size, val_size])
                image_datasets = {'train': train_dataset, 'val': val_dataset}
                break
            image_datasets[x] = datasets.ImageFolder(path, data_transforms[x])
    except Exception as e:
        print(f"❌ Error loading data: {e}")
        return

    dataloaders = {x: DataLoader(image_datasets[x], batch_size=batch_size, shuffle=True, num_workers=4)
                  for x in ['train', 'val']}
    
    # Get class names
    if hasattr(image_datasets['train'], 'classes'):
        class_names = image_datasets['train'].classes
    else:
        class_names = image_datasets['train'].dataset.classes
        
    print(f"📋 Classes found: {class_names}")
    dataset_sizes = {x: len(image_datasets[x]) for x in ['train', 'val']}
    
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"💻 Using device: {device}")

    # Load ResNet50
    model = models.resnet50(weights='DEFAULT')
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, len(class_names))

    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.SGD(model.parameters(), lr=0.001, momentum=0.9)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=7, gamma=0.1)

    since = time.time()
    best_model_wts = copy.deepcopy(model.state_dict())
    best_acc = 0.0

    for epoch in range(num_epochs):
        print(f'Epoch {epoch}/{num_epochs - 1}')
        print('-' * 10)

        for phase in ['train', 'val']:
            if phase == 'train':
                model.train()
            else:
                model.eval()

            running_loss = 0.0
            running_corrects = 0

            for inputs, labels in dataloaders[phase]:
                inputs = inputs.to(device)
                labels = labels.to(device)

                optimizer.zero_grad()

                with torch.set_grad_enabled(phase == 'train'):
                    outputs = model(inputs)
                    _, preds = torch.max(outputs, 1)
                    loss = criterion(outputs, labels)

                    if phase == 'train':
                        loss.backward()
                        optimizer.step()

                running_loss += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)
            
            if phase == 'train':
                scheduler.step()

            epoch_loss = running_loss / dataset_sizes[phase]
            epoch_acc = running_corrects.double() / dataset_sizes[phase]

            print(f'{phase} Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}')

            if phase == 'val' and epoch_acc > best_acc:
                best_acc = epoch_acc
                best_model_wts = copy.deepcopy(model.state_dict())

    time_elapsed = time.time() - since
    print(f'Training complete in {time_elapsed // 60:.0f}m {time_elapsed % 60:.0f}s')
    print(f'Best val Acc: {best_acc:4f}')

    # Save model
    model.load_state_dict(best_model_wts)
    save_path = os.path.join(os.path.dirname(data_dir), '..', 'models', 'custom_pest_model.pth')
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    torch.save(model.state_dict(), save_path)
    print(f"✅ Model saved to: {save_path}")

if __name__ == "__main__":
    # Default data path
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = os.path.join(BASE_DIR, '..', 'data', 'raw')
    
    if os.path.exists(DATA_DIR) and len(os.listdir(DATA_DIR)) > 0:
        train_model(DATA_DIR)
    else:
        print(f"❌ No data found at {DATA_DIR}")
        print("Please download datasets (IP102/PlantVillage) first.")
