# Cloud storage reference server

Reference FastAPI implementation for Boke's REST vault API. The desktop app (`RemoteRestAdapter`) talks to this API; production cloud service will evolve from this codebase.

## Quick start

```bash
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env
python main.py
```

Default port: **8787**

See [docs/cloud-storage.md](../docs/cloud-storage.md) for API contract and desktop configuration.
