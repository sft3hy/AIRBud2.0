# Use a specific stable version (Bookworm)
FROM python:3.10-slim-bookworm

# --- FIX: Configure Robust Package Mirrors ---
# We delete the default configuration and write a standard sources.list
# 1. Main Repo -> ftp.us.debian.org (Reliable US Mirror)
# 2. Security Repo -> security.debian.org (The official security CDN)
RUN rm -f /etc/apt/sources.list.d/debian.sources && \
    echo "deb http://ftp.us.debian.org/debian bookworm main" > /etc/apt/sources.list && \
    echo "deb http://ftp.us.debian.org/debian bookworm-updates main" >> /etc/apt/sources.list && \
    echo "deb http://security.debian.org/debian-security bookworm-security main" >> /etc/apt/sources.list
# ---------------------------------------------

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

# 1. Install PyTorch CPU first
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# 2. Install Detectron2
RUN python -m pip install 'git+https://github.com/facebookresearch/detectron2.git'

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]