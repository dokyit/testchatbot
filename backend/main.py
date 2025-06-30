from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import base64
import io
import logging
from typing import Optional, List
from contextlib import asynccontextmanager
import json
from PIL import Image

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Ollama Configuration ---
OLLAMA_BASE_URL = "http://127.0.0.1:11434"
LLAVA_MODEL = "llava:latest" 
# This is just a fallback if the frontend sends nothing
DEFAULT_TEXT_MODEL = "mistral:7b" 

# --- Helper Functions ---
def check_ollama_connection():
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags")
        if response.status_code == 200:
            data = response.json()
            logger.info(f"Ollama API response for /api/tags: {data}")
            models = data.get("models", [])
            if not models:
                return True, False
            llava_available = any("llava" in model.get("name", "") for model in models)
            return True, llava_available
        return False, False
    except requests.exceptions.RequestException as e:
        logger.error(f"Error checking Ollama connection: {e}")
        return False, False

# --- Lifespan Event Handler ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application starting up...")
    check_ollama_connection()
    yield
    logger.info("Application shutting down.")

# --- FastAPI App Initialization ---
app = FastAPI(
    title="AI Chatbot API with LLaVA Image Analysis",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class ChatRequest(BaseModel):
    message: str
    image_base64: Optional[str] = None
    conversation_history: Optional[List[dict]] = []
    # This field will receive the model name from the frontend
    model: Optional[str] = None 

def analyze_image_with_llava(image_base64: str, prompt: str):
    try:
        if image_base64.startswith('data:image'):
            image_base64 = image_base64.split(',')[1]
        payload = { "model": LLAVA_MODEL, "prompt": prompt, "images": [image_base64], "stream": False }
        response = requests.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload, timeout=120)
        response.raise_for_status()
        return response.json().get("response", "")
    except requests.exceptions.RequestException as e:
        logger.error(f"Error analyzing image with LLaVA: {e}")
        return None

def chat_with_ollama(message: str, model: str, conversation_history: Optional[List[dict]] = None):
    try:
        history = conversation_history or []
        context = "".join([f"Human: {msg.get('human', '')}\nAssistant: {msg.get('assistant', '')}\n" for msg in history[-10:]])
        full_prompt = f"{context}Human: {message}\nAssistant: "
        payload = { "model": model, "prompt": full_prompt, "stream": False }
        response = requests.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload, timeout=60)
        response.raise_for_status()
        return response.json().get("response", "")
    except requests.exceptions.RequestException as e:
        logger.error(f"Error chatting with Ollama model {model}: {e}")
        return None

# --- API Endpoints ---
@app.get("/")
async def root():
    ollama_running, llava_available = check_ollama_connection()
    return {"message": "AI Chatbot API", "ollama_running": ollama_running, "llava_available": llava_available}

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Main chat endpoint - handles both text and image inputs"""
    try:
        if request.image_base64:
            prompt = request.message if request.message else "Describe this image in detail."
            response = analyze_image_with_llava(request.image_base64, prompt)
            if response is None:
                raise HTTPException(status_code=500, detail="Failed to analyze image with LLaVA")
            return {"response": response, "type": "image_analysis"}
        else:
            # --- THIS IS THE FIX ---
            # Use the model name sent from the frontend, or fallback to the default.
            model_to_use = request.model or DEFAULT_TEXT_MODEL
            logger.info(f"Using text model: {model_to_use}") # Add logging to confirm
            response = chat_with_ollama(request.message, model_to_use, request.conversation_history)
            if response is None:
                raise HTTPException(status_code=500, detail=f"Failed to get chat response from model: {model_to_use}")
            return {"response": response, "type": "text_chat"}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
