"""
YOLOv8n Plant Disease Training Pipeline
========================================
Transfer-learns YOLOv8n on the PlantDoc disease dataset.

Usage:
    python train_yolo.py [--epochs 50] [--batch 16] [--imgsz 640]

Requirements:
    pip install ultralytics
"""

import os
import sys
import argparse
import json
from pathlib import Path

# ── Dependency Check ──────────────────────────────────────────────────────────
try:
    from ultralytics import YOLO
    import yaml
except ImportError:
    print("[ERROR] Missing dependencies. Run:")
    print("    pip install ultralytics pyyaml")
    sys.exit(1)

# ── Configuration ─────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).resolve().parent.parent
DATA_YAML  = BASE_DIR / "data.yaml"
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

PRETRAINED_MODEL = "yolov8n.pt"   # Nano — fast / low resource
OUTPUT_NAME      = "yolov8n_plant_disease"


def verify_dataset(yaml_path: Path):
    """Sanity-check the data.yaml before training."""
    if not yaml_path.exists():
        print(f"[ERROR] data.yaml not found at {yaml_path}")
        print("  Run: python src/download_dataset.py first")
        sys.exit(1)

    with open(yaml_path) as f:
        cfg = yaml.safe_load(f)

    train_path = Path(cfg.get("path", "")) / cfg.get("train", "images/train")
    val_path   = Path(cfg.get("path", "")) / cfg.get("val", "images/val")

    train_imgs = list(train_path.glob("**/*.jpg")) + list(train_path.glob("**/*.png"))
    val_imgs   = list(val_path.glob("**/*.jpg")) + list(val_path.glob("**/*.png"))

    print(f"[OK] Dataset verified:")
    print(f"   Classes   : {cfg['nc']} ({', '.join(cfg['names'][:5])}...)")
    print(f"   Train imgs: {len(train_imgs)}")
    print(f"   Val imgs  : {len(val_imgs)}")

    if len(train_imgs) == 0:
        print("[ERROR] No training images found. Check dataset path in data.yaml.")
        sys.exit(1)

    return cfg


