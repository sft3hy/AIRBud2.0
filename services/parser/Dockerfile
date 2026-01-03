# Use a specific stable version (Bookworm) to avoid unstable repo mirrors
FROM python:3.10-slim-bookworm

# Install system dependencies
# Added --fix-missing to handle connection drops during large downloads
RUN apt-get update && apt-get install -y --fix-missing \
    git \
    libgl1 \
    libglib2.0-0 \
    poppler-utils \
    tesseract-ocr \
    g++ \
    gcc \
    libreoffice \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Install PyTorch CPU first (works for Mac & Prod Parser)
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# 2. Install Detectron2
RUN python -m pip install 'git+https://github.com/facebookresearch/detectron2.git'

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]