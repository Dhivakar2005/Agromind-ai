"""
Unified Farmi Backend - Single service for Auth + Community + ML + Chatbot
Runs on port 8000 with SQLite
"""

import os
# Force pure-python protobuf to avoid 'MessageFactory' GetPrototype AttributeError
# THIS MUST BE AT THE VERY TOP BEFORE ANY OTHER IMPORTS
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"
# os.environ["KERAS_BACKEND"] = "tensorflow"
# os.environ["TF_USE_LEGACY_KERAS"] = "1"

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Dict
import uuid
import re
import sqlite3
from contextlib import contextmanager
from PIL import Image
import io
import shutil
import time

# ML Integration
from services import ml_integration
ML_ENABLED = True

# Translation Service
try:
    from services.translation_service import translate_text, detect_language, get_supported_languages
    TRANSLATION_ENABLED = True
except Exception as e:
    TRANSLATION_ENABLED = False


# Agri-Chat Service
try:
    from services import agri_chat_service
    AGRI_CHAT_ENABLED = True
except Exception as e:
    AGRI_CHAT_ENABLED = False

# YOLO Service (Removed as per user request)
YOLO_ENABLED = False

# Keras Plant Disease Service (EfficientNetB4)
try:
    from services import keras_disease_service
    KERAS_ENABLED = True
except Exception as e:
    print(f"[WARN] Failed to import keras_disease_service: {e}")
    KERAS_ENABLED = False


# Semantic Cache for AI Responses
# Format: {hash(query+lang+image?): {"response": text, "expiry": timestamp}}
AI_RESPONSE_CACHE = {}
CACHE_EXPIRY_SECONDS = 3600 # 1 hour

def get_cached_response(key_parts: list) -> Optional[str]:
    import hashlib
    import time
    key = hashlib.md5("".join([str(p) for p in key_parts]).encode()).hexdigest()
    entry = AI_RESPONSE_CACHE.get(key)
    if entry and time.time() < entry['expiry']:
        print(f"[CACHE] Hit for key: {key[:8]}...")
        return entry['response']
    return None

def set_cached_response(key_parts: list, response: str):
    import hashlib
    import time
    key = hashlib.md5("".join([str(p) for p in key_parts]).encode()).hexdigest()
    AI_RESPONSE_CACHE[key] = {
        "response": response,
        "expiry": time.time() + CACHE_EXPIRY_SECONDS
    }
    print(f"[CACHE] Saved entry for key: {key[:8]}...")

# AI Recommendation Service (qwen2.5:3b via Ollama)
try:
    from services import recommendation_service
    RECO_ENABLED = True
except Exception as e:
    RECO_ENABLED = False

# ============ DATABASE ============
# Use absolute path relative to this file to prevent multiple DB files
DB_PATH = os.path.join(os.path.dirname(__file__), "farmi.db")

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

