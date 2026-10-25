import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function makeResponse() {
  return {
    headers: {} as Record<string, string>,
    statusCode: 200,
    body: "",
    setHeader(name: string, value: string) { this.headers[name] = value; },
    end(value: string) { this.body = value; },
  };
}

describe("expired-key cleanup cron", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("CRON_SECRET", "unit-test-cron-secret");
    vi.stubEnv("MOCKAPI_KEYS_URL", "https://example.mockapi.io/licencas");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("requires the configured cron secret and does not access MockAPI when unauthorized", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const handler = (await import("../api/cleanup-expired")).default;
    const response = makeResponse();

    await handler({ method: "GET", headers: {} }, response);

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body).success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deletes expired and legacy-used keys while preserving unactivated, valid, and permanent keys", async () => {
    const now = Math.floor(Date.now() / 1000);
    let rows: Record<string, unknown>[] = [
      { id: "expired-explicit", key: "EXPIRED-EXPLICIT", type: "monthly", expire: 30, activatedAt: now - 31 * 86400, expiresAt: now - 1 },
      { id: "expired-legacy-hourly", key: "EXPIRED-HOURLY", type: "hourly", expire: 1, activatedAt: now - 3601, expiresAt: 0 },
      { id: "expired-legacy-daily", key: "EXPIRED-DAILY", type: "daily", expire: 1, activatedAt: now - 86401, expiresAt: 0 },
      { id: "expired-legacy-used", key: "EXPIRED-LEGACY", type: "daily", expire: 1, used: true, device: "legacy-device", createdAt: now - 2 * 86400, activatedAt: 0, expiresAt: 0 },
      { id: "unactivated", key: "NOT-ACTIVATED", type: "daily", expire: 1, activatedAt: 0, expiresAt: 0 },
      { id: "still-valid", key: "STILL-VALID", type: "monthly", expire: 30, activatedAt: now, expiresAt: now + 29 * 86400 },
      { id: "permanent", key: "PERMANENT", type: "perm", expire: 0, activatedAt: 0, expiresAt: now - 100 },
    ];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if ((init?.method ?? "GET") === "GET") return new Response(JSON.stringify(rows), { status: 200, headers: { "content-type": "application/json" } });
      if (init?.method === "DELETE") {
        const id = decodeURIComponent(new URL(String(input)).pathname.split("/").pop() ?? "");
        rows = rows.filter(row => row.id !== id);
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected method: ${init?.method}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const handler = (await import("../api/cleanup-expired")).default;
    const response = makeResponse();

    await handler({ method: "GET", headers: { authorization: "Bearer unit-test-cron-secret" } }, response);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ success: true, scanned: 7, deleted: 4 });
    expect(rows.map(row => row.id)).toEqual(["unactivated", "still-valid", "permanent"]);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE")).toHaveLength(4);
  });
});
