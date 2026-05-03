"""
PlantDoc XML → YOLO Converter
================================
PlantDoc structure:
  dataset/plantdoc_raw/TRAIN/  (images + .xml annotations)
  dataset/plantdoc_raw/TEST/   (images + .xml annotations)

XML format is Pascal VOC:
  <annotation>
    <size><width>W</width><height>H</height></size>
    <object>
      <name>Leaf Disease Name</name>
      <bndbox>
        <xmin>x1</xmin><ymin>y1</ymin>
        <xmax>x2</xmax><ymax>y2</ymax>
      </bndbox>
    </object>
  </annotation>

Usage:
    python convert_plantdoc.py

Outputs:
    dataset/yolo_format/images/train/ + /val/
    dataset/yolo_format/labels/train/ + /val/
    data.yaml  (in ml_models/plant_disease/)
"""

import os
import sys
import io
import json
import shutil
import xml.etree.ElementTree as ET
from pathlib import Path
from collections import defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_DIR    = Path(__file__).resolve().parent.parent
DATASET_DIR = BASE_DIR / "dataset"
RAW_DIR     = DATASET_DIR / "plantdoc_raw"
YOLO_DIR    = DATASET_DIR / "yolo_format"
DATA_YAML   = BASE_DIR / "data.yaml"

VAL_RATIO = 0.2
IMG_EXTS  = {".jpg", ".jpeg", ".png"}


def parse_voc_xml(xml_path: Path):
    """
    Parse Pascal VOC XML and return:
      img_w, img_h, list of (class_name, x1, y1, x2, y2)
    """
    try:
        tree = ET.parse(str(xml_path))
        root = tree.getroot()

        size  = root.find("size")
        img_w = int(size.find("width").text)
        img_h = int(size.find("height").text)

        objects = []
        for obj in root.findall("object"):
            name   = obj.find("name").text.strip()
            bndbox = obj.find("bndbox")
            x1 = float(bndbox.find("xmin").text)
            y1 = float(bndbox.find("ymin").text)
            x2 = float(bndbox.find("xmax").text)
            y2 = float(bndbox.find("ymax").text)
            objects.append((name, x1, y1, x2, y2))

        return img_w, img_h, objects
    except Exception as e:
        return None, None, []


def to_yolo_bbox(x1, y1, x2, y2, img_w, img_h):
    """Convert Pascal VOC (x1,y1,x2,y2) → YOLO normalized (xc,yc,w,h)."""
    xc = ((x1 + x2) / 2) / img_w
    yc = ((y1 + y2) / 2) / img_h
    w  = (x2 - x1) / img_w
    h  = (y2 - y1) / img_h
    # Clamp to [0,1]
    xc = max(0.0, min(1.0, xc))
    yc = max(0.0, min(1.0, yc))
    w  = max(0.0, min(1.0, w))
    h  = max(0.0, min(1.0, h))
    return xc, yc, w, h


