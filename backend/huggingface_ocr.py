"""
Hugging Face OCR Integration for Farmi App
Free, offline OCR using EasyOCR
No API keys required!
"""
import io
from PIL import Image
import numpy as np
from typing import Dict, Any

# Try to import EasyOCR
try:
    import easyocr
    OCR_AVAILABLE = True
    print("✅ EasyOCR loaded successfully")
except ImportError:
    OCR_AVAILABLE = False
    print("⚠️  EasyOCR not installed. Run: pip install easyocr")

class HuggingFaceOCR:
    """Free OCR using EasyOCR (Hugging Face models)"""
    
    def __init__(self):
        self.reader = None
        self.enabled = OCR_AVAILABLE
        
        if self.enabled:
            try:
                # Initialize EasyOCR with English and Hindi
                # Add more languages as needed: ['en', 'hi', 'ta', 'te']
                self.reader = easyocr.Reader(['en', 'hi'], gpu=False)
                print("✅ OCR reader initialized (English, Hindi)")
            except Exception as e:
                print(f"⚠️  OCR initialization error: {e}")
                self.enabled = False
    
    def extract_text_from_image(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Extract text from image using EasyOCR
        
        Args:
            image_bytes: Image file bytes
        
        Returns:
            dict: Extracted text and metadata
        """
        if not self.enabled or not self.reader:
            return {
                "success": False,
                "error": "OCR not available. Install: pip install easyocr",
                "extracted_text": "",
                "method": "disabled"
            }
        
        try:
            # Open and convert image
            img = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Convert to numpy array
            img_array = np.array(img)
            
            # Perform OCR
            results = self.reader.readtext(img_array)
            
            # Extract text from results
            extracted_lines = []
            confidence_scores = []
            
            for (bbox, text, confidence) in results:
                extracted_lines.append(text)
                confidence_scores.append(confidence)
            
            # Combine all text
            extracted_text = '\n'.join(extracted_lines)
            avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
            
            return {
                "success": True,
                "extracted_text": extracted_text,
                "confidence": round(avg_confidence * 100, 2),
                "num_lines": len(extracted_lines),
                "method": "easyocr_huggingface"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "extracted_text": "",
                "method": "error"
            }
    
    def analyze_document(self, extracted_text: str, question: str = None) -> Dict[str, Any]:
        """
        Analyze extracted text (basic keyword-based analysis)
        
        Args:
            extracted_text: Text extracted from document
            question: Optional specific question
        
        Returns:
            dict: Analysis and recommendations
        """
        if not extracted_text:
            return {
                "success": False,
                "analysis": "No text extracted from document"
            }
        
        # Basic keyword-based analysis
        analysis = []
        
        # Check for NPK values
        if any(keyword in extracted_text.upper() for keyword in ['NPK', 'N-P-K', 'NITROGEN', 'PHOSPHORUS', 'POTASSIUM']):
            analysis.append("📦 Fertilizer Package Detected")
            analysis.append("Contains NPK nutrient information")
        
        # Check for soil test
        if any(keyword in extracted_text.upper() for keyword in ['SOIL', 'PH', 'TEST', 'REPORT']):
            analysis.append("🌱 Soil Test Report Detected")
            analysis.append("Contains soil analysis data")
        
        # Extract numbers (potential NPK values)
        import re
        numbers = re.findall(r'\d+', extracted_text)
        if len(numbers) >= 3:
            analysis.append(f"📊 Found values: {', '.join(numbers[:5])}")
        
        # Basic recommendations
        recommendations = [
            "✅ Review extracted values carefully",
            "✅ Consult with agricultural expert for interpretation",
            "✅ Compare with recommended values for your crop"
        ]
        
        if question:
            analysis.append(f"\n❓ Your question: {question}")
            analysis.append("💡 For detailed analysis, consult the extracted text above")
        
        full_analysis = '\n'.join(analysis + ['\n📋 Recommendations:'] + recommendations)
        
        return {
            "success": True,
            "analysis": full_analysis,
            "method": "keyword_based"
        }

# Initialize OCR service
huggingface_ocr = HuggingFaceOCR()
