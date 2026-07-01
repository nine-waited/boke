import type { VaultAdapter, VaultEntry } from "@boke/core";
import { joinPath, normalizePath } from "@boke/core";

export interface RemoteConfig {
  baseUrl: string;
  token: string;
  vaultPath?: string;
}

function apiUrl(config: RemoteConfig, path: string): string {
  const base = config.baseUrl.replace(/\/$/, "");
  const vault = (config.vaultPath ?? "default").replace(/^\/+|\/+$/g, "");
  const filePath = normalizePath(path);
  return `${base}/api/vault/${vault}/${filePath}`;
}

export class RemoteRestAdapter implements VaultAdapter {
  readonly kind = "remote" as const;
  readonly id: string;
  readonly name: string;
  private assetUrlCache = new Map<string, string>();

  constructor(private config: RemoteConfig) {
    this.id = `remote-${config.vaultPath ?? "default"}`;
    this.name = `Remote: ${config.vaultPath ?? "default"}`;
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.config.token}`,
      "Content-Type": "application/json",
    };
  }

  async read(path: string): Promise<string> {
    const res = await fetch(apiUrl(this.config, path), { headers: this.headers() });
    if (!res.ok) throw new Error(`Remote read failed: ${res.status}`);
    const data = (await res.json()) as { content: string };
    return data.content;
  }

  async readBinary(path: string): Promise<Uint8Array> {
    const base = this.config.baseUrl.replace(/\/$/, "");
    const vault = (this.config.vaultPath ?? "default").replace(/^\/+|\/+$/g, "");
    const res = await fetch(`${base}/attachments/${vault}/${normalizePath(path)}`, {
      headers: { Authorization: `Bearer ${this.config.token}` },
    });
    if (!res.ok) throw new Error(`Remote binary read failed: ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  async write(path: string, content: string): Promise<void> {
    const res = await fetch(apiUrl(this.config, path), {
      method: "PUT",
      headers: this.headers(),
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error(`Remote write failed: ${res.status}`);
  }

  async writeBinary(path: string, content: Uint8Array): Promise<void> {
    const base = this.config.baseUrl.replace(/\/$/, "");
    const vault = (this.config.vaultPath ?? "default").replace(/^\/+|\/+$/g, "");
    const res = await fetch(`${base}/attachments/${vault}/${normalizePath(path)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        "Content-Type": "application/octet-stream",
      },
      body: content,
    });
    if (!res.ok) throw new Error(`Remote binary write failed: ${res.status}`);
  }

  async delete(path: string): Promise<void> {
    const res = await fetch(apiUrl(this.config, path), {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Remote delete failed: ${res.status}`);
  }

  async list(dir = ""): Promise<VaultEntry[]> {
    const base = this.config.baseUrl.replace(/\/$/, "");
    const vault = (this.config.vaultPath ?? "default").replace(/^\/+|\/+$/g, "");
    const q = dir ? `?dir=${encodeURIComponent(normalizePath(dir))}` : "";
    const res = await fetch(`${base}/api/vault/${vault}/list${q}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Remote list failed: ${res.status}`);
    return (await res.json()) as VaultEntry[];
  }

  async mkdir(path: string): Promise<void> {
    const base = this.config.baseUrl.replace(/\/$/, "");
    const vault = (this.config.vaultPath ?? "default").replace(/^\/+|\/+$/g, "");
    const res = await fetch(`${base}/api/vault/${vault}/mkdir`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ path: normalizePath(path) }),
    });
    if (!res.ok) throw new Error(`Remote mkdir failed: ${res.status}`);
  }

  async exists(path: string): Promise<boolean> {
    const res = await fetch(apiUrl(this.config, path), {
      method: "HEAD",
      headers: this.headers(),
    });
    return res.ok;
  }

  async getAssetUrl(path: string): Promise<string> {
    const normalized = normalizePath(path);
    const cached = this.assetUrlCache.get(normalized);
    if (cached) return cached;
    const base = this.config.baseUrl.replace(/\/$/, "");
    const vault = (this.config.vaultPath ?? "default").replace(/^\/+|\/+$/g, "");
    const url = `${base}/attachments/${vault}/${normalized}?token=${encodeURIComponent(this.config.token)}`;
    this.assetUrlCache.set(normalized, url);
    return url;
  }
}

export function loadRemoteConfig(): RemoteConfig | null {
  try {
    const raw = localStorage.getItem("boke-remote-config");
    if (!raw) return null;
    return JSON.parse(raw) as RemoteConfig;
  } catch {
    return null;
  }
}

export function saveRemoteConfig(config: RemoteConfig | null): void {
  if (config) localStorage.setItem("boke-remote-config", JSON.stringify(config));
  else localStorage.removeItem("boke-remote-config");
}
