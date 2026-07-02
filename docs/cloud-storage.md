# Cloud storage (REST API)

Boke desktop can connect to a remote vault service over HTTP. The desktop app stores API settings locally (Base URL, Bearer token, vault path).

## Reference server

`server/main.py` is a **reference implementation** for the cloud storage service. A production deployment is planned as a separate service process; the desktop client only needs a compatible REST API.

## API contract

Base path: `/api/vault/{vault_id}/`

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/{file_path}` | — | `{ "content": "..." }` |
| PUT | `/{file_path}` | `{ "content": "..." }` | 200 |
| DELETE | `/{file_path}` | — | 200 |
| HEAD | `/{file_path}` | — | 200 / 404 |
| GET | `/list?dir=` | — | `VaultEntry[]` |
| POST | `/mkdir` | `{ "path": "notes/foo" }` | 200 |

Attachments: `GET/PUT /attachments/{vault_id}/{file_path}` (binary).

Auth: `Authorization: Bearer <token>` on all requests.

## Local development (reference server)

```bash
cd server
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env
python main.py
```

In Boke Settings → 云端存储:

- Base URL: `http://localhost:8787`
- Token: value from `.env` (`BOKE_API_TOKEN`)
- Vault path: `default`

## Production

See [server/nginx.conf.example](../server/nginx.conf.example) for reverse-proxy layout.

```bash
export BOKE_API_TOKEN=long-random-token
export BOKE_DATA_DIR=/var/lib/boke/data
uvicorn main:app --host 127.0.0.1 --port 8787
```

Data layout:

```
data/
├── vaults/default/      # markdown & excalidraw
└── attachments/default/ # binary uploads
```

## Security notes

- Change `BOKE_API_TOKEN` from default
- API is single-user Bearer auth in v0.1
- Path traversal is blocked server-side
- Use HTTPS in production
