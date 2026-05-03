"""
Plant Disease Dataset Downloader
=====================================
Downloads PlantDoc dataset from Roboflow public universe.
Auto-converts to YOLOv8 format.

Usage:
    python download_dataset.py

Requirements:
    pip install roboflow requests tqdm
"""

import os
import sys
import json
import zipfile
import shutil
import requests
from pathlib import Path
from tqdm import tqdm

# ── Configuration ─────────────────────────────────────────────────────────────
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = BASE_DIR / "dataset"
DATASET_DIR.mkdir(parents=True, exist_ok=True)

# PlantDoc Object Detection Dataset — corrected repo (master branch)
PLANTDOC_ZIP_URL = "https://github.com/pratikkayal/PlantDoc-Object-Detection-Dataset/archive/refs/heads/master.zip"
EXTRACT_ROOT_NAME = "PlantDoc-Object-Detection-Dataset-master"

# ── Disease Class Mapping ──────────────────────────────────────────────────────
# Normalize raw class names → clean names
CLASS_MAPPING = {
    "Tomato leaf": "Tomato - Healthy",
    "Tomato Early blight leaf": "Tomato - Early Blight",
    "Tomato late blight leaf": "Tomato - Late Blight",
    "Tomato mold leaf": "Tomato - Leaf Mold",
    "Tomato Septoria leaf spot": "Tomato - Septoria Leaf Spot",
    "Tomato leaf bacterial spot": "Tomato - Bacterial Spot",
    "Tomato leaf mosaic virus": "Tomato - Mosaic Virus",
    "Tomato leaf yellow virus": "Tomato - Yellow Leaf Curl Virus",
    "Potato leaf": "Potato - Healthy",
    "Potato leaf early blight": "Potato - Early Blight",
    "Potato leaf late blight": "Potato - Late Blight",
    "Corn leaf blight": "Corn - Northern Leaf Blight",
    "Corn Gray leaf spot": "Corn - Gray Leaf Spot",
    "Corn rust leaf": "Corn - Common Rust",
    "Squash Powdery mildew leaf": "Squash - Powdery Mildew",
    "Apple leaf": "Apple - Healthy",
    "Apple Scab Leaf": "Apple - Scab",
    "Apple rust leaf": "Apple - Cedar Rust",
    "apple leaf with powdery mildew": "Apple - Powdery Mildew",
    "Blueberry leaf": "Blueberry - Healthy",
    "Bell pepper leaf": "Pepper - Healthy",
    "Bell pepper leaf spot": "Pepper - Bacterial Spot",
    "Cherry leaf": "Cherry - Healthy",
    "grape leaf": "Grape - Healthy",
    "Grape leaf black rot": "Grape - Black Rot",
    "Peach leaf": "Peach - Healthy",
    "Raspberry leaf": "Raspberry - Healthy",
    "Soyabean leaf": "Soybean - Healthy",
    "Soybean leaf": "Soybean - Healthy",
    "Strawberry leaf": "Strawberry - Healthy",
}

# ── Download Helper ────────────────────────────────────────────────────────────
def download_with_progress(url: str, dest: Path, desc: str = "Downloading"):
    """Download a file with a progress bar."""
    headers = {"User-Agent": "Mozilla/5.0 (compatible; AgroMind/1.0)"}
    
    with requests.get(url, stream=True, headers=headers, timeout=120) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        with open(dest, "wb") as f, tqdm(
            total=total, unit="B", unit_scale=True, desc=desc
        ) as bar:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
                bar.update(len(chunk))

    print(f"[OK] Downloaded → {dest}")


def extract_zip(zip_path: Path, extract_to: Path):
    """
    Extract a zip file — handles Windows MAX_PATH (260 char) limit
    by renaming long filenames on the fly.
    """
    print(f"[EXTRACT] Extracting {zip_path.name} (may take a few minutes)...")
    img_extensions = {".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"}

    with zipfile.ZipFile(str(zip_path), "r") as z:
        members = z.infolist()
        total = len(members)
        extracted = 0
        skipped   = 0

        for member in members:
            # Build target path
            raw_target = extract_to / member.filename

            # If directory, create and continue
            if member.filename.endswith("/"):
                raw_target.mkdir(parents=True, exist_ok=True)
                continue

            # Only extract image files (skip ultra-long non-image files)
            suffix = Path(member.filename).suffix.lower()
            if suffix not in {".jpg", ".jpeg", ".png"}:
                continue

            # Ensure parent dir exists
            raw_target.parent.mkdir(parents=True, exist_ok=True)

            # Shorten very long filenames to avoid MAX_PATH errors
            filename_stem = Path(member.filename).stem[:60]  # Max 60 chars stem
            short_name    = filename_stem + suffix
            target_path   = raw_target.parent / short_name

            try:
                data = z.read(member.filename)
                with open(str(target_path), "wb") as f:
                    f.write(data)
                extracted += 1
            except (OSError, FileNotFoundError) as e:
                skipped += 1

        print(f"[OK] Extracted {extracted} images (skipped {skipped}) → {extract_to}")




