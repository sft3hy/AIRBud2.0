# =============================================================
# Base image: slim Ubuntu with Python 3.10
# =============================================================
FROM python:3.10-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    MODEL_DIR=/root/.torch/detectron2_models \
    MODEL_URL="https://www.dropbox.com/s/dgy9c10wykk4lq4/model_final.pth?dl=1"

WORKDIR /app

# =============================================================
# 1. System dependencies
# =============================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    curl \
    wget \
    ninja-build \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    poppler-utils \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# =============================================================
# 2. Install PyTorch (CUDA-enabled)
# =============================================================
RUN pip install --no-cache-dir --upgrade pip

# Adjust the CUDA version to match your GPU / PyTorch wheel availability
RUN pip install --no-cache-dir \
    torch==2.1.0+cu118 \
    torchvision==0.16.0+cu118 \
    torchaudio==2.1.0+cu118 \
    --index-url https://download.pytorch.org/whl/cu118

# =============================================================
# 3. Install Detectron2 from source (GitHub)
# =============================================================
RUN git clone --depth 1 https://github.com/facebookresearch/detectron2.git /tmp/detectron2 && \
    pip install --no-cache-dir --upgrade cython && \
    pip install --no-cache-dir -e /tmp/detectron2 && \
    rm -rf /tmp/detectron2

# =============================================================
# 4. Download model weights
# =============================================================
RUN mkdir -p "$MODEL_DIR" && \
    curl -L -o "$MODEL_DIR/publaynet_faster_rcnn_R_50_FPN_3x.pth" "$MODEL_URL"

# =============================================================
# 5. Install remaining Python requirements
# =============================================================
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# =============================================================
# 6. Copy app source code
# =============================================================
COPY . .

# =============================================================
# 7. Run the app
# =============================================================
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
