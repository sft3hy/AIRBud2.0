# STAGE 1: Builder (Compilers & Heavy Lifting)
FROM python:3.10-slim-bookworm as builder

WORKDIR /app

# Install compilers (only needed for building, not running)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create a virtual environment to isolate dependencies
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# 1. Install PyTorch CPU first (Heaviest layer, rarely changes)
# We do this BEFORE requirements.txt to maximize Docker caching
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# 2. Install remaining dependencies (Faiss, etc.)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# STAGE 2: Runtime (Minimal Production Image)
FROM python:3.10-slim-bookworm

WORKDIR /app

# Set env vars for production
# PATH: Ensures we use the copied venv by default
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# Install ONLY runtime system libs
# libgomp1 is strictly required for faiss-cpu/torch optimizations
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy the pre-built virtual environment from the builder stage
COPY --from=builder /opt/venv /opt/venv

# Copy application code
COPY . .

# Set permissions and switch user
RUN chown -R appuser:appuser /app
USER appuser

# --proxy-headers: Critical for running behind Nginx/AWS LB/K8s
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--reload"]