def main():
    print("=" * 60)
    print("  Agromind - PlantDoc XML to YOLO Converter")
    print("=" * 60)

    if not RAW_DIR.exists():
        print(f"[ERROR] Raw dataset not found at: {RAW_DIR}")
        print("  Run download_dataset.py first.")
        sys.exit(1)

    # ── Set up output directories ──────────────────────────────────────────────
    for split in ["train", "val"]:
        (YOLO_DIR / "images" / split).mkdir(parents=True, exist_ok=True)
        (YOLO_DIR / "labels" / split).mkdir(parents=True, exist_ok=True)

    # ── Collect all image-xml pairs ────────────────────────────────────────────
    all_pairs = []       # (img_path, xml_path)
    class_set = set()

    for folder_name in ["TRAIN", "TEST"]:
        folder = RAW_DIR / folder_name
        if not folder.exists():
            continue
        for img_path in folder.iterdir():
            if img_path.suffix.lower() not in IMG_EXTS:
                continue
            xml_path = img_path.with_suffix(".xml")
            if xml_path.exists():
                all_pairs.append((img_path, xml_path))

            # Scan XML to collect class names
            if xml_path.exists():
                _, _, objects = parse_voc_xml(xml_path)
                for name, *_ in objects:
                    class_set.add(name)

    print(f"[SCAN] Found {len(all_pairs)} annotated image-XML pairs")
    print(f"[SCAN] Found {len(class_set)} unique disease classes")

    if not all_pairs:
        print("[ERROR] No image-XML pairs found. Check dataset structure.")
        sys.exit(1)

    # ── Build sorted class list ────────────────────────────────────────────────
    class_names = sorted(list(class_set))
    name_to_id  = {name: i for i, name in enumerate(class_names)}

    print(f"\n[CLASSES] {len(class_names)} classes:")
    for i, name in enumerate(class_names):
        print(f"  {i:2d}: {name}")

    # ── Split train/val ────────────────────────────────────────────────────────
    import random
    random.seed(42)
    random.shuffle(all_pairs)
    split_idx  = int(len(all_pairs) * (1 - VAL_RATIO))
    train_pairs = all_pairs[:split_idx]
    val_pairs   = all_pairs[split_idx:]

    print(f"\n[SPLIT] Train: {len(train_pairs)}  |  Val: {len(val_pairs)}")

    # ── Convert & copy ─────────────────────────────────────────────────────────
    stats = defaultdict(int)

    for split, pairs in [("train", train_pairs), ("val", val_pairs)]:
        img_out = YOLO_DIR / "images" / split
        lbl_out = YOLO_DIR / "labels" / split

        for img_path, xml_path in pairs:
            img_w, img_h, objects = parse_voc_xml(xml_path)

            if img_w is None or img_w == 0 or img_h == 0 or not objects:
                stats["skipped_no_annotation"] += 1
                continue


            # Copy image (use stem to avoid long names)
            dst_img = img_out / (img_path.stem[:80] + img_path.suffix.lower())
            try:
                shutil.copy2(str(img_path), str(dst_img))
            except Exception:
                stats["skipped_copy_error"] += 1
                continue

            # Write YOLO label file
            dst_lbl = lbl_out / (img_path.stem[:80] + ".txt")
            with open(str(dst_lbl), "w") as lf:
                for name, x1, y1, x2, y2 in objects:
                    cls_id = name_to_id.get(name, -1)
                    if cls_id < 0:
                        continue
                    xc, yc, w, h = to_yolo_bbox(x1, y1, x2, y2, img_w, img_h)
                    lf.write(f"{cls_id} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}\n")
                    stats["boxes_written"] += 1

            stats[f"{split}_images"] += 1

    print(f"\n[DONE] Conversion complete!")
    print(f"  Train images : {stats['train_images']}")
    print(f"  Val images   : {stats['val_images']}")
    print(f"  Boxes written: {stats['boxes_written']}")
    print(f"  Skipped      : {stats['skipped_no_annotation'] + stats['skipped_copy_error']}")

    # ── Generate data.yaml ─────────────────────────────────────────────────────
    yaml_lines = [
        "# Agromind Plant Disease Detection Dataset",
        "# Generated from PlantDoc by convert_plantdoc.py",
        "",
        f"path: {YOLO_DIR.as_posix()}",
        "train: images/train",
        "val: images/val",
        "",
        f"nc: {len(class_names)}",
        "names:",
    ]
    for name in class_names:
        yaml_lines.append(f"  - '{name}'")

    DATA_YAML.write_text("\n".join(yaml_lines) + "\n")
    print(f"\n[OK] data.yaml written: {DATA_YAML}")

    # ── Save class names JSON ──────────────────────────────────────────────────
    classes_json = DATASET_DIR / "class_names.json"
    classes_json.write_text(json.dumps(class_names, indent=2))
    print(f"[OK] class_names.json saved: {classes_json}")

    print("\n" + "=" * 60)
    print("  READY TO TRAIN!")
    print("=" * 60)
    print("  Run: python src/train_yolo.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
