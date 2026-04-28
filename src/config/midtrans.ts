import midtransClient from "midtrans-client";
import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

// Core API — untuk membuat transaksi VA dan QRIS
export const coreApi = new midtransClient.CoreApi({
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY ?? "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY ?? "",
});

// Snap — opsional, jika suatu saat ingin pakai Snap popup
export const snap = new midtransClient.Snap({
  isProduction,
  serverKey: process.env.MIDTRANS_SERVER_KEY ?? "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY ?? "",
});

// Konstanta payment method yang didukung
export const SUPPORTED_PAYMENT_METHODS = ["bank_transfer", "gopay"] as const;

export type SupportedPaymentMethod = (typeof SUPPORTED_PAYMENT_METHODS)[number];

// Daftar bank VA yang didukung
export const SUPPORTED_BANKS = [
  "bca",
  "bni",
  "bri",
  "mandiri",
  "permata",
] as const;

export type SupportedBank = (typeof SUPPORTED_BANKS)[number];

// Validasi env saat startup
const validateMidtransConfig = (): void => {
  const required = ["MIDTRANS_SERVER_KEY", "MIDTRANS_CLIENT_KEY"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`⚠️  Midtrans config missing: ${missing.join(", ")}`);
  } else {
    console.log(
      `✅ Midtrans initialized (${isProduction ? "PRODUCTION" : "SANDBOX"})`,
    );
  }
};

validateMidtransConfig();