def train(epochs: int = 30, batch: int = 16, imgsz: int = 640, device: str = "auto", resume: bool = False):
    """
    Train YOLOv8n on the plant disease dataset using transfer learning.
    
    Args:
        epochs : Number of training epochs (default 50, recommend 100 for GPU)
        batch  : Batch size per step (reduce to 8 if low VRAM)
        imgsz  : Input image size (640 is YOLO default)
        device : 'cpu', '0' (GPU), or 'auto'
        resume : Resume training from last checkpoint
    """
    print("=" * 60)
    print("  Agromind - YOLOv8n Plant Disease Training")
    print("=" * 60)

    # Verify dataset
    cfg = verify_dataset(DATA_YAML)

    # Load model
    if resume:
        last_weights = MODELS_DIR / OUTPUT_NAME / "weights" / "last.pt"
        if not last_weights.exists():
            print(f"[WARN] No checkpoint found at {last_weights}, starting fresh.")
            model = YOLO(PRETRAINED_MODEL)
            resume = False
        else:
            print(f"\n[LOAD] Resuming from checkpoint: {last_weights}")
            model = YOLO(str(last_weights))
    else:
        print(f"\n[LOAD] Loading pretrained YOLOv8n: {PRETRAINED_MODEL}")
        model = YOLO(PRETRAINED_MODEL)

    # ── Training Arguments ─────────────────────────────────────────────────────
    train_args = dict(
        data      = str(DATA_YAML),
        epochs    = epochs,
        imgsz     = imgsz,
        batch     = batch,
        device    = device,
        project   = str(MODELS_DIR),
        name      = OUTPUT_NAME,
        pretrained= True,
        resume    = resume,
        patience  = 20,           # Early stopping
        save      = True,
        exist_ok  = True,


        # ── Augmentation (simulates real farm conditions) ──────────────────────
        hsv_h     = 0.015,        # Hue variation
        hsv_s     = 0.7,          # Saturation variation
        hsv_v     = 0.4,          # Brightness/contrast variation
        degrees   = 15.0,         # Random rotation (±15°)
        flipud    = 0.1,          # Vertical flip probability
        fliplr    = 0.5,          # Horizontal flip probability
        mosaic    = 1.0,          # Mosaic augmentation (combines 4 images)
        mixup     = 0.1,          # Mixup augmentation
        erasing   = 0.1,          # Random erasing (replaces 'blur' in v8.x)

        # ── Optimizer ─────────────────────────────────────────────────────────
        optimizer = "AdamW",
        lr0       = 0.001,
        lrf       = 0.01,
        weight_decay = 0.0005,
        warmup_epochs = 3.0,

        # ── Output ────────────────────────────────────────────────────────────
        plots     = True,
        verbose   = True,
        amp       = False,        # Disable AMP to fix checkpoint resuming from CPU
    )


    print(f"\n[START] Training YOLOv8n for {epochs} epochs...")
    print(f"   Data    : {DATA_YAML}")
    print(f"   Batch   : {batch}")
    print(f"   ImgSize : {imgsz}")
    print(f"   Device  : {device}")
    print(f"   Output  : {MODELS_DIR / OUTPUT_NAME}")
    print("-" * 60)

    results = model.train(**train_args)

    # ── Post-Training ──────────────────────────────────────────────────────────
    print("\n[DONE] Training complete!")
    print(f"   Best model : {MODELS_DIR / OUTPUT_NAME / 'weights' / 'best.pt'}")
    
    # Copy best.pt to top-level models dir for easy access
    best_src  = MODELS_DIR / OUTPUT_NAME / "weights" / "best.pt"
    best_dest = MODELS_DIR / "yolov8n_plant_disease.pt"
    
    if best_src.exists():
        import shutil
        shutil.copy2(best_src, best_dest)
        print(f"   Saved as   : {best_dest}")

    # Save class names alongside model
    class_names_dest = MODELS_DIR / "class_names.json"
    with open(class_names_dest, "w") as cf:
        json.dump(cfg["names"], cf, indent=2)
    print(f"   Classes    : {class_names_dest}")
    
    print("\n" + "=" * 60)
    print("  NEXT: Run the backend server to use the trained model!")
    print("=" * 60)

    return results


def evaluate(model_path: str = None):
    """Evaluate the trained model and print mAP metrics."""
    if model_path is None:
        model_path = str(MODELS_DIR / "yolov8n_plant_disease.pt")

    if not Path(model_path).exists():
        print(f"[ERROR] Model not found: {model_path}")
        print("  Train first: python src/train_yolo.py")
        sys.exit(1)

    print(f"\n[EVAL] Evaluating model: {model_path}")
    model = YOLO(model_path)
    metrics = model.val(data=str(DATA_YAML))

    print("\n── Evaluation Results ────────────────")
    print(f"  mAP@50      : {metrics.box.map50:.4f}")
    print(f"  mAP@50-95   : {metrics.box.map:.4f}")
    print(f"  Precision   : {metrics.box.p.mean():.4f}")
    print(f"  Recall      : {metrics.box.r.mean():.4f}")
    print("─" * 40)
    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train YOLOv8n for plant disease detection")
    parser.add_argument("--epochs",  type=int,   default=30,    help="Number of training epochs")
    parser.add_argument("--batch",   type=int,   default=16,    help="Batch size")
    parser.add_argument("--imgsz",   type=int,   default=640,   help="Image size")
    parser.add_argument("--device",  type=str,   default="auto",help="Device: cpu, 0, auto")
    parser.add_argument("--resume",  action="store_true",       help="Resume training from previous checkpoint")
    parser.add_argument("--eval",    action="store_true",       help="Only run evaluation")
    args = parser.parse_args()

    if args.eval:
        evaluate()
    else:
        train(
            epochs = args.epochs,
            batch  = args.batch,
            imgsz  = args.imgsz,
            device = args.device,
            resume = args.resume,
        )

