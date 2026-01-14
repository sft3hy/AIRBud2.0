FROM python:3.10-slim

# Install system dependencies
# libgl1 and libglib2.0-0 are required for OpenCV (often used by vision utils)
RUN apt-get update && apt-get install -y \
    git \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
# This pulls ~2GB+ of ML libraries, so caching this layer is important
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose port
EXPOSE 8002

# Run
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002", "--reload"]