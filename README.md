# 🌱 Agromind AI: The Cinematic Smart Farming Assistant

**Agromind AI** is an advanced, "Cinematic" farming ecosystem designed to bridge the gap between traditional agriculture and cutting-edge Artificial Intelligence. Featuring a premium **Glassmorphism UI**, the platform provides farmers with real-time disease diagnostics, multilingual support, and intelligent crop recommendations.

---

## 🛠️ Technology Stack

Agromind AI leverages a modern, distributed architecture to ensure high performance and scalability.

### **Frontend (Visual Engine)**
*   **Engine:** [Vite](https://vitejs.dev/) (Lightning-fast build tool)
*   **Structure:** Semantic HTML5 & Vanilla JavaScript (ES6+)
*   **Aesthetics:** Modern CSS3 featuring:
    *   **Glassmorphism:** Frosted glass effect components.
    *   **Neon Design System:** Custom-curated glow presets for dark mode.
    *   **Immersive FX:** Pan-and-zoom backgrounds and smooth micro-animations.
*   **Typography:** [Outfit](https://fonts.google.com/specimen/Outfit) via Google Fonts.

### **Backend (Intelligence Layer)**
*   **Core:** [FastAPI](https://fastapi.tiangolo.com/) (High-performance Python framework)
*   **Server:** Uvicorn with ASGI support.
*   **Database:** [SQLite](https://www.sqlite.org/) for lightweight, robust local data persistence.
*   **Integration:** RESTful API architecture with tiered error handling.

### **AI & Machine Learning (The "Brain")**
*   **Computer Vision (Plant Disease Detection):**
    *   **Primary Engine:** [Vision Transformer (ViT)](https://huggingface.co/wambugu71/crop_leaf_diseases_vit) via Hugging Face. Fine-tuned for 38 classes of plant diseases with high-precision attention mechanisms.
    *   **Secondary Fallback:** Custom **EfficientNetB4** CNN (`plant_disease_model.h5`) for rapid, high-accuracy offline analysis.
*   **Natural Language Processing & Chatbot:**
    *   **Core Engine:** **Ollama** running `qwen2.5:3b`. A 3-billion parameter model optimized for speed and accuracy in agricultural contexts.
    *   **Cloud Intelligence:** Google Gemini 1.5 Flash (via API) for multi-modal reasoning and complex diagnostic synthesis.
    *   **Translation Layer:** Multilingual support (Hindi, Tamil, Telugu, etc.) using deep learning translation models.
*   **Predictive Analytics (Crop Recommendation):** 
    *   **Algorithm:** **Random Forest Classifier** trained on soil NPK, pH, and climate datasets.
    *   **Logic:** Multi-variate analysis to predict the most profitable and sustainable crop for specific environmental conditions.

---

## 🏗️ System Architecture

Agromind AI employs a **Tiered Diagnostic Strategy** for maximum reliability:
1.  **Vision Inference:** Initial assessment using the high-accuracy Hugging Face ViT model.
2.  **Local Fallback:** If internet is unavailable, seamlessly falls back to the local Keras weights (`plant_disease_model.h5`).
3.  **Local LLM (Ollama):** Queries are handled locally where possible to save bandwidth and ensure privacy.
4.  **Actionable AI:** Results from the models are passed to the LLM to generate treatment plans in the user's local language.

---

## 🚀 Installation & Setup

### **1. Prerequisites**
*   Python 3.10+
*   Node.js (v18+)
*   A Gemini API Key (Optional, but recommended for full AI features)

### **2. Cloning the System**
```bash
git clone https://github.com/Dhivakar2005/agromind-ai.git
cd agromind-ai
```

### **3. Setting up the Backend**
```bash
cd backend
# Create Virtual Environment (Recommended)
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate on Windows

# Install Requirements
pip install -r requirements.txt

# Launch Service
python unified_backend.py
```
*Backend runs at http://127.0.0.1:8000*

### **4. Setting up the Frontend**
```bash
cd frontend
# Install dependencies
npm install

# Launch Development Server
npm run dev
```
*Frontend runs at http://localhost:5173 (default Vite port)*

---

## 🌟 Key Features

*   **Pest Doctor:** Advanced pest and disease identification with confidence scores and severity analysis.
*   **Smart Crop Advisor:** Data-driven crop recommendations based on soil NPK, pH, and climate data.
*   **Agromind Assistant:** Multilingual AI chatbot ready to answer complex agricultural queries.
*   **Community Feed:** A localized forum for farmers to share knowledge and discuss challenges.

---

## 🤝 Contribution & License

We welcome contributions! Please follow the standard "Fork-Branch-Pull" workflow.
Distributed under the **MIT License**. See `LICENSE` for more information.

---
*Created with ❤️ for the farming community.*