def init_database():
    with get_db() as conn:
        # Users table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Posts table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT,
                image_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Answers table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS answers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                content TEXT NOT NULL,
                likes INTEGER DEFAULT 0,
                dislikes INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
            )
        """)
        
        # Migration: Add likes/dislikes if they don't exist
        try:
            conn.execute("ALTER TABLE answers ADD COLUMN likes INTEGER DEFAULT 0")
        except: pass
        try:
            conn.execute("ALTER TABLE answers ADD COLUMN dislikes INTEGER DEFAULT 0")
        except: pass
        
        # Database initialized silently

# init_database() removed from here, moving to lifespan for status check

# ============ FASTAPI APP ============
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialization status tracking
    db_ok = True
    try:
        init_database()
    except Exception as e:
        db_ok = False
        print(f"[ERROR] Database connection failed: {e}")

    llm_ok = False
    if AGRI_CHAT_ENABLED:
        llm_ok = agri_chat_service.load_agri_chat_model()  # Checks Gemini API Key

    # Verify local Keras models
    keras_ok = False
    if KERAS_ENABLED:
        try:
            keras_disease_service.load_keras_model()
            keras_ok = keras_disease_service.is_ready()
        except Exception as e:
            print(f"[ERROR] Keras/ViT Model Loading Exception: {e}")
            keras_ok = False


    # Load Crop Recommendation Models
    ml_integration.load_models()
    crop_ok = ml_integration.get_crop_model_status()

    # Final Consolidated Status
    if db_ok and llm_ok and keras_ok and crop_ok:
        print("\n" + "="*40)
        print(" [OK] AGROMIND-AI CONNECTED SUCCESSFULLY")
        print(f" - LLM: Gemini 3 Flash Preview (Cloud)")
        print(f" - Disease Models: {int(keras_ok)}/1 Ready")
        print(f" - Crop Model: {'Ready' if crop_ok else 'Fallback Mode'}")
        print("="*40 + "\n")
    else:
        print("\n" + "!"*40)
        print(" [WARN] AGROMIND-AI PARTIALLY CONNECTED")
        if not db_ok: print(" - Database: NOT CONNECTED")
        if not llm_ok: print(" - LLM (Gemini API): NOT CONNECTED")
        if not keras_ok: print(" - Disease Analysis (ViT/Local): FAILED TO LOAD")
        if not crop_ok: print(" - Crop Model: LOADED FALLBACK ONLY")

        print("!"*40 + "\n")

    yield
    # Shutting down Agromind AI Backend...

app = FastAPI(title="Agromind AI Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Unified Frontend Serving ---
# This ensures images, JS, CSS, and HTML all work on the same port
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

if os.path.exists(FRONTEND_DIST):
    # 1. Mount the entire dist folder at the root
    # Note: We must do this AFTER defining API routes to avoid conflicts
    print(f"[OK] Serving Frontend from: {FRONTEND_DIST}")
else:
    print(f"[WARN] Frontend dist folder not found at {FRONTEND_DIST}. Run 'npm run build' first.")

app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "static")), name="static")

# ============ MODELS ============
class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

class SigninRequest(BaseModel):
    email: str
    password: str

class PostCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = None

class AnswerCreate(BaseModel):
    content: str

class CropRecommendationRequest(BaseModel):
    N: float; P: float; K: float
    temperature: float; humidity: float; ph: float; rainfall: float

class TranslateRequest(BaseModel):
    text: str
    target_lang: str = 'en'
    source_lang: str = 'auto'

class ChatMessage(BaseModel):
    message: str
    language: str = 'en'
    history: Optional[List[Dict[str, str]]] = None

# ============ AUTH HELPERS ============
def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "")
    with get_db() as conn:
        user = conn.execute("SELECT id FROM users WHERE id = ?", (token,)).fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user["id"]

# ============ AUTH ENDPOINTS ============
@app.post("/api/v1/auth/signup")
async def signup(request: SignupRequest):
    username = request.username.strip()
    email = request.email.strip()
    password = request.password.strip()
    with get_db() as conn:
        if conn.execute("SELECT id FROM users WHERE username = ? OR email = ?", (username, email)).fetchone():
            raise HTTPException(status_code=400, detail="User already exists")
        user_id = str(uuid.uuid4())
        conn.execute("INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)", 
                    (user_id, username, email, password))
        return {"token": user_id, "username": username}

@app.post("/api/v1/auth/signin")
async def signin(request: SigninRequest):
    email = request.email.strip().lower()
    password = request.password.strip()
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email,)).fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if user["password"] != password:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return {"token": user["id"], "username": user["username"]}
        return {"token": user["id"], "username": user["username"]}

@app.get("/api/v1/auth/me")
async def get_current_user(current_user_id: str = Depends(get_current_user_id)):
    with get_db() as conn:
        user = conn.execute("SELECT id, username, email FROM users WHERE id = ?", (current_user_id,)).fetchone()
        return dict(user)

# ============ ML ENDPOINTS ============
@app.post("/api/v1/ml/crop-recommendation")
async def get_crop_recommendation(request: CropRecommendationRequest):
    if not ML_ENABLED: raise HTTPException(status_code=503, detail="ML disabled")
    try:
        return ml_integration.predict_crop(N=request.N, P=request.P, K=request.K, 
                                        temperature=request.temperature, humidity=request.humidity, 
                                        ph=request.ph, rainfall=request.rainfall)
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/ml/pest-detection")
async def detect_pest_and_disease(image: UploadFile = File(...), model: str = Form('resnet50')):
    if not ML_ENABLED: raise HTTPException(status_code=503, detail="ML disabled")
    if not image.content_type.startswith("image/"): raise HTTPException(status_code=400, detail="Not an image")
    try:
        img_bytes = await image.read()
        pest_res = ml_integration.predict_pest(img_bytes, model=model)
        disease_res = ml_integration.predict_disease(img_bytes)
        
        pest_conf = pest_res.get("confidence", 0)
        disease_conf = disease_res.get("confidence", 0)
        
        if disease_res.get("is_healthy"):
            primary, recommendation = "healthy", "✅ Your plant appears healthy!"
        elif (disease_conf > pest_conf and disease_conf >= 25) or (disease_conf >= 25 and not pest_res.get("pest")):
            primary, recommendation = "disease", f"🦠 Disease: {disease_res.get('disease')} detected."
        elif pest_conf >= 25:
            primary, recommendation = "pest", f"🐛 Pest: {pest_res.get('pest')} detected."
        else:
            primary, recommendation = "healthy", "🌱 No significant issues identified."
            
        return {
            "pest_detection": pest_res,
            "disease_detection": disease_res,
            "primary_issue": primary,
            "recommendation": recommendation,
            "combined_confidence": max(pest_conf, disease_conf)
        }
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))


# ============ YOLO PLANT DISEASE DETECTION + AI RECOMMENDATION ============
class DetectRequest(BaseModel):
    language: str = 'en'

@app.post("/api/v1/ml/detect")
async def detect_plant_diseases(
    image: UploadFile = File(...),
    language: str = Form('en'),
    conf: float = Form(0.25),
):
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        img_bytes = await image.read()
        detections = None
        model_used = "None"

        # Tier 1: Keras (Primary leaf model)
        if KERAS_ENABLED and keras_disease_service.is_ready():
            try:
                detections = keras_disease_service.predict_disease(img_bytes)
                if detections:
                    # Implement Confidence Threshold for Tier 1 Fallback
                    keras_conf = detections[0].get("confidence", 0.0)
                    if keras_conf < 10.0:
                        # Only fallback if ViT is extremely unsure (Threshold lowered from 15 -> 10)
                        detections = None
                    else:
                        model_used = "Keras (pwp)"
            except:
                pass

        # Tier 2: Gemini Vision (Expert Diagnostic Pass)
        # Consolidate detection + recommendation here for best performance
        if not detections:
            from services import gemini_service
            
            # 0. Check Cache First
            import hashlib
            img_hash = hashlib.md5(img_bytes).hexdigest()
            cached = get_cached_response(["vision", img_hash])
            if cached:
                res_text = cached
            else:
                prompt = (
                    "You are an expert plant pathologist with 20 years experience.\n"
                    "Analyze this plant leaf and provide EXACTLY the following structure:\n"
                    "1. Common Name of Disease (Line 1 only)\n"
                    "2. Brief 1-sentence description (Line 2)\n"
                    "3. Estimated Infection Severity Score (0-100) based on visible damage (Line 3 only)\n"
                    "4. Detailed and comprehensive prevention and treatment plan of approximately 100 words (Remaining lines).\n"
                    "If healthy, start Line 1 with 'Healthy (Good Plant)' and Line 3 with an estimated Health Confidence Score (e.g., 95)."
                )
                res_text = gemini_service.analyze_image(img_bytes, prompt)
                set_cached_response(["vision", img_hash], res_text)
            
            if res_text:
                lines = [l.strip() for l in res_text.split('\n') if l.strip()]
                is_healthy = "Healthy" in lines[0] if lines else False
                
                disease_name = "Healthy" if is_healthy else (lines[0] if lines else "Unknown")
                desc = "Plant is in good condition." if is_healthy else (lines[1] if len(lines) > 1 else "Signs of infection detected.")
                
                # Extract severity from Line 3 if possible
                severity_val = 0.0
                if len(lines) > 2:
                    try:
                        # Clean line 3 to just numbers
                        import re
                        match = re.search(r'(\d+)', lines[2])
                        if match:
                            severity_val = float(match.group(1))
                    except:
                        severity_val = 90.0 if not is_healthy else 0.0

                recommendation = "\n".join(lines[3:]) if not is_healthy else ""
                if is_healthy:
                    recommendation = "• Maintain consistent watering\n• Ensure good sunlight\n• Monitor for pests weekly\n• Use organic compost"

                detections = [{
                    "disease": disease_name,
                    "crop": "Verified Crop",
                    "confidence": severity_val,
                    "is_healthy": is_healthy,
                    "label": disease_name,
                    "description": desc,
                    "recommendation": recommendation,
                    "severity_percentage": severity_val
                }]
                model_used = "Gemini Expert Vision"

        # Step 2: Ensure AI Recommendations are populated if Keras was used
        if model_used == "Keras (pwp)":
            import asyncio
            loop = asyncio.get_event_loop()
            detections = await loop.run_in_executor(
                None,
                recommendation_service.generate_batch_recommendations,
                detections,
                "en"
            )
            for det in detections:
                det["severity_percentage"] = det.get("confidence", 85.0)

        # Step 3: Return final result (Gemini results already have recommendations)
        return {
            "success": True,
            "model_used": model_used,
            "detections": detections
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "model_used": "System Error",
            "detections": []
        }


@app.get("/api/v1/ml/detect/status")
async def yolo_model_status():
    if YOLO_ENABLED:
        return yolo_disease_service.get_model_status()
    return {"yolo_loaded": False, "model_exists": False}

# ============ TRANSLATION & CHATBOT ENDPOINTS ============
@app.post("/api/v1/translate")
async def translate(request: TranslateRequest):
    if not TRANSLATION_ENABLED: return {"translated_text": request.text, "error": "Disabled"}
    try:
        translated = translate_text(request.text, request.target_lang, request.source_lang)
        source = detect_language(request.text) if request.source_lang == 'auto' else request.source_lang
        return {"translated_text": translated, "source_lang": source, "target_lang": request.target_lang}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/languages")
async def get_languages():
    return {"languages": get_supported_languages() if TRANSLATION_ENABLED else {"en": "English"}}

@app.post("/api/v1/chatbot/message")
async def chatbot_message(request: ChatMessage):
    import asyncio
    loop = asyncio.get_event_loop()
    
    if AGRI_CHAT_ENABLED:
        try:
            # Run the heavy AI generation in a separate thread to keep the event loop free
            response = await loop.run_in_executor(None, agri_chat_service.generate_response, request.message, request.language)
            return response
        except: pass
        # Fallback is also offloaded if it grows in complexity
        return await loop.run_in_executor(None, agri_chat_service.get_fallback_response, request.message, request.language)
        
    return {
        'response': "Hello! I'm your farming assistant. What would you like to know? (AI service currently initializing/unavailable)",
        'language': request.language,
        'image_analyzed': False
    }

@app.post("/api/v1/chatbot/message-with-image")
async def chatbot_message_with_image(message: str = Form(...), language: str = Form('en'), image: Optional[UploadFile] = File(None)):
    import asyncio
    loop = asyncio.get_event_loop()
    img_data = await image.read() if image else None
    
    if AGRI_CHAT_ENABLED:
        try:
            response = await loop.run_in_executor(None, agri_chat_service.generate_response, message, language, img_data)
            return response
        except: pass
        return await loop.run_in_executor(None, agri_chat_service.get_fallback_response, message, language)
        
    return {
        'response': "Hello! I'm your farming assistant. What would you like to know? (AI service currently initializing/unavailable)",
        'language': language,
        'image_analyzed': False
    }

@app.get("/api/v1/chatbot/status")
async def chatbot_status():
    if AGRI_CHAT_ENABLED: return agri_chat_service.get_model_status()
    return {"loaded": False, "model_name": "fallback"}


# ============ COMMUNITY ENDPOINTS ============
@app.get("/api/v1/community/posts")
async def get_posts():
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT p.*, u.username, (SELECT COUNT(*) FROM answers WHERE post_id = p.id) as answer_count
            FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC
        """)
        return {"posts": [dict(r) for r in cursor.fetchall()]}

