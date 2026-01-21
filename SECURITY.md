To run AIRBud 2.0 on an offline device, you cannot rely on the code downloading models at runtime or build time. You must manually download the artifacts and mount them into the containers.

Here is the complete manifest of required files and where to inject the paths in your code.

### Phase 1: The Download Manifest

Perform these steps on an **internet-connected machine**.

#### 1. Parser Service (Detectron2 Layout Analysis)

- **File:** `publaynet_faster_rcnn_R_50_FPN_3x.pth`
- **Download Link:** [Dropbox Link](https://www.dropbox.com/s/dgy9c10wykk4lq4/model_final.pth?dl=1)
- **Action:** Rename the downloaded file to `publaynet_faster_rcnn_R_50_FPN_3x.pth`.

#### 2. Vision Service (Whisper Audio)

- **File:** `medium.pt`
- **Download Link:** [OpenAI CDN](https://openaipublic.azureedge.net/main/whisper/models/345ae4da62f9b3d59413837530fbf5d0e65070a22525203a97d3b080f9dd043e/medium.pt)

#### 3. Vision Service (Moondream2 VLM)

This is a Hugging Face repository. You need the full folder structure, not just one file.

- **Repo:** `vikhyatk/moondream2`
- **Method:** Use `huggingface-cli` or `git lfs`.
  ```bash
  git clone https://huggingface.co/vikhyatk/moondream2
  cd moondream2
  # Ensure you are on the specific revision used in the code to prevent mismatches
  git checkout 2025-06-21
  ```

#### 4. RAG Core (Embeddings)

- **Repo:** `sentence-transformers/all-MiniLM-L6-v2`
- **Method:**
  ```bash
  git clone https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
  ```

#### 5. Ollama Models (for Offline LLM & KG)

Since you cannot run `ollama pull` on the air-gapped machine, you must save the model blobs.

- **Method:**
  1.  Run Docker Desktop on internet machine.
  2.  `docker pull ollama/ollama`
  3.  `docker run -d --name temp_ollama ollama/ollama`
  4.  `docker exec -it temp_ollama ollama pull llama3` (or your preferred model)
  5.  `docker exec -it temp_ollama ollama pull granite-code` (optional, for vision if needed)
  6.  **Export:** On your host machine, locate the Docker volume or simply `docker commit temp_ollama offline_ollama_image` and save that image as a tarball: `docker save -o ollama_offline.tar offline_ollama_image`.
      _Alternatively_, if running Ollama natively, locate your `~/.ollama/models` folder and copy it.

---

### Phase 2: File System Organization

Organize these files on your transfer drive/folder like this:

```text
/offline_models/
├── detectron2/
│   └── publaynet_faster_rcnn_R_50_FPN_3x.pth
├── whisper/
│   └── medium.pt
├── huggingface/
│   ├── moondream2/      (Folder containing config.json, model.safetensors, etc.)
│   └── all-MiniLM-L6-v2/ (Folder containing config.json, pytorch_model.bin, etc.)
└── ollama_models/       (If using the volume mapping method)
```

---

### Phase 3: Docker Compose Injection

Modify `docker-compose.yml` to mount these offline models into the containers.

```yaml
services:
  # ... other services ...

  rag_core:
    # ... existing config ...
    volumes:
      - shared_data:/data
      - ./services/rag_core:/app
      # INJECT THIS LINE:
      - ./offline_models/huggingface:/models/huggingface:ro

  parser:
    # ... existing config ...
    volumes:
      - shared_data:/data
      - ./services/parser:/app
      # INJECT THIS LINE:
      - ./offline_models/detectron2:/models/detectron2:ro

  vision:
    # ... existing config ...
    volumes:
      - shared_data:/data
      - ./services/vision:/app
      # INJECT THESE LINES:
      - ./offline_models/huggingface:/models/huggingface:ro
      - ./offline_models/whisper:/models/whisper:ro
```

---

### Phase 4: Code Injection Points

Update the source code to point to these mounted directories instead of URLs/Cache folders.

#### 1. Parser Service: `services/parser/src/config.py`

Change the logic to point to the mounted volume file.

```python
# services/parser/src/config.py

class Config:
    # ... existing code ...

    # OLD:
    # MODEL_CACHE_DIR = Path.home() / ".torch" / "detectron2_models"
    # MODEL_WEIGHTS_FILE = "publaynet_faster_rcnn_R_50_FPN_3x.pth"

    # NEW (Inject this):
    MODEL_CACHE_DIR = Path("/models/detectron2")
    MODEL_WEIGHTS_FILE = "publaynet_faster_rcnn_R_50_FPN_3x.pth"

    # The code in detector.py will use (MODEL_CACHE_DIR / MODEL_WEIGHTS_FILE)
    # which resolves to /models/detectron2/publaynet_faster_rcnn_R_50_FPN_3x.pth
```

#### 2. RAG Core: `services/rag_core/src/config.py`

Point the embedding model to the local folder.

```python
# services/rag_core/src/config.py

class Config:
    # ... existing code ...

    # OLD:
    # EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

    # NEW (Inject this):
    EMBEDDING_MODEL = "/models/huggingface/all-MiniLM-L6-v2"
```

#### 3. Vision Service: `services/vision/src/core/models.py`

You need to update **Moondream** (HuggingFace) and **Whisper**.

**For Moondream (Line ~130):**

```python
class Moondream2Model(VisionModel):
    def load(self) -> bool:
        # ... imports ...
        try:
            # OLD:
            # model_id = "vikhyatk/moondream2"

            # NEW (Inject this):
            model_id = "/models/huggingface/moondream2"

            # NOTE: Remove 'revision' argument as local folders don't have git revisions
            self.model = AutoModelForCausalLM.from_pretrained(
                model_id,
                # revision=revision,  <-- REMOVE THIS
                trust_remote_code=True,
                # ... rest of settings
            )
             self.tokenizer = AutoTokenizer.from_pretrained(model_id) # Remove revision here too
```

**For Whisper (Line ~40):**

```python
class WhisperAudioModel:
    def load(self) -> bool:
        try:
            # OLD:
            # self.model = whisper.load_model("medium", device=self.device)

            # NEW (Inject this):
            # Pass the direct path to the .pt file
            self.model = whisper.load_model("/models/whisper/medium.pt", device=self.device)
            return True
        except Exception as e:
            # ...
```

#### 4. KG Service: `services/kg_service/src/config.py`

Ensure the service points to your local (offline) Ollama instance rather than attempting to connect to Groq/Sanctuary APIs.

```python
# services/kg_service/src/config.py

class Config:
    # ...
    # Force offline provider
    LLM_PROVIDER = "ollama"

    # Ensure this matches the name of the model you saved/transferred in Phase 1
    MODEL_NAME = "llama3"

    # Point to the internal docker network alias for ollama
    OLLAMA_BASE_URL = "http://ollama:11434/v1"
```
