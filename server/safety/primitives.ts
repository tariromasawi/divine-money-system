import { randomUUID, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { Money } from "../../shared/money";

export class ControlError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
export function principal(req: Request) {
  const u = req.user as any;
  if (!req.isAuthenticated?.() || !u || !u.expires_at || u.expires_at <= Date.now() / 1000) {
    throw new ControlError("AUTHENTICATION_REQUIRED", 401);
  }
  const id = u.claims?.sub;
  const email = u.claims?.email;
  if (typeof id !== "string" || typeof email !== "string") throw new ControlError("AUTHENTICATION_REQUIRED", 401);
  return { id, email: email.toLowerCase() };
}
export const requirePrincipal = (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = principal(req);
    Object.assign(req.user as any, { id: p.id, email: p.email });
    next();
  } catch (e) { sendError(res, e); }
};
export function sendError(res: Response, error: unknown) {
  const e = error instanceof ControlError ? error : new ControlError("INTERNAL_ERROR", 500);
  return res.status(e.status).json({ error: e.code, code: e.code, requestId: res.locals.requestId });
}
export function quantity(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > 100) {
    throw new ControlError("INVALID_QUANTITY");
  }
  return value;
}
export function minorUnits(value: string, currency: string): number {
  try { return Money.parse(value,currency).stripeAmount(); }
  catch { throw new ControlError("INVALID_MONEY"); }
}
export function decimalAmount(minor: number) {
  if (!Number.isSafeInteger(minor) || minor < 0) throw new ControlError("INVALID_MONEY");
  return Money.fromMinor(minor,"USD").format();
}
export function safeReturnTarget(value:unknown):string {
  if (typeof value!=="string" || value.length>2048 || /[\\\x00-\x20]/.test(value)) return "/";
  try {
    const decoded=decodeURIComponent(value);
    if (!decoded.startsWith("/") || decoded.startsWith("//") || /[\\\x00-\x20]/.test(decoded)) return "/";
  } catch { return "/"; }
  return value;
}
const protectedKey = /^(authorization|cookie|set.cookie|password.*|.*secret.*|.*private.?key.*|.*api.?key.*|merchant.?key|.*rpc.?url.*|.*mcp.?token.*|.*database.?url.*|connection.?string|.*signing.?material.*|access.?token|refresh.?token|token|cvv|cvc|card.?number|pan|bank.*|billing.?address|destination.?details|stack|env|environment.?variables)$/i;
export function safeText(text: string) {
  return text
    .replace(/https?:\/\/[^\s"'<>]+/gi, "[URL REDACTED]")
    .replace(/\b(?:sk|rk|whsec|dlc|grok)_[A-Za-z0-9_-]+/g, "[CREDENTIAL REDACTED]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/\b(?:0x)?[a-f0-9]{64}\b/gi, "[SIGNING MATERIAL REDACTED]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL REDACTED]")
    .replace(/\b(?:\d[ -]?){13,19}\b/g, "[PAN REDACTED]");
}
export function redact(value: unknown): unknown {
  const seen=new WeakSet<object>();
  const walk=(v:unknown,depth:number):unknown=>{
    if (v instanceof Error) return {category:v.name};
    if (typeof v==="string") return safeText(v);
    if (v && typeof v==="object") {
      if (seen.has(v) || depth>8) return "[OMITTED]";
      seen.add(v);
      if (Array.isArray(v)) return v.map(item=>walk(item,depth+1));
      return Object.fromEntries(Object.entries(v).map(([k,item])=>[k,protectedKey.test(k)?"[REDACTED]":walk(item,depth+1)]));
    }
    return v;
  };
  return walk(value,0);
}
// Response filtering deliberately does not sanitize ordinary strings: checkout URLs
// and authorized download URLs must remain usable. Sensitive keys are omitted.
export function publicResponse(value: any, allowNewKey = false): any {
  if (Array.isArray(value)) return value.map(v => publicResponse(v, allowNewKey));
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  return Object.fromEntries(Object.entries(value).filter(([k]) =>
    !protectedKey.test(k) || (allowNewKey && k === "apiKey")).map(([k,v]) => [k, publicResponse(v, allowNewKey)]));
}
export function protectResponse(req: Request, res: Response, next: NextFunction) {
  res.locals.requestId = randomUUID();
  res.setHeader("X-Request-ID", res.locals.requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (req.path.startsWith("/api")) res.setHeader("Cache-Control", "no-store");
  const json = res.json.bind(res);
  res.json = ((body: any) => {
    if (res.statusCode >= 500 && !(body?.code && /^[A-Z_]+$/.test(body.code))) {
      body = { error: "PROVIDER_UNAVAILABLE", code: "PROVIDER_UNAVAILABLE", requestId: res.locals.requestId };
    }
    const responsePath=req.originalUrl.split("?")[0];
    const allow = req.method === "POST" && ["/api/merchants/register", "/api/merchants/bulk-register"].includes(responsePath);
    if (body?.error && typeof body.error === "string") body={...body,error:safeText(body.error)};
    return json(publicResponse(body, allow || (req.method==="POST" && /^\/api\/admin\/merchants\/[^/]+\/reissue$/.test(responsePath))));
  }) as Response["json"];
  next();
}
export function merchantCredentialRequest(req:Request) {
  return !!req.get("x-api-key") && ["/api/merchants/relay","/api/merchants/fiat-relay"]
    .includes(req.originalUrl.split("?")[0]);
}
export function csrf(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) || req.path === "/api/webhooks/stripe") return next();
  if (merchantCredentialRequest(req)) return next();
  const expected = (req.session as any)?.csrfToken;
  const supplied = req.get("x-csrf-token");
  if (!expected || !supplied || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return sendError(res, new ControlError("FORBIDDEN", 403));
  }
  const origin = req.get("origin");
  if (origin) {
    try { if (new URL(origin).host !== req.get("host")) throw new Error(); }
    catch { return sendError(res, new ControlError("FORBIDDEN", 403)); }
  }
  next();
}