@app.post("/api/v1/community/posts", status_code=201)
async def create_post(title: str = Form(...), content: str = Form(...), category: Optional[str] = Form(None), 
                    image: Optional[UploadFile] = File(None), current_user_id: str = Depends(get_current_user_id)):
    image_url = None
    if image:
        upload_dir = "static/uploads"
        os.makedirs(upload_dir, exist_ok=True)
        filename = f"{current_user_id}_{int(time.time())}_{image.filename}"
        with open(os.path.join(upload_dir, filename), "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        image_url = f"/static/uploads/{filename}"
    
    with get_db() as conn:
        cursor = conn.execute("INSERT INTO posts (user_id, title, content, category, image_url) VALUES (?, ?, ?, ?, ?)",
                            (current_user_id, title, content, category, image_url))
        post_id = cursor.lastrowid
        row = conn.execute("SELECT p.*, u.username FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?", (post_id,)).fetchone()
    return dict(row)

@app.get("/api/v1/community/posts/{post_id}")
async def get_post_details(post_id: int):
    with get_db() as conn:
        post = conn.execute("SELECT p.*, u.username FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?", (post_id,)).fetchone()
        if not post: raise HTTPException(status_code=404, detail="Post not found")
        post_dict = dict(post)
        cursor = conn.execute("SELECT a.*, u.username FROM answers a JOIN users u ON a.user_id = u.id WHERE a.post_id = ? ORDER BY a.created_at ASC", (post_id,))
        post_dict["answers"] = [dict(r) for r in cursor.fetchall()]
        return post_dict

@app.delete("/api/v1/community/posts/{post_id}", status_code=204)
async def delete_post(post_id: int, current_user_id: str = Depends(get_current_user_id)):
    with get_db() as conn:
        post = conn.execute("SELECT user_id FROM posts WHERE id = ?", (post_id,)).fetchone()
        if not post: raise HTTPException(status_code=404, detail="Post not found")
        if post["user_id"] != current_user_id: raise HTTPException(status_code=403, detail="Not authorized")
        conn.execute("DELETE FROM posts WHERE id = ?", (post_id,))

@app.post("/api/v1/community/posts/{post_id}/answers", status_code=201)
async def create_answer(post_id: int, answer: AnswerCreate, current_user_id: str = Depends(get_current_user_id)):
    with get_db() as conn:
        if not conn.execute("SELECT id FROM posts WHERE id = ?", (post_id,)).fetchone():
            raise HTTPException(status_code=404, detail="Post not found")
        conn.execute("INSERT INTO answers (post_id, user_id, content) VALUES (?, ?, ?)", (post_id, current_user_id, answer.content))
        return {"message": "Success"}

@app.delete("/api/v1/community/answers/{answer_id}", status_code=204)
async def delete_answer(answer_id: int, current_user_id: str = Depends(get_current_user_id)):
    with get_db() as conn:
        answer = conn.execute("SELECT user_id FROM answers WHERE id = ?", (answer_id,)).fetchone()
        if not answer: raise HTTPException(status_code=404, detail="Not found")
        if answer["user_id"] != current_user_id: raise HTTPException(status_code=403, detail="Not authorized")
        conn.execute("DELETE FROM answers WHERE id = ?", (answer_id,))

@app.post("/api/v1/community/answers/{answer_id}/{action}")
async def react_to_answer(answer_id: int, action: str, current_user_id: str = Depends(get_current_user_id)):
    if action not in ["like", "dislike", "unlike"]: raise HTTPException(status_code=400, detail="Invalid action")
    
    with get_db() as conn:
        if not conn.execute("SELECT id FROM answers WHERE id = ?", (answer_id,)).fetchone():
            raise HTTPException(status_code=404, detail="Not found")
        
        if action == "like":
            conn.execute("UPDATE answers SET likes = likes + 1 WHERE id = ?", (answer_id,))
            column = "likes"
        elif action == "dislike":
            conn.execute("UPDATE answers SET dislikes = dislikes + 1 WHERE id = ?", (answer_id,))
            column = "dislikes"
        elif action == "unlike":
            # Logic: unlike usually means removing a previous like
            conn.execute("UPDATE answers SET likes = MAX(0, likes - 1) WHERE id = ?", (answer_id,))
            column = "likes"
            
        count = conn.execute(f"SELECT {column} FROM answers WHERE id = ?", (answer_id,)).fetchone()[0]
    return {column: count}

# ============ ROOT & MAIN ============
# Root API status moved to /api/v1/status to avoid conflict with frontend
@app.get("/api/v1/status")
async def api_status(): 
    return {
        "status": "online",
        "message": "Agromind AI Backend API is running.",
        "version": "1.2.0"
    }

if __name__ == "__main__":
    import uvicorn
    # Mount the frontend last to ensure API routes take precedence
    if os.path.exists(FRONTEND_DIST):
        app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
        
    uvicorn.run(app, host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", "8000")))
