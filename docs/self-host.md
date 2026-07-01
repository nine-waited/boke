# Self-hosting Boke

## Components

1. **Static frontend** — `pnpm build` in `apps/web` → `apps/web/dist`
2. **API server** — `server/main.py` (FastAPI on port 8787)

## Local development

```bash
# Terminal 1 — API
cd server
pip install -r requirements.txt
set BOKE_API_TOKEN=your-secret-token
python main.py

# Terminal 2 — Web UI
cd ..
pnpm dev
```

In Boke Settings:

- Base URL: `http://localhost:8787`
- Token: `your-secret-token`
- Vault path: `default`

## Production (Nginx)

1. Build frontend: `pnpm build`
2. Copy `apps/web/dist` to `/var/www/boke/dist`
3. Use [server/nginx.conf.example](../server/nginx.conf.example)
4. Set environment:

```bash
export BOKE_API_TOKEN=long-random-token
export BOKE_DATA_DIR=/var/lib/boke/data
```

5. Run API with systemd or Docker:

```bash
uvicorn main:app --host 127.0.0.1 --port 8787
```

## Data layout on server

```
data/
├── vaults/default/     # markdown & excalidraw files
└── attachments/default/ # binary uploads
```

## HTTPS

Use Let's Encrypt (certbot) — same pattern as a typical Nginx + reverse proxy setup.

## Security notes

- Change `BOKE_API_TOKEN` from default
- API is single-user Bearer auth in v0.1
- Path traversal is blocked server-side
