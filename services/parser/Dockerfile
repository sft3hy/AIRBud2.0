FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    libgl1-mesa-glx \
    libglib2.0-0 \
    poppler-utils \
    tesseract-ocr \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install PyTorch CPU (Detectron requirement)
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install Detectron2
RUN python -m pip install 'git+https://github.com/facebookresearch/detectron2.git'

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]