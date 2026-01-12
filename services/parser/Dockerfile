# Use stable Bookworm slim image for reliability
FROM python:3.10-slim-bookworm

# Install system dependencies
# - libgl1/libglib2.0-0: Required for OpenCV
# - poppler-utils: Required for PDF processing
# - tesseract-ocr: Optional fallback for OCR
# - libreoffice: Required for PPTX -> PDF conversion
# - build-essential: Required for compiling some python extensions
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

# 1. Install PyTorch CPU (Significant size reduction for non-GPU instances)
# If using GPU, remove --index-url and let it install cuda version
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# 2. Install Detectron2 (Must be after Torch)
RUN python -m pip install 'git+https://github.com/facebookresearch/detectron2.git'

# 3. Install remaining dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy Code
COPY . .

# 5. Runtime
EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]