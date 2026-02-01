"""
Unified Farmi Backend - Single service for Auth + Community + ML + Chatbot
Runs on port 8000 with SQLite
"""

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
import os
import uuid
import re
import sqlite3
from contextlib import contextmanager
from PIL import Image
import io
import shutil
import time

# ML Integration
try:
    import ml_integration
    ML_ENABLED = True
    print("✅ ML module imported successfully")
except Exception as e:
    print(f"⚠️  ML module import failed: {e}")
    import traceback
    traceback.print_exc()
    ML_ENABLED = False

# Translation Service
try:
    from translation_service import translate_text, detect_language, get_supported_languages
    TRANSLATION_ENABLED = True
    print("✅ Translation service loaded")
except Exception as e:
    print(f"⚠️  Translation service not available: {e}")
    TRANSLATION_ENABLED = False

# OCR Service (Hugging Face)
try:
    from huggingface_ocr import huggingface_ocr
    OCR_ENABLED = huggingface_ocr.enabled
    if OCR_ENABLED:
        print("✅ Hugging Face OCR loaded (EasyOCR)")
    else:
        print("⚠️  OCR not available - install: pip install easyocr")
except Exception as e:
    print(f"⚠️  OCR service not available: {e}")
    OCR_ENABLED = False

# ============ DATABASE ============
DB_PATH = "farmi.db"

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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
            )
        """)
        
        # NO DEFAULT USER - Users must signup!
        print("✅ Database initialized (no default users)")

# Initialize database on startup
init_database()

# ============ FASTAPI APP ============
from contextlib import asynccontextmanager

# ============ FASTAPI APP ============
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    print("\n" + "="*50)
    print("🚀 Starting Farmi Backend...")
    print("="*50)
    
    if ML_ENABLED:
        print("🔄 Loading ML models...")
        ml_integration.load_models()
        
    yield
    
    # Shutdown logic
    print("🛑 Shutting down Agromind AI Backend...")

app = FastAPI(title="Agromind AI Backend", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# ============ MODELS ============
class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

class SigninRequest(BaseModel):
    email: str  # Changed from username to email
    password: str

class PostCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = None

class AnswerCreate(BaseModel):
    content: str

class CropRecommendationRequest(BaseModel):
    N: float
    P: float
    K: float
    temperature: float
    humidity: float
    ph: float
    rainfall: float

class TranslateRequest(BaseModel):
    text: str
    target_lang: str = 'en'
    source_lang: str = 'auto'

class ChatMessage(BaseModel):
    message: str
    language: str = 'en'

# ============ AUTH HELPERS ============
def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "")
    
    # Validate token exists in database
    with get_db() as conn:
        cursor = conn.execute("SELECT id FROM users WHERE id = ?", (token,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user["id"]

# ============ AUTH ENDPOINTS ============
@app.post("/api/v1/auth/signup")
async def signup(request: SignupRequest):
    """Simple signup - stores user in database"""
    # Trim whitespace from inputs
    username = request.username.strip()
    email = request.email.strip()
    password = request.password.strip()
    
    print(f"📝 Signup attempt - Username: '{username}', Email: '{email}'")
    
    with get_db() as conn:
        # Check if user exists
        cursor = conn.execute("SELECT * FROM users WHERE username = ? OR email = ?", 
                            (username, email))
        if cursor.fetchone():
            print(f"❌ User already exists: {username}")
            raise HTTPException(status_code=400, detail="Username or email already exists")
        
        # Create new user
        user_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)",
            (user_id, username, email, password)
        )
        print(f"✅ User created: {username}")
        return {"token": user_id, "username": username}

@app.post("/api/v1/auth/signin")
async def signin(request: SigninRequest):
    """Signin with email and password"""
    # Trim whitespace from inputs
    email = request.email.strip().lower()  # Email should be case-insensitive
    password = request.password.strip()
    
    print(f"🔍 Signin attempt - Email: '{email}', Password length: {len(password)}")
    
    with get_db() as conn:
        # Find user by email
        cursor = conn.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email,))
        user = cursor.fetchone()
        
        if not user:
            print(f"❌ User not found with email: {email}")
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        print(f"✅ User found: {user['username']} ({email})")
        print(f"🔑 Stored password: '{user['password']}', Input password: '{password}'")
        
        # Check password
        if user["password"] != password:
            print(f"❌ Password mismatch!")
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        print(f"✅ Login successful for: {user['username']}")
        return {"token": user["id"], "username": user["username"]}

@app.get("/api/v1/auth/me")
async def get_current_user(current_user_id: str = Depends(get_current_user_id)):
    with get_db() as conn:
        cursor = conn.execute("SELECT id, username, email FROM users WHERE id = ?", (current_user_id,))
        user = cursor.fetchone()
        return dict(user)

# ============ COMMUNITY ENDPOINTS ============
@app.get("/api/v1/community/posts")
async def get_posts():
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT p.*, u.username, 
                   (SELECT COUNT(*) FROM answers WHERE post_id = p.id) as answer_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
        """)
        posts = [dict(row) for row in cursor.fetchall()]
        return {"posts": posts}

