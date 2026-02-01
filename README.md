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
*   **Split-Screen Auth:** Modern Sign-In/Sign-Up pages with animated storytelling visuals.
*   **Responsive:** Optimized for Mobile, Tablet, and Desktop.

### 🛠 AI-Powered Tools
1.  **🔍 Pest Doctor:**
    *   **Visual Detection:** Upload photos of crops to identify pests and diseases.
    *   **Actionable Reports:** Get detailed **Treatment Plans** and **Prevention Guides**.
    *   **Confidence Scores:** Transparent AI confidence metrics.

2.  **🌾 Smart Crop Advisor:**
    *   **Precision Recommendation:** Suggests optimal crops based on NPK values, rainfall, and temperature.
    *   **Rich Insights:** Detailed cards showing expected yield, growing duration, and water requirements.

3.  **💬 Farmer Community:**
    *   **Threaded Discussions:** Ask questions and get answers in a modern forum layout.
    *   **Visual Feed:** Card-based feed with user avatars and tags.

4.  **🤖 Voice Assistant:**
    *   **Multilingual Support:** Speak in Hindi, Tamil, Telugu, and more.
    *   **Text-to-Speech:** The assistant reads out answers for accessibility.

---

## 📦 Installation & Setup

### 1. Prerequisites
*   Python 3.10+
*   Node.js (for the Frontend)
*   Git

### 2. Clone Repository
```bash
git clone https://github.com/yourusername/agromind-ai.git
cd agromind-ai
```

---

## 🏃‍♂️ Running the Application

You will need **two terminals** running simultaneously.

### Terminal 1: Backend (API)
This powers the AI models and Database.

```bash
cd backend
# Install dependencies (First time only)
pip install -r requirements.txt

# Run Server (Windows)
py unified_backend.py

# Run Server (Mac/Linux)
python3 unified_backend.py
```
✅ *The backend runs on http://127.0.0.1:8000*

### Terminal 2: Frontend (UI)
This runs the modern web interface.

```bash
cd frontend
# Install dependencies (First time only)
npm install

# Start Development Server
npm run dev
```
✅ *The frontend runs on http://localhost:3000*

---

## 🏗 Project Structure

```
agromind-ai/
├── backend/                  # FastAPI Backend
│   ├── ml_models/            # Machine Learning Models
│   ├── unified_backend.py    # Main API Server
│   └── farmi.db              # Database
│
├── frontend/                 # Modern React/Vite Frontend
│   ├── public/               # Static Assets
│   ├── index.html            # Main Entry Point
│   ├── style.css             # Cinematic Styles
│   └── app.js                # Application Logic
│
└── README.md
```

---

## 🔧 Troubleshooting

*   **"Python not found":** Try using `py` instead of `python` in your terminal commands.
*   **"Vite not found":** Make sure you ran `npm install` inside the `frontend` folder first.
*   **API Errors:** Ensure the backend terminal is open and running properly on port 8000.

---

## 🤝 Contributing

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/NewFeature`)
3.  Commit your changes (`git commit -m 'Add NewFeature'`)
4.  Push to the branch (`git push origin feature/NewFeature`)
5.  Open a Pull Request

---

**Made with ❤️ for the Future of Agriculture.**
