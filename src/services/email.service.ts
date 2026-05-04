import nodemailer, { Transporter } from "nodemailer";
import { query } from "../config/db";
import { OrderWithItems } from "../types/order.types";
import {
  EmailTemplateType,
  PaymentSuccessTemplateData,
  DeliveryConfirmTemplateData,
} from "../types/email-template.types";
import { generateDownloadUrl } from "./download.service";

// ==========================================
// TRANSPORTER
// ==========================================
const createTransporter = (): Transporter => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const FROM = `"${process.env.EMAIL_FROM_NAME || "Toko Anda"}" <${process.env.EMAIL_USER}>`;

// ==========================================
// HELPER: format rupiah
// ==========================================
const formatRupiah = (amount: number): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

// ==========================================
// HELPER: format tanggal Indonesia
// ==========================================
const formatDate = (date: Date | string | null): string => {
  if (!date) return "-";
  return new Date(date).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ==========================================
// HELPER: ambil template dari DB
// ==========================================
const getTemplate = async (
  type: EmailTemplateType,
): Promise<{ subject: string; body_html: string } | null> => {
  const result = await query(
    "SELECT subject, body_html, is_active FROM email_templates WHERE type = $1",
    [type],
  );

  if (result.rowCount === 0 || !result.rows[0].is_active) {
    console.warn(
      `⚠️  Template email "${type}" tidak ditemukan atau tidak aktif`,
    );
    return null;
  }

  return {
    subject: result.rows[0].subject,
    body_html: result.rows[0].body_html,
  };
};

// ==========================================
// HELPER: render template — replace variabel {{...}}
// ==========================================
const renderTemplate = (
  template: string,
  data: Record<string, string>,
): string => {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_match: string, key: string): string => {
      return String(data[key] ?? "");
    },
  );
};

// ==========================================
// HELPER: render tabel items sebagai HTML
// ==========================================
const renderItemsTable = (items: OrderWithItems["items"]): string => `
  <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
    <thead>
      <tr style="background:#f0f0f0;">
        <th style="text-align:left;border:1px solid #ddd;font-size:13px;">Produk</th>
        <th style="text-align:center;border:1px solid #ddd;font-size:13px;">Qty</th>
        <th style="text-align:right;border:1px solid #ddd;font-size:13px;">Harga</th>
        <th style="text-align:right;border:1px solid #ddd;font-size:13px;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map(
          (item) => `
        <tr>
          <td style="border:1px solid #ddd;font-size:13px;">${item.product_name}</td>
          <td style="border:1px solid #ddd;text-align:center;font-size:13px;">${item.quantity}</td>
          <td style="border:1px solid #ddd;text-align:right;font-size:13px;">${formatRupiah(item.price)}</td>
          <td style="border:1px solid #ddd;text-align:right;font-size:13px;">${formatRupiah(item.subtotal)}</td>
        </tr>`,
        )
        .join("")}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="border:1px solid #ddd;text-align:right;font-weight:bold;font-size:13px;">Total</td>
        <td style="border:1px solid #ddd;text-align:right;font-weight:bold;font-size:14px;">
          ${formatRupiah(items.reduce((sum, i) => sum + i.subtotal, 0))}
        </td>
      </tr>
    </tfoot>
  </table>`;

// ==========================================
// HELPER: render download links produk digital
// Menggunakan signed URL — bukan raw download_url
// ==========================================
const renderDownloadLinks = (
  items: OrderWithItems["items"],
  orderId: string,
): string => {
  const digitalItems = items.filter(
    (i) =>
      (i.product_type === "DIGITAL" || i.product_type === "BOTH") &&
      i.download_url &&
      i.download_expires_at,
  );

  if (!digitalItems.length) return "";

  return `
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-weight:bold;color:#166534;">📥 Link Download Produk Digital</p>
      ${digitalItems
        .map((i) => {
          const expiresAt = new Date(i.download_expires_at!);
          // Generate signed URL — token berlaku sampai download_expires_at
          const signedUrl = generateDownloadUrl(i.id, orderId, expiresAt);
          return `
            <p style="margin:4px 0;font-size:13px;">
              <strong>${i.product_name}:</strong><br/>
              <a href="${signedUrl}" style="color:#3B82F6;">${signedUrl}</a><br/>
              <small style="color:#666;">Link aktif hingga: ${formatDate(i.download_expires_at)}</small>
            </p>`;
        })
        .join("")}
    </div>`;
};

// ==========================================
// HELPER: render alamat pengiriman
// ==========================================
const renderShippingAddress = (order: OrderWithItems): string =>
  [
    order.customer_name,
    order.customer_address,
    order.customer_city,
    order.customer_province,
    order.customer_postal_code,
    order.customer_phone,
  ]
    .filter(Boolean)
    .join(", ");

// ==========================================
// EMAIL 1: Payment Sukses
// Signed URL di-generate di sini, saat email dikirim
// ==========================================
export const sendPaymentSuccessEmail = async (
  order: OrderWithItems,
): Promise<void> => {
  const template = await getTemplate("payment_success");
  if (!template) return;

  const data: PaymentSuccessTemplateData = {
    customer_name: order.customer_name,
    order_code: order.order_code,
    total_amount: formatRupiah(order.total_amount),
    payment_method:
      order.payment_method === "bank_transfer"
        ? `Transfer Bank (${order.payment_bank?.toUpperCase() ?? "-"})`
        : "QRIS",
    items: renderItemsTable(order.items),
    // Signed URL di-generate di sini dengan order.id
    download_links: renderDownloadLinks(order.items, order.id),
  };

  const subject = renderTemplate(
    template.subject,
    data as unknown as Record<string, string>,
  );
  const bodyHtml = renderTemplate(
    template.body_html,
    data as unknown as Record<string, string>,
  );

  const transporter = createTransporter();
  await transporter.sendMail({
    from: FROM,
    to: order.customer_email,
    subject,
    html: bodyHtml,
  });

  console.log(`📧 Email payment success dikirim ke ${order.customer_email}`);
};

