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

async function invoke(path: string, input: Record<string, unknown>, cookie = "") {
  const handler = (await import("../api/trpc")).default;
  const res = makeResponse();
  const headers: Record<string, string> = { "x-forwarded-for": "203.0.113.7, 10.0.0.1", "user-agent": "Unit Test Browser" };
  if (cookie) headers.cookie = cookie.split(";")[0];
  await handler({
    url: `/api/trpc?path=${encodeURIComponent(path)}`,
    method: "POST",
    headers,
    body: { json: input },
  }, res);
  return res;
}

function responseData(response: ReturnType<typeof makeResponse>) {
  return JSON.parse(response.body).result.data.json;
}

describe("Vercel admin login", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("RBXIS_ADMIN_KEY", "correct-admin-key");
    vi.stubEnv("RBXIS_SESSION_SECRET", "unit-test-session-secret");
    vi.stubEnv("DISCORD_ADMIN_LOGIN_WEBHOOK", "https://discord.com/api/webhooks/123/test-token");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("notifies Discord only for an incorrect admin key and never includes the submitted key", async () => {
    const res = await invoke("auth.adminLogin", { adminKey: "wrong-admin-key" });
    const fetchMock = vi.mocked(globalThis.fetch);

    expect(res.statusCode).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://discord.com/api/webhooks/123/test-token");
    const payload = JSON.parse(String(init?.body));
    expect(payload.embeds[0].title).toContain("inválida");
    expect(JSON.stringify(payload)).toContain("203.0.113.7");
    expect(JSON.stringify(payload)).not.toContain("wrong-admin-key");
    expect(JSON.stringify(payload)).not.toContain("correct-admin-key");
    expect(payload.allowed_mentions).toEqual({ parse: [] });
  });

  it("does not notify Discord when the admin key is correct", async () => {
    const res = await invoke("auth.adminLogin", { adminKey: "correct-admin-key" });
    expect(res.statusCode).toBe(200);
    expect(responseData(res).username).toBe("CLEADMIN00");
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it("creates a monthly MockAPI key and expires it 30 days after first login", async () => {
    const rows: Record<string, unknown>[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method === "GET") return new Response(JSON.stringify(rows), { status: 200, headers: { "content-type": "application/json" } });
      if (method === "POST") {
        const row = { id: "monthly-vercel-1", ...JSON.parse(String(init?.body)) };
        rows.push(row);
        return new Response(JSON.stringify(row), { status: 201, headers: { "content-type": "application/json" } });
      }
      if (method === "PUT") {
        const id = decodeURIComponent(new URL(String(input)).pathname.split("/").pop() ?? "");
        const row = rows.find(value => value.id === id);
        if (!row) return new Response("Not found", { status: 404 });
        Object.assign(row, JSON.parse(String(init?.body)));
        return new Response(JSON.stringify(row), { status: 200, headers: { "content-type": "application/json" } });
      }
      throw new Error(`Unexpected MockAPI method: ${method}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const admin = await invoke("auth.adminLogin", { adminKey: "correct-admin-key" });
    const created = await invoke("admin.createLicense", { username: "monthly_user", planId: "monthly", durationValue: 1, durationUnit: "months" }, admin.headers["Set-Cookie"]);
    expect(admin.statusCode).toBe(200);
    expect(created.statusCode).toBe(200);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(true);
    expect(rows[0]).toMatchObject({ username: "monthly_user", type: "monthly", expire: 30, used: false, activatedAt: 0, expiresAt: 0, status: "active" });
    expect(responseData(created)).toMatchObject({ planId: "monthly", durationValue: 1, durationUnit: "months" });

    const key = String(responseData(created).accessKey);
    const login = await invoke("auth.login", { accessKey: key, deviceId: "device-monthly-1234" });
    expect(login.statusCode).toBe(200);
    expect(Number(rows[0].expiresAt) - Number(rows[0].activatedAt)).toBe(30 * 24 * 60 * 60);
    const expiryAfterActivation = Number(rows[0].expiresAt);
    const secondLogin = await invoke("auth.login", { accessKey: key, deviceId: "device-monthly-1234" });
    expect(secondLogin.statusCode).toBe(200);
    expect(Number(rows[0].expiresAt)).toBe(expiryAfterActivation);
  });

  it("rejects monthly creation unless its duration is exactly one month", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if ((init?.method ?? "GET") === "GET") return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
      throw new Error("A validação não deve enviar POST à MockAPI");
    });
    vi.stubGlobal("fetch", fetchMock);
    const admin = await invoke("auth.adminLogin", { adminKey: "correct-admin-key" });
    const response = await invoke("admin.createLicense", { username: "monthly_user", planId: "monthly", durationValue: 2, durationUnit: "months" }, admin.headers["Set-Cookie"]);
    expect(response.statusCode).toBe(400);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("rejects a monthly key after its 30-day expiry even if its stored status is active", async () => {
    const now = Math.floor(Date.now() / 1000);
    const row = { id: "monthly-expired-1", key: "CLEAN-SENSI-monthly-expired", username: "monthly_user", used: true, device: "device-monthly-1234", expire: 30, type: "monthly", createdAt: now - 31 * 24 * 60 * 60, activatedAt: now - 30 * 24 * 60 * 60 - 1, expiresAt: now - 1, status: "active" };
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if ((init?.method ?? "GET") === "GET") return new Response(JSON.stringify(row.id ? [row] : []), { status: 200, headers: { "content-type": "application/json" } });
      if (init?.method === "DELETE") { delete (row as Partial<typeof row>).id; return new Response(null, { status: 204 }); }
      throw new Error("Uma key vencida não deve ser reativada durante o login");
    });
    vi.stubGlobal("fetch", fetchMock);
    const response = await invoke("auth.login", { accessKey: row.key, deviceId: "device-monthly-1234" });
    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body).error.json.message).toContain("expirou");
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(false);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(true);
    expect(row.id).toBeUndefined();
  });

  it("blocks an existing user session after expiry and deletes its MockAPI key", async () => {
    const now = Math.floor(Date.now() / 1000);
    let rows: Record<string, unknown>[] = [{ id: "hourly-session-1", key: "CLEAN-SENSI-hourly-session", username: "hourly_user", used: true, device: "device-hourly-1234", expire: 1, type: "hourly", createdAt: now - 60, activatedAt: now - 60, expiresAt: now + 3600, status: "active" }];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method === "GET") return new Response(JSON.stringify(rows), { status: 200, headers: { "content-type": "application/json" } });
      const id = decodeURIComponent(new URL(String(input)).pathname.split("/").pop() ?? "");
      if (method === "PUT") {
        const row = rows.find(value => value.id === id);
        if (!row) return new Response("Not found", { status: 404 });
        Object.assign(row, JSON.parse(String(init?.body)));
        return new Response(JSON.stringify(row), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (method === "DELETE") {
        rows = rows.filter(row => row.id !== id);
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected MockAPI method: ${method}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const login = await invoke("auth.login", { accessKey: "CLEAN-SENSI-hourly-session", deviceId: "device-hourly-1234" });
    expect(login.statusCode).toBe(200);
    rows[0].expiresAt = now - 1;
    const generated = await invoke("generator.generate", { operatingSystem: "android", device: "Android phone", performance: "medium" }, login.headers["Set-Cookie"]);
    expect(generated.statusCode).toBe(403);
    expect(rows).toEqual([]);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(true);
  });

  it("fails closed when the session secret is missing", async () => {
    vi.stubEnv("RBXIS_SESSION_SECRET", "");
    const admin = await invoke("auth.adminLogin", { adminKey: "correct-admin-key" });
    const user = await invoke("auth.login", { accessKey: "YXZ-hourly-test", deviceId: "device-1234" });
    expect(admin.statusCode).toBe(503);
    expect(user.statusCode).toBe(503);
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it("fails closed when the admin key is missing", async () => {
    vi.stubEnv("RBXIS_ADMIN_KEY", "");
    const admin = await invoke("auth.adminLogin", { adminKey: "anything" });
    expect(admin.statusCode).toBe(503);
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it("keeps login handling functional when the webhook environment variable is absent", async () => {
    vi.stubEnv("DISCORD_ADMIN_LOGIN_WEBHOOK", "");
    const res = await invoke("auth.adminLogin", { adminKey: "wrong-admin-key" });
    expect(res.statusCode).toBe(401);
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
  });

  it("reports activation only on the first successful user login", async () => {
    let row: Record<string, unknown> = { id: "101", key: "YXZ-hourly-test", username: "test", used: false, device: "", expire: 1, type: "hourly", createdAt: 1_800_000_000, activatedAt: 0, expiresAt: 0, status: "active" };
    vi.stubGlobal("fetch", vi.fn(async (_input, init) => {
      if ((init?.method ?? "GET") === "GET") return new Response(JSON.stringify([row]), { status: 200, headers: { "content-type": "application/json" } });
      if (init?.method === "PUT") {
        row = { ...row, ...JSON.parse(String(init.body)) };
        return new Response(JSON.stringify(row), { status: 200, headers: { "content-type": "application/json" } });
      }
      throw new Error(`Unexpected MockAPI method: ${init?.method}`);
    }));

    const first = await invoke("auth.login", { accessKey: "YXZ-hourly-test", deviceId: "device-1234" });
    const second = await invoke("auth.login", { accessKey: "YXZ-hourly-test", deviceId: "device-1234" });
    expect(first.statusCode).toBe(200);
    expect(responseData(first).activatedNow).toBe(true);
    expect(second.statusCode).toBe(200);
    expect(responseData(second).activatedNow).toBe(false);
  });

  it("keeps resetAll admin-only after expired keys are automatically purged", async () => {
    let rows: Record<string, unknown>[] = [
      { id: "201", key: "YXZ-daily-one", used: false, device: "", expire: 1, type: "daily", createdAt: 1, activatedAt: 0, expiresAt: 0, status: "active" },
      { id: "202", key: "YXZ-weekly-two", used: true, device: "hwid", expire: 7, type: "weekly", createdAt: 2, activatedAt: 2, expiresAt: 3, status: "active" },
    ];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method === "GET") return new Response(JSON.stringify(rows), { status: 200, headers: { "content-type": "application/json" } });
      if (method === "DELETE") {
        const id = new URL(String(input)).pathname.split("/").pop();
        rows = rows.filter(row => row.id !== id);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "content-type": "application/json" } });
      }
      throw new Error(`Unexpected MockAPI method: ${method}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const login = await invoke("auth.adminLogin", { adminKey: "correct-admin-key" });
    const reset = await invoke("admin.resetAll", { confirm: true }, login.headers["Set-Cookie"]);
    expect(login.statusCode).toBe(200);
    expect(reset.statusCode).toBe(200);
    expect(responseData(reset)).toEqual({ success: true, count: 1 });
    expect(rows).toEqual([]);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE")).toHaveLength(2);
  });
});
