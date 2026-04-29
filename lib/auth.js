import { createHmac, timingSafeEqual } from "node:crypto";

export function hashPassword(password, secret) {
  return createHmac("sha256", secret).update(password).digest("hex");
}

export function safeCompare(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function signToken(payload, secret) {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
    }),
  );
  const signature = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");

  if (!safeCompare(signature, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function requireAuth(req, res, options) {
  const { readDatabase, sendJson, tokenSecret } = options;
  const token = getBearerToken(req);
  const payload = token ? verifyToken(token, tokenSecret) : null;

  if (!payload?.sub || !payload?.companyId) {
    sendJson(res, 401, { error: "Sessao invalida ou expirada." });
    return null;
  }

  const db = await readDatabase();
  const user = db.users.find((item) => item.id === payload.sub && item.companyId === payload.companyId);
  const company = db.companies.find((item) => item.id === payload.companyId);

  if (!user || !company) {
    sendJson(res, 401, { error: "Usuario nao encontrado." });
    return null;
  }

  return { db, user, company };
}

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

function base64Url(text) {
  return Buffer.from(text, "utf8").toString("base64url");
}