// ==========================================
// EMAIL 2: Barang Dikirim
// ==========================================
export const sendShippingEmail = async (
  order: OrderWithItems,
): Promise<void> => {
  const template = await getTemplate("shipping");
  if (!template) return;

  const confirmUrl = `${process.env.FRONTEND_URL}/orders/${order.order_code}/confirm`;

  const data: Record<string, string> = {
    customer_name: order.customer_name,
    order_code: order.order_code,
    expedition_name: order.expedition_name ?? "-",
    tracking_number: order.tracking_number ?? "-",
    shipping_address: renderShippingAddress(order),
    confirm_url: confirmUrl,
  };

  const subject = renderTemplate(template.subject, data);
  const bodyHtml = renderTemplate(template.body_html, data);

  const transporter = createTransporter();
  await transporter.sendMail({
    from: FROM,
    to: order.customer_email,
    subject,
    html: bodyHtml,
  });

  console.log(`📧 Email shipping dikirim ke ${order.customer_email}`);
  console.log(`🔗 Confirm URL: ${confirmUrl}`);
};

// ==========================================
// EMAIL 3: Notifikasi REFUND ke Admin
// Dikirim ke EMAIL_USER saat Tripay webhook REFUND diterima
// ==========================================
export const sendRefundNotificationEmail = async (
  order: Pick<
    OrderWithItems,
    | "order_code"
    | "customer_name"
    | "customer_email"
    | "total_amount"
    | "payment_method"
    | "payment_bank"
    | "tripay_order_id"
  >,
  tripayReference: string,
): Promise<void> => {
  const adminEmail = process.env.EMAIL_USER;
  if (!adminEmail) {
    console.warn(
      "⚠️  EMAIL_USER tidak dikonfigurasi, notifikasi refund tidak dikirim",
    );
    return;
  }

  const transporter = createTransporter();

  const paymentMethod =
    order.payment_method === "bank_transfer"
      ? `Transfer Bank (${order.payment_bank?.toUpperCase() ?? "-"})`
      : "QRIS";

  await transporter.sendMail({
    from: FROM,
    to: adminEmail,
    subject: `⚠️ REFUND Diterima - ${order.order_code}`,
    html: `
      <!DOCTYPE html>
      <html lang="id">
      <head><meta charset="UTF-8"/></head>
      <body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:30px 0;">
        <table width="600" align="center" style="background:#fff;border-radius:8px;overflow:hidden;">
          <tr><td style="background:#EF4444;padding:24px 32px;">
            <h1 style="color:#fff;margin:0;">⚠️ Notifikasi Refund</h1>
          </td></tr>
          <tr><td style="padding:32px;">
            <p style="color:#555;">Tripay telah mengirimkan notifikasi <strong>REFUND</strong> untuk order berikut:</p>
            <table width="100%" cellpadding="8" style="background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;">
              <tr>
                <td style="color:#666;font-size:13px;width:40%;">No. Order</td>
                <td style="font-weight:bold;">${order.order_code}</td>
              </tr>
              <tr>
                <td style="color:#666;font-size:13px;">Customer</td>
                <td>${order.customer_name} (${order.customer_email})</td>
              </tr>
              <tr>
                <td style="color:#666;font-size:13px;">Total</td>
                <td style="font-weight:bold;">${formatRupiah(order.total_amount)}</td>
              </tr>
              <tr>
                <td style="color:#666;font-size:13px;">Metode Bayar</td>
                <td>${paymentMethod}</td>
              </tr>
              <tr>
                <td style="color:#666;font-size:13px;">Tripay Reference</td>
                <td style="font-family:monospace;">${tripayReference}</td>
              </tr>
              <tr>
                <td style="color:#666;font-size:13px;">Waktu</td>
                <td>${formatDate(new Date())}</td>
              </tr>
            </table>
            <p style="color:#991b1b;font-size:13px;margin-top:16px;">
              ⚠️ Harap segera periksa dashboard Tripay dan lakukan tindakan yang diperlukan.
            </p>
          </td></tr>
          <tr><td style="background:#f8f8f8;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
            <p style="color:#999;font-size:12px;margin:0;">Email ini dikirim otomatis. Jangan balas email ini.</p>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  });

  console.log(`📧 Email notifikasi refund dikirim ke admin (${adminEmail})`);
};

// ==========================================
// EMAIL 4: Pesanan Diterima (customer konfirmasi)
// ==========================================
export const sendDeliveryConfirmEmail = async (
  order: OrderWithItems,
): Promise<void> => {
  const template = await getTemplate("delivery_confirm");
  if (!template) return;

  const data: DeliveryConfirmTemplateData = {
    customer_name: order.customer_name,
    order_code: order.order_code,
    confirmed_at: formatDate(order.confirmed_at),
  };

  const subject = renderTemplate(
    template.subject,
    data as unknown as Record<string, string>,
  );
  const bodyHtml = renderTemplate(
    template.body_html,
    data as unknown as Record<string, string>,
  );

  const transporter = createTransporter();
  await transporter.sendMail({
    from: FROM,
    to: order.customer_email,
    subject,
    html: bodyHtml,
  });

  console.log(`📧 Email delivery confirm dikirim ke ${order.customer_email}`);
};