@app.post("/api/v1/community/posts", status_code=201)
async def create_post(
    title: str = Form(...),
    content: str = Form(...),
    category: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user_id: str = Depends(get_current_user_id)
):
    image_url = None
    if image:
        # Save image
        upload_dir = "static/uploads"
        os.makedirs(upload_dir, exist_ok=True)
        # Generate unique filename
        filename = f"{current_user_id}_{int(time.time())}_{image.filename}"
        file_path = os.path.join(upload_dir, filename)
        
        # Write file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
            
        # URL for frontend (needs /static/ prefix)
        image_url = f"/static/uploads/{filename}"
    
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO posts (user_id, title, content, category, image_url) VALUES (?, ?, ?, ?, ?)",
            (current_user_id, title, content, category, image_url)
        )
        post_id = cursor.lastrowid
        cursor = conn.execute("""
            SELECT p.*, u.username FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        """, (post_id,))
        row = cursor.fetchone()
    
    return dict(row)

@app.delete("/api/v1/community/posts/{post_id}", status_code=204)
async def delete_post(post_id: int, current_user_id: str = Depends(get_current_user_id)):
    with get_db() as conn:
        cursor = conn.execute("SELECT * FROM posts WHERE id = ?", (post_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Post not found")
        if row["user_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        conn.execute("DELETE FROM posts WHERE id = ?", (post_id,))

@app.get("/api/v1/community/posts/{post_id}/answers")
async def get_answers(post_id: int):
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT a.*, u.username FROM answers a
            JOIN users u ON a.user_id = u.id
            WHERE a.post_id = ?
            ORDER BY a.created_at ASC
        """, (post_id,))
        answers = [dict(row) for row in cursor.fetchall()]
        return {"answers": answers}

@app.post("/api/v1/community/posts/{post_id}/answers", status_code=201)
async def create_answer(
    post_id: int,
    answer_data: AnswerCreate,
    current_user_id: str = Depends(get_current_user_id)
):
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO answers (post_id, user_id, content) VALUES (?, ?, ?)",
            (post_id, current_user_id, answer_data.content)
        )
        answer_id = cursor.lastrowid
        cursor = conn.execute("SELECT * FROM answers WHERE id = ?", (answer_id,))
        row = cursor.fetchone()
    
    return dict(row)

@app.delete("/api/v1/community/answers/{answer_id}", status_code=204)
async def delete_answer(answer_id: int, current_user_id: str = Depends(get_current_user_id)):
    with get_db() as conn:
        cursor = conn.execute("SELECT * FROM answers WHERE id = ?", (answer_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Answer not found")
        if row["user_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this answer")
        conn.execute("DELETE FROM answers WHERE id = ?", (answer_id,))

# ============ ML ENDPOINTS ============
@app.post("/api/v1/ml/crop-recommendation")
async def get_crop_recommendation(request: CropRecommendationRequest):
    """Get ML-based crop recommendation"""
    if not ML_ENABLED:
        raise HTTPException(
            status_code=503, 
            detail="ML module not enabled."
        )
    
    try:
        result = ml_integration.predict_crop(
            N=request.N,
            P=request.P,
            K=request.K,
            temperature=request.temperature,
            humidity=request.humidity,
            ph=request.ph,
            rainfall=request.rainfall
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.post("/api/v1/ml/pest-detection")
async def detect_pest(image: UploadFile = File(...)):
    """Detect pest from uploaded image using ML model"""
    if not ML_ENABLED:
        raise HTTPException(
            status_code=503, 
            detail="ML module not enabled."
        )

    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        image_bytes = await image.read()
        result = ml_integration.predict_pest(image_bytes)
        
        if result.get("method") == "error":
            # Don't fail, just return the error info with 200 OK so frontend can display it
            return result
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pest detection error: {str(e)}")

# ============ TRANSLATION & CHATBOT ENDPOINTS ============
@app.post("/api/v1/translate")
async def translate(request: TranslateRequest):
    """Translate text to target language"""
    if not TRANSLATION_ENABLED:
        return {"translated_text": request.text, "error": "Translation service not available"}
    
    try:
        translated = translate_text(request.text, request.target_lang, request.source_lang)
        detected_lang = detect_language(request.text) if request.source_lang == 'auto' else request.source_lang
        
        return {
            "translated_text": translated,
            "source_lang": detected_lang,
            "target_lang": request.target_lang
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")

@app.get("/api/v1/languages")
async def get_languages():
    """Get supported languages"""
    if TRANSLATION_ENABLED:
        return {"languages": get_supported_languages()}
    return {"languages": {"en": "English"}}

@app.post("/api/v1/chatbot/message")
async def chatbot_message(request: ChatMessage):
    """Enhanced chatbot with multi-language support"""
    try:
        user_message = request.message
        user_lang = request.language
        
        # Translate to English if not English
        if user_lang != 'en' and TRANSLATION_ENABLED:
            user_message = translate_text(user_message, 'en', user_lang)
        
        # Get chatbot response (keyword-based)
        response = get_chatbot_response(user_message.lower())
        
        # Translate response back to user's language
        if user_lang != 'en' and TRANSLATION_ENABLED:
            response = translate_text(response, user_lang, 'en')
        
        return {
            "response": response,
            "language": user_lang
        }
    except Exception as e:
        return {"response": "Sorry, I encountered an error. Please try again.", "language": user_lang}

def get_chatbot_response(message: str) -> str:
    """Get chatbot response based on keywords"""
    if any(word in message for word in ['pest', 'insect', 'bug', 'aphid', 'caterpillar']):
        return "For pest control, I recommend: 1) Use neem oil spray (organic solution), 2) Introduce natural predators like ladybugs, 3) Remove affected leaves, 4) Maintain good air circulation. Would you like to upload an image for pest identification?"
    
    if any(word in message for word in ['fertilizer', 'npk', 'nutrient', 'manure']):
        return "For fertilizer advice: 1) Get soil testing done first, 2) Use organic compost when possible, 3) NPK ratio depends on crop - Rice needs high N (90-120 kg/ha), 4) Apply in split doses for better absorption. What crop are you growing?"
    
    if any(word in message for word in ['water', 'irrigation', 'drip', 'sprinkler']):
        return "Irrigation tips: 1) Drip irrigation saves 30-50% water, 2) Water early morning or evening, 3) Check soil moisture before watering, 4) Rice needs standing water, wheat needs less. What's your soil type?"
    
    if any(word in message for word in ['crop', 'grow', 'plant', 'cultivate', 'season']):
        return "I can help with crop recommendations! Please use the 'Crop Advice' feature where you can enter your soil type, season, and region for AI-powered suggestions. Would you like me to guide you there?"
    
    if any(word in message for word in ['soil', 'ph', 'testing', 'sandy', 'clay', 'loamy']):
        return "Soil management tips: 1) Test soil pH (ideal 6-7 for most crops), 2) Add organic matter to improve structure, 3) Rotate crops to maintain nutrients, 4) Sandy soil needs more water, clay soil needs drainage. Have you tested your soil?"
    
    if any(word in message for word in ['weather', 'rain', 'temperature', 'climate']):
        return "Weather considerations: 1) Check 7-day forecast before planting, 2) Kharif crops need good monsoon, 3) Protect crops from extreme heat, 4) Ensure drainage for heavy rains. Which season are you planning for?"
    
    if any(word in message for word in ['disease', 'fungus', 'blight', 'rot', 'wilt']):
        return "For plant diseases: 1) Remove infected plants immediately, 2) Use copper-based fungicides, 3) Ensure proper spacing for air circulation, 4) Avoid overhead watering. Can you describe the symptoms?"
    
    if any(word in message for word in ['market', 'price', 'sell', 'mandi']):
        return "Market tips: 1) Check local mandi prices regularly, 2) Consider contract farming for assured prices, 3) Store produce properly to reduce losses, 4) Join farmer cooperatives for better rates. What crop are you selling?"
    
    return "Hello! I'm your farming assistant. I can help with: 🌾 Crop recommendations, 🐛 Pest control, 💧 Irrigation advice, 🌱 Soil management, 🌤️ Weather tips. What would you like to know?"

# ============ OCR ENDPOINT ============
@app.post("/api/v1/ocr/extract")
async def extract_text_from_document(file: UploadFile = File(...)):
    """Extract text from uploaded document using Hugging Face OCR"""
    if not OCR_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="OCR service not available. Install: pip install easyocr"
        )
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        image_bytes = await file.read()
        result = huggingface_ocr.extract_text_from_image(image_bytes)
        
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result.get("error", "OCR failed"))
        
        analysis = huggingface_ocr.analyze_document(result["extracted_text"])
        
        return {
            "success": True,
            "extracted_text": result["extracted_text"],
            "confidence": result.get("confidence", 0),
            "num_lines": result.get("num_lines", 0),
            "analysis": analysis.get("analysis", ""),
            "method": result.get("method", "easyocr")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR error: {str(e)}")

# ============ COMMUNITY ENDPOINTS ============

@app.get("/api/v1/community/posts")
async def get_posts():
    """Get all community posts"""
    with get_db() as conn:
        cursor = conn.execute("""
            SELECT p.*, u.username, 
            (SELECT COUNT(*) FROM answers WHERE post_id = p.id) as answer_count
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
        """)
        posts = [dict(row) for row in cursor.fetchall()]
        return {"posts": posts}

# Duplicate create_post removed

@app.get("/api/v1/community/posts/{post_id}")
async def get_post_details(post_id: int):
    """Get post details with answers"""
    with get_db() as conn:
        # Get post
        cursor = conn.execute("""
            SELECT p.*, u.username 
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        """, (post_id,))
        post = cursor.fetchone()
        
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
            
        post_dict = dict(post)
        
        # Get answers
        cursor = conn.execute("""
            SELECT a.*, u.username
            FROM answers a
            JOIN users u ON a.user_id = u.id
            WHERE a.post_id = ?
            ORDER BY a.created_at ASC
        """, (post_id,))
        answers = [dict(row) for row in cursor.fetchall()]
        
        post_dict["answers"] = answers
        return post_dict

@app.post("/api/v1/community/posts/{post_id}/answers")
async def create_answer(post_id: int, answer: AnswerCreate, current_user_id: str = Depends(get_current_user_id)):
    """Add an answer to a post"""
    with get_db() as conn:
        # Check if post exists
        cursor = conn.execute("SELECT id FROM posts WHERE id = ?", (post_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Post not found")
            
        # Add answer
        conn.execute(
            "INSERT INTO answers (post_id, user_id, content) VALUES (?, ?, ?)",
            (post_id, current_user_id, answer.content)
        )
        return {"message": "Answer added successfully"}

@app.delete("/api/v1/community/posts/{post_id}")
async def delete_post(post_id: int, current_user_id: str = Depends(get_current_user_id)):
    """Delete a post (owner only)"""
    with get_db() as conn:
        cursor = conn.execute("SELECT user_id FROM posts WHERE id = ?", (post_id,))
        post = cursor.fetchone()
        
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
            
        if post["user_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this post")
            
        conn.execute("DELETE FROM posts WHERE id = ?", (post_id,))
        return {"message": "Post deleted successfully"}

@app.delete("/api/v1/community/answers/{answer_id}")
async def delete_answer(answer_id: int, current_user_id: str = Depends(get_current_user_id)):
    """Delete an answer (owner only)"""
    with get_db() as conn:
        cursor = conn.execute("SELECT user_id FROM answers WHERE id = ?", (answer_id,))
        answer = cursor.fetchone()
        
        if not answer:
            raise HTTPException(status_code=404, detail="Answer not found")
            
        if answer["user_id"] != current_user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this answer")
            
        conn.execute("DELETE FROM answers WHERE id = ?", (answer_id,))
        return {"message": "Answer deleted successfully"}

# ============ ROOT & MAIN ============
@app.get("/")
async def root():
    return FileResponse("static/index.html")



if __name__ == "__main__":
    import uvicorn
    import os
    
    # Get config from env or default to localhost
    HOST = os.getenv("HOST", "127.0.0.1")
    PORT = int(os.getenv("PORT", "8000"))
    
    print("\n" + "="*50)
    print(f"✅ Agromind AI Backend started on port {PORT}")
    print(f"👉 Open in browser: http://{HOST}:{PORT}")
    print("="*50)
    
    uvicorn.run(app, host=HOST, port=PORT)
