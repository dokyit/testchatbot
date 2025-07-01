from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel
import requests
import base64
import io
import logging
from typing import Optional, List
from contextlib import asynccontextmanager
import json
from PIL import Image
import os
from faster_whisper import WhisperModel

# --- Model Configuration ---
# For CPU usage:
# whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
# For GPU usage (recommended if you have a CUDA-enabled GPU):
whisper_model = WhisperModel("base", device="cuda", compute_type="float16")

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Ollama Configuration ---
OLLAMA_BASE_URL = "http://127.0.0.1:11434"
LLAVA_MODEL = "llava:latest"
DEFAULT_TEXT_MODEL = "mistral:7b"

# --- Middleware for Large Requests ---
class LargeRequestMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Increase the max request body size to 100MB
        request.scope['max_body_size'] = 100 * 1024 * 1024
        response = await call_next(request)
        return response

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
    logger.info("Loading Whisper model...")
    # This will download the model on the first run
    check_ollama_connection()
    logger.info("Whisper model loaded.")
    yield
    logger.info("Application shutting down.")

# --- FastAPI App Initialization ---
app = FastAPI(
    title="AI Chatbot API with LLaVA and Whisper",
    lifespan=lifespan
)

# --- Add Middleware ---
# IMPORTANT: Add LargeRequestMiddleware first
app.add_middleware(LargeRequestMiddleware)

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
    model: Optional[str] = None

# --- Core Logic Functions ---
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

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Endpoint to transcribe audio files using Whisper.
    """
    logger.info(f"Received audio file: {file.filename}")
    temp_file_path = f"temp_{file.filename}"
    try:
        # Save the uploaded file temporarily
        with open(temp_file_path, "wb") as buffer:
            buffer.write(await file.read())

        # Transcribe audio file
        segments, info = whisper_model.transcribe(temp_file_path, beam_size=5)

        logger.info(f"Detected language '{info.language}' with probability {info.language_probability}")

        transcription = "".join(segment.text for segment in segments)
        logger.info(f"Transcription result: {transcription.strip()}")

        return {"transcription": transcription.strip()}

    except Exception as e:
        logger.error(f"Error during transcription: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to transcribe audio: {str(e)}")
    finally:
        # Clean up the temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

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
            model_to_use = request.model or DEFAULT_TEXT_MODEL
            logger.info(f"Using text model: {model_to_use}")
            response = chat_with_ollama(request.message, model_to_use, request.conversation_history)
            if response is None:
                raise HTTPException(status_code=500, detail=f"Failed to get chat response from model: {model_to_use}")
            return {"response": response, "type": "text_chat"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")