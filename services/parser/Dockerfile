# ============================================================
# PROD: Linux amd64 + NVIDIA GPU
# Detectron2-compatible, pinned, reproducible
# ============================================================

FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    MODEL_DIR=/root/.torch/detectron2_models \
    MODEL_URL="https://www.dropbox.com/s/dgy9c10wykk4lq4/model_final.pth?dl=1"

WORKDIR /app

# ------------------------------------------------------------
# 1. System dependencies
# ------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 \
    python3.10-dev \
    python3-pip \
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

# Ensure python == python3.10
RUN ln -sf python3.10 /usr/bin/python && \
    pip install --upgrade pip

# ------------------------------------------------------------
# 2. PyTorch (PINNED, CUDA 12.1)
# ------------------------------------------------------------
RUN pip install --no-cache-dir \
    torch==2.1.2+cu121 \
    torchvision==0.16.2+cu121 \
    torchaudio==2.1.2+cu121 \
    --extra-index-url https://download.pytorch.org/whl/cu121

# ------------------------------------------------------------
# 3. Detectron2 (PREBUILT WHEELS — DO NOT CHANGE)
# ------------------------------------------------------------
RUN pip install --no-cache-dir \
    detectron2 \
    -f https://dl.fbaipublicfiles.com/detectron2/wheels/cu121/torch2.1/index.html

# ------------------------------------------------------------
# 4. Download model weights (cached layer)
# ------------------------------------------------------------
RUN mkdir -p "${MODEL_DIR}" && \
    curl -L -o "${MODEL_DIR}/publaynet_faster_rcnn_R_50_FPN_3x.pth" "${MODEL_URL}"

# ------------------------------------------------------------
# 5. Remaining Python requirements
# ------------------------------------------------------------
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ------------------------------------------------------------
# 6. Application source
# ------------------------------------------------------------
COPY . .

# ------------------------------------------------------------
# 7. Runtime
# ------------------------------------------------------------
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
