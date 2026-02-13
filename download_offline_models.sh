#!/bin/bash
set -e

# Create directories
mkdir -p offline_models/detectron2
mkdir -p offline_models/huggingface
mkdir -p offline_models/whisper

echo "Starting download of offline models..."

# 1. Detectron2 (PubLayNet)
echo "Downloading Detectron2 PubLayNet model..."
if [ ! -f "offline_models/detectron2/publaynet_faster_rcnn_R_50_FPN_3x.pth" ]; then
    wget -O offline_models/detectron2/publaynet_faster_rcnn_R_50_FPN_3x.pth \
    "https://huggingface.co/nlpconnect/PubLayNet-faster_rcnn_R_50_FPN_3x/resolve/main/model_final.pth"
else
    echo "Detectron2 model already exists, skipping."
fi

# 2. Whisper (Medium)
echo "Downloading Whisper Medium model..."
if [ ! -f "offline_models/whisper/medium.pt" ]; then
    # URL derived from standard Whisper download logic for 'medium'
    wget -O offline_models/whisper/medium.pt \
    "https://openaipublic.azureedge.net/main/whisper/models/345ae4da62f9b3d59413831a8e1be68464296218/medium.pt"
else
    echo "Whisper model already exists, skipping."
fi

# 3. Hugging Face (Sentence Transformers)
echo "Downloading Sentence Transformer model..."
if [ ! -d "offline_models/huggingface/all-MiniLM-L6-v2" ]; then
    # We use git clone to grab the model repo. Requires git-lfs usually, but for this small model it might work without?
    # Actually, all-MiniLM-L6-v2 is small (~90MB). 
    # To be safe, ensure git lfs is installed or use snapshot download python script if python is available.
    # Assuming standard linux env has git.
    
    # Check if git lfs is needed (it is for .bin files usually)
    if ! git lfs version >/dev/null 2>&1; then
        echo "WARNING: git-lfs not found. Downloading model might fail if LFS pointers are used."
        echo "Attempting clone anyway..."
    fi
    
    git clone https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2 offline_models/huggingface/all-MiniLM-L6-v2
    
    # Remove .git to save space and avoid nested repo issues
    rm -rf offline_models/huggingface/all-MiniLM-L6-v2/.git
else
    echo "Sentence Transformer model already exists, skipping."
fi

echo "All offline models downloaded to ./offline_models/"
