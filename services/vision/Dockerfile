FROM python:3.10-slim

# System dependencies for OpenCV and Audio
RUN apt-get update && apt-get install -y \
    git \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Environment variables for Offline Model Caching
ENV HF_HOME=/app/model_cache/huggingface \
    XDG_CACHE_HOME=/app/model_cache

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- OFFLINE PRE-LOAD STEP ---
# Create a temporary script to trigger downloads during build
RUN python3 -c "import whisper; \
    import os; \
    from transformers import AutoModelForCausalLM, AutoTokenizer; \
    print('Downloading Whisper Medium...'); \
    whisper.load_model('medium'); \
    print('Downloading Moondream2...'); \
    AutoTokenizer.from_pretrained('vikhyatk/moondream2', revision='2025-06-21'); \
    AutoModelForCausalLM.from_pretrained('vikhyatk/moondream2', revision='2025-06-21', trust_remote_code=True);"

COPY . .

EXPOSE 8002
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]