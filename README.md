# 🌱 Agromind AI

**Agromind AI** is a next-generation "Cinematic" Smart Farming Assistant designed for Indian farmers. It combines advanced AI tools (Computer Vision, NLP, Speech) with a premium, accessible user interface.

![Status](https://img.shields.io/badge/Status-Production%20Ready-success)
![Python](https://img.shields.io/badge/Python-3.12-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🚀 Features

### 🌟 Technical Highlights
*   **Cinematic UI:** Glassmorphism design, dark mode, and 8K cinematic backgrounds.
*   **Voice Assistant:** Full speech-to-text and text-to-speech support (Web Speech API).
*   **Offline First:** Uses `EasyOCR` and Local Models where possible.
*   **Multilingual:** Real-time translation for 100+ languages including Hindi, Tamil, Telugu.

### 🛠 Core Tools
1.  **🔍 Pest Detection:**
    *   Uses **ResNet50** (Transfer Learning) to identify specific pests.
    *   Supports custom training on datasets like IP102.
2.  **🌾 Crop Recommendation:**
    *   AI Analysis of NPK, Ph, and Rainfall values to suggest optimal crops.
3.  **💬 Community Forum:**
    *   Ask questions, share photos, and get answers from other farmers.
    *   Full Username support and moderation tools.
4.  **📄 Document Analysis (OCR):**
    *   Upload soil reports or fertilizer bags to extract text and get summaries.

---

## 📦 Installation

### 1. Prerequisites
*   Python 3.10+
*   Node.js (Optional, only if modifying frontend heavily)

### 2. Clone Repository
```bash
git clone https://github.com/yourusername/agromind-ai.git
cd agromind-ai
```

### 3. Backend Setup
```bash
cd backend
pip install -r requirements.txt
```
*(Note: If `requirements.txt` is missing, install: `fastapi uvicorn python-multipart jinja2 pillow torch torchvision plotly pandas scikit-learn easyocr googletrans==4.0.0-rc1`)*

### 4. Database
No setup required! Agromind AI uses **SQLite** (`farmi.db`) which is auto-created on the first run.

---

## 🏃‍♂️ Usage

### Start the Server
```bash
cd backend
python unified_backend.py
```

### Access App
Open your browser to: **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## 🧠 Model Training (Custom Data)

To train the Pest Detection model on your own data (e.g., specific local pests):

1.  **Download Dataset:**
    *   Due to size limits, we do not bundle the dataset.
    *   Download **IP102** (Pests) or **PlantVillage** (Diseases) from Kaggle.
2.  **Prepare Folders:**
    *   Extract images to: `backend/ml_models/pest_detection/data/raw/`
    *   Structure: `data/raw/pest_name/image.jpg`
3.  **Run Training:**
    ```bash
    cd backend/ml_models/pest_detection/src
    python train_torch.py
    ```
    *This generates `custom_pest_model.pth` which the app automatically loads.*

---

## 🔧 Configuration (.env)

Create a `.env` file in the root if you want to customize ports:

```env
PORT=8000
HOST=127.0.0.1
DEBUG=True
```

---

## 🤝 Contributing
1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

**Made with ❤️ for Indian Agriculture.**
