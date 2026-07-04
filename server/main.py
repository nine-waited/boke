"""
Chestnut Remote Vault Server — FastAPI file-based storage API.
"""
from __future__ import annotations

import os
import secrets
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel, Field

APP_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.environ.get("BOKE_DATA_DIR", str(APP_DIR / "data")))
VAULTS_DIR = DATA_DIR / "vaults"
ATTACHMENTS_DIR = DATA_DIR / "attachments"

API_TOKEN = os.environ.get("BOKE_API_TOKEN", "dev-token-change-me")

app = FastAPI(title="Chestnut Vault API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def ensure_dirs() -> None:
    VAULTS_DIR.mkdir(parents=True, exist_ok=True)
    ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)


def auth(authorization: str | None = Header(default=None)) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    if not secrets.compare_digest(token, API_TOKEN):
        raise HTTPException(status_code=403, detail="Invalid token")


def vault_root(vault_id: str) -> Path:
    if ".." in vault_id or "/" in vault_id or "\\" in vault_id:
        raise HTTPException(status_code=400, detail="Invalid vault id")
    root = VAULTS_DIR / vault_id
    root.mkdir(parents=True, exist_ok=True)
    return root


def safe_path(root: Path, rel: str) -> Path:
    rel = rel.replace("\\", "/").lstrip("/")
    target = (root / rel).resolve()
    if not str(target).startswith(str(root.resolve())):
        raise HTTPException(status_code=400, detail="Path traversal")
    return target


class WriteBody(BaseModel):
    content: str


class MkdirBody(BaseModel):
    path: str


class RenameBody(BaseModel):
    model_config = {"populate_by_name": True}

    from_path: str = Field(alias="from")
    to_path: str = Field(alias="to")


@app.on_event("startup")
def startup() -> None:
    ensure_dirs()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/vault/{vault_id}/list")
def list_dir(vault_id: str, dir: str = "", _: None = Depends(auth)) -> list[dict[str, Any]]:
    root = vault_root(vault_id)
    target = safe_path(root, dir) if dir else root
    if not target.is_dir():
        raise HTTPException(status_code=404, detail="Not a directory")
    entries: list[dict[str, Any]] = []
    for child in sorted(target.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
        rel = child.relative_to(root).as_posix()
        stat = child.stat()
        entries.append(
            {
                "path": rel,
                "name": child.name,
                "kind": "directory" if child.is_dir() else "file",
                "size": stat.st_size if child.is_file() else None,
                "mtimeMs": int(stat.st_mtime * 1000),
            }
        )
    return entries


@app.api_route("/api/vault/{vault_id}/{file_path:path}", methods=["GET", "PUT", "DELETE", "HEAD"])
async def vault_file(
    vault_id: str,
    file_path: str,
    request: Request,
    body: WriteBody | None = None,
    _: None = Depends(auth),
) -> Response:
    root = vault_root(vault_id)
    target = safe_path(root, file_path)

    if request.method == "HEAD":
        if not target.is_file():
            raise HTTPException(status_code=404)
        return Response(status_code=200)

    if request.method == "GET":
        if not target.is_file():
            raise HTTPException(status_code=404)
        content = target.read_text(encoding="utf-8")
        return JSONResponse({"content": content})

    if request.method == "PUT":
        if body is None:
            raw = await request.json()
            body = WriteBody(**raw)
        target.parent.mkdir(parents=True, exist_ok=True)
        tmp = target.with_suffix(target.suffix + ".tmp")
        tmp.write_text(body.content, encoding="utf-8")
        tmp.replace(target)
        return JSONResponse({"ok": True})

    if request.method == "DELETE":
        if target.is_dir():
            import shutil

            shutil.rmtree(target)
        elif target.exists():
            target.unlink()
        return JSONResponse({"ok": True})

    raise HTTPException(status_code=405)


@app.post("/api/vault/{vault_id}/mkdir")
def mkdir(vault_id: str, body: MkdirBody, _: None = Depends(auth)) -> dict[str, bool]:
    root = vault_root(vault_id)
    target = safe_path(root, body.path)
    target.mkdir(parents=True, exist_ok=True)
    return {"ok": True}


@app.post("/api/vault/{vault_id}/rename")
def rename(vault_id: str, body: RenameBody, _: None = Depends(auth)) -> dict[str, bool]:
    root = vault_root(vault_id)
    src = safe_path(root, body.from_path)
    dst = safe_path(root, body.to_path)
    if not src.exists():
        raise HTTPException(status_code=404, detail="Source not found")
    if dst.exists():
        raise HTTPException(status_code=409, detail="Target already exists")
    dst.parent.mkdir(parents=True, exist_ok=True)
    src.rename(dst)
    return {"ok": True}


@app.api_route("/attachments/{vault_id}/{file_path:path}", methods=["GET", "PUT"])
async def attachments(
    vault_id: str,
    file_path: str,
    request: Request,
    token: str | None = None,
    authorization: str | None = Header(default=None),
) -> Response:
    if authorization:
        auth(authorization)
    elif token:
        if not secrets.compare_digest(token, API_TOKEN):
            raise HTTPException(status_code=403)
    else:
        raise HTTPException(status_code=401)

    base = ATTACHMENTS_DIR / vault_id
    base.mkdir(parents=True, exist_ok=True)
    target = safe_path(base, file_path)

    if request.method == "GET":
        if not target.is_file():
            raise HTTPException(status_code=404)
        return FileResponse(target)

    data = await request.body()
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_suffix(target.suffix + ".tmp")
    tmp.write_bytes(data)
    tmp.replace(target)
    return JSONResponse({"ok": True})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8787, reload=True)
