# 🌱 Agromind AI

**Agromind AI** is a next-generation "Cinematic" Smart Farming Assistant designed for modern agriculture. It combines advanced AI tools (Computer Vision, NLP, Speech) with a premium, accessible user interface featuring glassmorphism, smooth animations, and deep visual immersion.

![Status](https://img.shields.io/badge/Status-Production%20Ready-success)
![Python](https://img.shields.io/badge/Python-3.12-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🚀 Key Features

### 🌟 Cinematic Experience
*   **Immersive Design:** Full-screen hero backgrounds with pan-and-zoom animations.
*   **Glassmorphism:** Frosted glass cards, neon glows, and gradient typography (`Outfit` font).
*   **Split-Screen Auth:** Modern Sign-In/Sign-Up pages with animated storytelling visuals to the right.
*   **Responsive:** optimized for Mobile, Tablet, and Desktop.

### 🛠 AI-Powered Tools
1.  **🔍 Pest Doctor:**
    *   **Visual Detection:** Upload photos of crops to identify pests and diseases (ResNet50).
    *   **Actionable Reports:** Get detailed, bulleted **Treatment Plans** and **Prevention Guides**.
    *   **Confidence Scores:** Transparent AI confidence metrics.

2.  **🌾 Smart Crop Advisor:**
    *   **Precision Recommendation:** Suggests optimal crops based on NPK values, rainfall, and temperature.
    *   **Rich Insights:** Detailed cards showing expected yield, growing duration, and water requirements.

3.  **💬 Farmer Community:**
    *   **Threaded Discussions:** Ask questions and get threaded answers similar to modern forums.
    *   **Visual Feed:** Card-based feed with user avatars (initials) and category tags.
    *   **Interaction:** Like, deleted, and comment on posts in real-time.

4.  **🤖 Voice Assistant:**
    *   **Multilingual Support:** Speak in Hindi, Tamil, Telugu, etc.
    *   **Text-to-Speech:** The assistant reads out answers for accessibility.

---

## 📦 Installation & Setup

### 1. Prerequisites
*   Python 3.10+
*   Git

### 2. Clone Repository
```bash
git clone https://github.com/yourusername/agromind-ai.git
cd agromind-ai
```

### 3. Backend Setup
Agromind uses a unified **FastAPI** backend that serves both the API and the Static Frontend.

```bash
cd backend
pip install -r requirements.txt
```
*(Dependencies: `fastapi`, `uvicorn`, `python-multipart`, `jinja2`, `pillow`, `torch`, `torchvision`, `pandas`, `scikit-learn`, `easyocr`, `googletrans`)*

### 4. Database
No manual setup required! **SQLite** (`farmi.db`) is automatically created and initialized on the first run.

---

## 🏃‍♂️ Running the Application

1.  **Start the Server:**
    ```bash
    cd backend
    python unified_backend.py
    ```

2.  **Access the App:**
    Open your browser and navigate to:
    👉 **http://127.0.0.1:8000**

---

## 🏗 Project Structure

```
agromind-ai/
├── backend/
│   ├── static/               # Frontend Assets (HTML/CSS/JS)
│   │   ├── index.html        # Single Page Application Entry
│   │   ├── style.css         # Cinematic Design System
│   │   ├── app.js            # Frontend Logic (API Calls, UI Rendering)
│   │   └── bg.png            # Hero Background
│   ├── ml_models/            # Machine Learning Models
│   ├── unified_backend.py    # Main FastAPI Application
│   └── farmi.db              # SQLite Database (Auto-generated)
└── README.md
```

---

## 🧠 Model Training (Optional)

To train the Pest Detection model on custom data:

1.  **Download Dataset:** Get **IP102** (Pests) or **PlantVillage** (Diseases) from Kaggle.
2.  **Prepare Data:** Extract images to `backend/ml_models/pest_detection/data/raw/`.
3.  **Run Training:**
    ```bash
    cd backend/ml_models/pest_detection/src
    python train_torch.py
    ```

---

## 🤝 Contributing

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/NewFeature`)
3.  Commit your changes (`git commit -m 'Add NewFeature'`)
4.  Push to the branch (`git push origin feature/NewFeature`)
5.  Open a Pull Request

---

**Made with ❤️ for the Future of Agriculture.**
