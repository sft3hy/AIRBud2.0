FROM python:3.10-slim-bookworm

# Automatically set by Docker (amd64 or arm64)
ARG TARGETARCH

ENV PYTHONUNBUFFERED=1 \
    MODEL_DIR=/root/.torch/detectron2_models \
    MODEL_URL="https://www.dropbox.com/s/dgy9c10wykk4lq4/model_final.pth?dl=1"

WORKDIR /app

# 1. System Deps
# Added libglib2.0-0 which is often required by OpenCV/Detectron2
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    poppler-utils \
    tesseract-ocr \
    libreoffice \
    curl \
    ca-certificates \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# 2. Smart Install (FIXED)
RUN pip install --no-cache-dir --upgrade pip && \
    if [ "$TARGETARCH" = "amd64" ]; then \
        echo "Detected GPU Architecture (T4/Intel). Installing CUDA wheels..." && \
        # PROD: Install Pre-built CUDA wheels
        pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 && \
        pip install --no-cache-dir detectron2 -f https://dl.fbaipublicfiles.com/detectron2/wheels/cu121/torch2.1/index.html; \
    else \
        echo "Detected ARM Architecture (Mac M1/M2). Compiling from source..." && \
        # DEV: Install Ninja (speeds up compilation) & Torch first
        pip install --no-cache-dir ninja && \
        pip install --no-cache-dir torch torchvision torchaudio && \
        # THE FIX: --no-build-isolation allows setup.py to see the 'torch' we just installed
        pip install --no-cache-dir --no-build-isolation 'git+https://github.com/facebookresearch/detectron2.git'; \
    fi

# 3. Download Model Weights
RUN mkdir -p $MODEL_DIR && \
    curl -L -o "$MODEL_DIR/publaynet_faster_rcnn_R_50_FPN_3x.pth" $MODEL_URL && \
    echo "Verified model download."

# 4. Remaining Requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Source Code
COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]