# SCRIPT INDEX - External AI Models Integration

## Quick Reference

### 🚀 **QUICK START (Use This Next Time):**
```bash
./quick-start.sh
```
**What it does:** Automatically starts Ollama + Backend + Verifies everything is working

---

## All Scripts Created

### **Management Scripts:**
| Script | Purpose | Usage |
|--------|---------|-------|
| `quick-start.sh` | ⭐ **START HERE** - One-click startup | `./quick-start.sh` |
| `integration-summary.sh` | Check system status and summary | `./integration-summary.sh` |
| `manage-models.sh` | Storage management utility | `./manage-models.sh status` |

### **Setup Scripts:**
| Script | Purpose | Usage |
|--------|---------|-------|
| `start-external-ollama.sh` | Start Ollama with external storage | `./start-external-ollama.sh` |
| `setup-lightweight-external-models.sh` | Create protein models | `./setup-lightweight-external-models.sh` |

### **Model Definition Files:**
| File | Purpose |
|------|---------|
| `protein-esm3-chat.Modelfile` | Chat-capable ESM3 model (4.7GB) |
| `protein-esm3.Modelfile` | Text-based ESM3 model (274MB) |
| `protein-rfdiffusion.Modelfile` | Protein design model (274MB) |
| `protein-openfold.Modelfile` | Structure prediction model (274MB) |

---

## Manual Commands (If Needed)

### Start Ollama:
```bash
./start-external-ollama.sh
# OR manually:
export OLLAMA_MODELS="/mnt/01DBA40B162FF9C0/ollama-models"
nohup ollama serve > /tmp/ollama-external.log 2>&1 &
```

### Start Backend:
```bash
cd backend
source "../../venv/bin/activate"
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Check Status:
```bash
./integration-summary.sh
```

### Test API:
```bash
curl http://localhost:8001/large-models/health
```

---

## File Locations

### **Scripts Location:**
```
/mnt/20265E15265DEC72/study/CODE/projects/webdev/protein viewer/protein-synthesis-app/
```

### **Backend Code:**
```
/mnt/20265E15265DEC72/study/CODE/projects/webdev/protein viewer/protein-synthesis-app/backend/
├── services/ollama_ai_service.py
└── routers/large_ai_models.py
```

### **Storage Locations:**
- **Local Cache:** `~/.cache/torch/hub/checkpoints/` (29MB)
- **External Models:** `/mnt/01DBA40B162FF9C0/ollama-models/` (9.4GB)

---

## Next Time Instructions

1. **Just run:** `./quick-start.sh`
2. **If issues:** Check `EXTERNAL_AI_INTEGRATION_REFERENCE.md`
3. **For manual control:** Use individual scripts above

**Everything is documented and ready to go! 🎉**
