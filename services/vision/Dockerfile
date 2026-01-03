FROM python:3.10-slim

# Install system dependencies (needed for CV2 and others)
# FIXED: Replaced libgl1-mesa-glx with libgl1
RUN apt-get update && apt-get install -y \
    git \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Dependencies
# pip will automatically download:
# - The CPU wheel on ARM64 (Mac)
# - The CUDA wheel on x86_64 (Linux/Prod)
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]