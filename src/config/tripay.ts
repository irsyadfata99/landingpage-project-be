import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// ==========================================
// TRIPAY CONFIG
// ==========================================
export const TRIPAY_API_KEY = process.env.TRIPAY_API_KEY ?? "";
export const TRIPAY_PRIVATE_KEY = process.env.TRIPAY_PRIVATE_KEY ?? "";
export const TRIPAY_MERCHANT_CODE = process.env.TRIPAY_MERCHANT_CODE ?? "";
export const TRIPAY_IS_PRODUCTION = process.env.TRIPAY_IS_PRODUCTION === "true";

export const TRIPAY_BASE_URL = TRIPAY_IS_PRODUCTION
  ? "https://tripay.co.id/api"
  : "https://tripay.co.id/api-sandbox";

// ==========================================
// CHANNEL CODES
// VA dan QRIS yang didukung
// ==========================================
export const TRIPAY_CHANNELS = {
  bca: "BCAVA",
  bni: "BNIVA",
  bri: "BRIVA",
  mandiri: "MANDIRIVA",
  qris: "QRIS",
} as const;

export type TripayChannelCode =
  (typeof TRIPAY_CHANNELS)[keyof typeof TRIPAY_CHANNELS];

export type SupportedBank = "bca" | "bni" | "bri" | "mandiri";
export type SupportedPaymentMethod = "bank_transfer" | "qris";

// ==========================================
// HELPER: generate signature untuk create transaction
// HMAC-SHA256(merchant_code + merchant_ref + amount)
// ==========================================
export const generateSignature = (
  merchantRef: string,
  amount: number,
): string => {
  return crypto
    .createHmac("sha256", TRIPAY_PRIVATE_KEY)
    .update(TRIPAY_MERCHANT_CODE + merchantRef + amount)
    .digest("hex");
};

// ==========================================
// HELPER: verify webhook signature
// ==========================================
export const verifyWebhookSignature = (
  rawBody: string,
  receivedSignature: string,
): boolean => {
  const expectedSignature = crypto
    .createHmac("sha256", TRIPAY_PRIVATE_KEY)
    .update(rawBody)
    .digest("hex");
  return expectedSignature === receivedSignature;
};

// ==========================================
// Validasi env saat startup
// ==========================================
export const validateTripayConfig = (): void => {
  const required = [
    "TRIPAY_API_KEY",
    "TRIPAY_PRIVATE_KEY",
    "TRIPAY_MERCHANT_CODE",
  ];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`⚠️  Tripay config missing: ${missing.join(", ")}`);
  } else {
    console.log(
      `✅ Tripay initialized (${TRIPAY_IS_PRODUCTION ? "PRODUCTION" : "SANDBOX"})`,
    );
  }
};
