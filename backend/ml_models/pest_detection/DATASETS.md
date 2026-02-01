# 📦 Agricultural Pest & Disease Datasets

To train a custom model, you need to download these datasets manually (due to their large size and license requirements).

## 1. IP102 Dataset (Pests) 🏆
**Best for:** Insect pest recognition.
- **Size:** ~2 GB
- **Classes:** 102
- **Download:** [GitHub Repo](https://github.com/xpwu95/IP102) or [Kaggle Link](https://www.kaggle.com/datasets)
- **Instructions:**
  1. Download the dataset.
  2. Extract images into `backend/ml_models/pest_detection/data/raw/ip102`.

## 2. PlantVillage Dataset (Diseases) 🌿
**Best for:** Crop disease classification (leaves).
- **Size:** ~1 GB
- **Classes:** 38 (Disease + Healthy pairs)
- **Download:** [Kaggle Link](https://www.kaggle.com/datasets/emmarex/plantdisease)
- **Instructions:**
  1. Download.
  2. Extract into `backend/ml_models/pest_detection/data/raw/plant_village`.

## 3. AgroPest-12
**Best for:** Real-world field pests.
- **Download:** Search on Kaggle.

---

## 🚀 How to Train
Once you have downloaded the data and placed it in `data/raw`, run:
```bash
cd backend/ml_models/pest_detection/src
python train_torch.py --epochs 10
```
This will generate a `custom_pest_model.pth` that is fully compatible with the Farmi backend.