def convert_plantdoc_to_yolo(raw_dir: Path, out_dir: Path, class_names: list):
    """
    Convert PlantDoc XML/text annotations to YOLO format.
    PlantDoc GitHub repo has images organized in disease folders.
    We treat each folder as a class.
    """
    print("[CONVERT] Converting PlantDoc to YOLO format...")
    
    images_train = out_dir / "images" / "train"
    images_val = out_dir / "images" / "val"
    labels_train = out_dir / "labels" / "train"
    labels_val = out_dir / "labels" / "val"
    
    for d in [images_train, images_val, labels_train, labels_val]:
        d.mkdir(parents=True, exist_ok=True)

    img_extensions = {".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"}
    total_converted = 0
    val_ratio = 0.2

    # PlantDoc GitHub structure: root/<ClassName>/<image.jpg>
    for cls_folder in sorted(raw_dir.iterdir()):
        if not cls_folder.is_dir():
            continue
        
        raw_name = cls_folder.name
        
        # Get or assign class index
        if raw_name not in class_names:
            class_names.append(raw_name)
        cls_id = class_names.index(raw_name)
        
        imgs = [f for f in cls_folder.iterdir() if f.suffix in img_extensions]
        split_idx = int(len(imgs) * (1 - val_ratio))
        
        for i, img_path in enumerate(imgs):
            is_val = i >= split_idx
            dst_img_dir = images_val if is_val else images_train
            dst_lbl_dir = labels_val if is_val else labels_train
            
            # Copy image
            dst_img = dst_img_dir / img_path.name
            shutil.copy2(img_path, dst_img)
            
            # Create a YOLO label: full-image bounding box (classification-style)
            # Format: class_id x_center y_center width height (all normalized 0-1)
            # Since PlantDoc GitHub structure has no annotations, use full crop as bbox
            label_file = dst_lbl_dir / (img_path.stem + ".txt")
            with open(label_file, "w") as lf:
                # Full image bbox: center (0.5, 0.5), size (1.0, 1.0)
                lf.write(f"{cls_id} 0.5 0.5 1.0 1.0\n")
            
            total_converted += 1

    print(f"[OK] Converted {total_converted} images across {len(class_names)} classes")
    return class_names


def generate_data_yaml(out_dir: Path, class_names: list):
    """Generate the data.yaml for YOLOv8 training."""
    yaml_path = out_dir.parent / "data.yaml"
    
    content = f"""# Agromind Plant Disease Detection Dataset
# Generated by download_dataset.py

path: {out_dir.as_posix()}
train: images/train
val: images/val

nc: {len(class_names)}
names:
"""
    for name in class_names:
        content += f"  - '{name}'\n"
    
    with open(yaml_path, "w") as f:
        f.write(content)
    
    print(f"[OK] data.yaml written → {yaml_path}")
    return yaml_path


def main():
    print("=" * 60)
    print("  Agromind - Plant Disease Dataset Downloader")
    print("=" * 60)

    # ── Step 1: Download PlantDoc GitHub Dataset ───────────────────────────────
    zip_path = DATASET_DIR / "plantdoc_raw.zip"
    
    if not zip_path.exists():
        print("\n[STEP 1] Downloading PlantDoc dataset from GitHub...")
        try:
            download_with_progress(PLANTDOC_ZIP_URL, zip_path, "PlantDoc")
        except Exception as e:
            print(f"[ERROR] Download failed: {e}")
            print("[FALLBACK] Using manual download instructions:")
            print("  1. Go to: https://github.com/pratikkayal/PlantDoc-Object-Detection-Dataset")
            print("  2. Click Code → Download ZIP")
            print(f"  3. Place the ZIP at: {zip_path}")
            sys.exit(1)
    else:
        print(f"[SKIP] PlantDoc zip already exists: {zip_path}")

    # ── Step 2: Extract ────────────────────────────────────────────────────────
    raw_extract_dir = DATASET_DIR / "plantdoc_raw"
    if not raw_extract_dir.exists():
        print("\n[STEP 2] Extracting dataset...")
        extract_zip(zip_path, DATASET_DIR)
        # GitHub zips extract as <repo>-master/
        extracted_root = DATASET_DIR / EXTRACT_ROOT_NAME
        if extracted_root.exists():
            extracted_root.rename(raw_extract_dir)
    else:
        print(f"[SKIP] Already extracted: {raw_extract_dir}")


    # ── Step 3: Convert to YOLO Format ────────────────────────────────────────
    yolo_dir = DATASET_DIR / "yolo_format"
    class_names = []
    
    print("\n[STEP 3] Converting to YOLO format...")
    
    # PlantDoc has train/test folders
    for split_folder_name in ["train", "test"]:
        split_folder = raw_extract_dir / split_folder_name
        if split_folder.exists():
            class_names = convert_plantdoc_to_yolo(split_folder, yolo_dir, class_names)

    # ── Step 4: Generate data.yaml ─────────────────────────────────────────────
    print("\n[STEP 4] Generating data.yaml...")
    yaml_path = generate_data_yaml(yolo_dir, class_names)

    # ── Done ──────────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  DATASET READY!")
    print("=" * 60)
    print(f"  YOLO Dataset : {yolo_dir}")
    print(f"  data.yaml    : {yaml_path}")
    print(f"  Classes      : {len(class_names)}")
    print(f"  Class List   : {class_names[:5]}...")
    print("\n  Next Step: Run train_yolo.py to train the model!")
    print("=" * 60)
    
    # Save class list for other scripts
    classes_json = DATASET_DIR / "class_names.json"
    with open(classes_json, "w") as f:
        json.dump(class_names, f, indent=2)
    print(f"[OK] Class names saved → {classes_json}")


if __name__ == "__main__":
    main()
