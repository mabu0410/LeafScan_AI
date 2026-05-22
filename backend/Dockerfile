# Dockerfile cho backend LeafScan AI
# Build: docker build -t leafscan-backend .
# Run:   docker run -p 8000:8000 --env-file .env leafscan-backend

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System deps cho Pillow + onnxruntime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg-dev \
    zlib1g-dev \
    libpng-dev \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps (layer cache friendly)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app ./app
COPY scripts ./scripts
COPY database ./database

# Create uploads directory
RUN mkdir -p ./app/uploads && touch ./app/uploads/.gitkeep

# Expose port (Render/Railway will map PORT env)
EXPOSE 8000

# Run with uvicorn — honor PORT env if set (required by Render/Railway)
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
