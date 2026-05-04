import crypto from "crypto";

// ==========================================
// DOWNLOAD SERVICE
// Generate & verify signed URL untuk produk digital
// Signed URL format: /api/orders/download/:token
// Token: HMAC-SHA256(itemId + expiresAt) + payload base64
// ==========================================

const DOWNLOAD_SECRET = process.env.JWT_SECRET ?? "fallback_secret";

// ==========================================
// HELPER: encode payload ke base64url (URL-safe)
// ==========================================
const base64urlEncode = (str: string): string =>
  Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

const base64urlDecode = (str: string): string =>
  Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf8",
  );

// ==========================================
// GENERATE SIGNED TOKEN
// Dipanggil saat email payment_success dikirim
// ==========================================
export interface SignedDownloadPayload {
  item_id: string; // order_items.id
  order_id: string; // orders.id
  expires_at: number; // unix timestamp (ms)
}

export const generateDownloadToken = (
  payload: SignedDownloadPayload,
): string => {
  const data = JSON.stringify(payload);
  const encoded = base64urlEncode(data);

  const signature = crypto
    .createHmac("sha256", DOWNLOAD_SECRET)
    .update(encoded)
    .digest("hex");

  return `${encoded}.${signature}`;
};

// ==========================================
// VERIFY SIGNED TOKEN
// Return payload jika valid, throw jika tidak valid / expired
// ==========================================
export const verifyDownloadToken = (token: string): SignedDownloadPayload => {
  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new Error("Token tidak valid");
  }

  const [encoded, receivedSig] = parts;

  const expectedSig = crypto
    .createHmac("sha256", DOWNLOAD_SECRET)
    .update(encoded)
    .digest("hex");

  // Timing-safe comparison
  if (
    receivedSig.length !== expectedSig.length ||
    !crypto.timingSafeEqual(
      Buffer.from(receivedSig, "hex"),
      Buffer.from(expectedSig, "hex"),
    )
  ) {
    throw new Error("Token tidak valid");
  }

  let payload: SignedDownloadPayload;
  try {
    payload = JSON.parse(base64urlDecode(encoded)) as SignedDownloadPayload;
  } catch {
    throw new Error("Token tidak valid");
  }

  if (Date.now() > payload.expires_at) {
    throw new Error("Link download sudah kadaluarsa");
  }

  return payload;
};

// ==========================================
// GENERATE SIGNED DOWNLOAD URL (full URL)
// Dipanggil dari email.service.ts
// ==========================================
export const generateDownloadUrl = (
  itemId: string,
  orderId: string,
  expiresAt: Date,
): string => {
  const token = generateDownloadToken({
    item_id: itemId,
    order_id: orderId,
    expires_at: expiresAt.getTime(),
  });

  const baseUrl = process.env.BASE_URL ?? "http://localhost:5000";
  return `${baseUrl}/api/orders/download/${token}`;
};
