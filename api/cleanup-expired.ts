import { timingSafeEqual } from "node:crypto";

type MockKeyRow = {
  id?: string;
  key?: string;
  type?: string;
  expire?: number;
  used?: boolean;
  device?: string;
  createdAt?: number;
  activatedAt?: number;
  expiresAt?: number;
};

type ApiRequest = { method?: string; headers?: Record<string, string | string[] | undefined> };
type ApiResponse = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(value: string): void;
};

const MOCKAPI_KEYS_URL = process.env.MOCKAPI_KEYS_URL?.trim() || "https://6ac92b96fd7c536b1bda8e99.mockapi.io/licencas";

function authorized(header: string | string[] | undefined, secret: string) {
  if (typeof header !== "string" || !secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function expirySeconds(row: MockKeyRow) {
  if (row.type === "perm") return 0;
  const savedExpiry = Number(row.expiresAt ?? 0);
  if (savedExpiry > 0) return savedExpiry;
  const activatedAt = Number(row.activatedAt ?? 0) || ((row.used || row.device) ? Number(row.createdAt ?? 0) : 0);
  if (!activatedAt) return 0;
  const amount = Math.max(1, Number(row.expire) || 1);
  return activatedAt + amount * (row.type === "hourly" ? 60 * 60 : 24 * 60 * 60);
}

async function listAllKeys() {
  const rows: MockKeyRow[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= 1000; page++) {
    const response = await fetch(`${MOCKAPI_KEYS_URL}?page=${page}&limit=100&sortBy=createdAt&order=desc`, { cache: "no-store" });
    if (!response.ok) throw new Error(`MockAPI list failed with status ${response.status}`);
    const current = await response.json() as MockKeyRow[];
    if (!Array.isArray(current)) throw new Error("MockAPI returned an invalid license list");
    for (const row of current) {
      const id = String(row.id ?? row.key ?? "");
      if (id && !seen.has(id)) {
        seen.add(id);
        rows.push(row);
      }
    }
    if (current.length < 100) break;
  }
  return rows;
}

async function deleteKey(id: string) {
  const response = await fetch(`${MOCKAPI_KEYS_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    cache: "no-store",
  });
  // Concurrent login/list requests may have already removed the same expired row.
  if (!response.ok && response.status !== 404) throw new Error(`MockAPI delete failed with status ${response.status}`);
}

function respond(res: ApiResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}

export default async function cleanupExpired(req: ApiRequest, res: ApiResponse) {
  if (req.method !== "GET") return respond(res, 405, { success: false, error: "Method not allowed" });
  const cronSecret = process.env.CRON_SECRET?.trim() || "";
  if (!authorized(req.headers?.authorization, cronSecret)) return respond(res, 401, { success: false, error: "Unauthorized" });

  try {
    const rows = await listAllKeys();
    const now = Math.floor(Date.now() / 1000);
    const expired = rows.filter(row => {
      const expiry = expirySeconds(row);
      return expiry > 0 && expiry <= now;
    });
    const ids = expired.map(row => String(row.id ?? row.key ?? "")).filter(Boolean);
    for (let index = 0; index < ids.length; index += 5) {
      await Promise.all(ids.slice(index, index + 5).map(deleteKey));
    }
    return respond(res, 200, { success: true, scanned: rows.length, deleted: ids.length });
  } catch {
    return respond(res, 500, { success: false, error: "Expired-key cleanup failed" });
  }
}
