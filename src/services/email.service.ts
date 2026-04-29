import nodemailer, { Transporter } from "nodemailer";
import { OrderWithItems } from "../types/order.types";

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
// HELPER: base HTML wrapper
// ==========================================
const baseTemplate = (content: string, brandName: string): string => `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${brandName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- HEADER -->
        <tr>
          <td style="background:#3B82F6;padding:24px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;">${brandName}</h1>
          </td>
        </tr>
        <!-- CONTENT -->
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>
        <!-- FOOTER -->
        <tr>
          <td style="background:#f8f8f8;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
            <p style="margin:0;color:#999;font-size:12px;">
              Email ini dikirim otomatis. Jangan balas email ini.<br/>
              © ${new Date().getFullYear()} ${brandName}. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ==========================================
// HELPER: tabel items order
// ==========================================
const itemsTable = (items: OrderWithItems["items"]): string => `
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
  </table>`;

// ==========================================
// EMAIL 1: Payment Sukses — Nota + Order ID + Link Tracking
// ==========================================
export const sendPaymentSuccessEmail = async (
  order: OrderWithItems,
): Promise<void> => {
  const transporter = createTransporter();
  const brandName = process.env.EMAIL_FROM_NAME || "Toko Anda";
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const trackingUrl = `${frontendUrl}/tracking/${order.order_code}`;

  const hasDigital = order.items.some(
    (i) => i.product_type === "DIGITAL" || i.product_type === "BOTH",
  );

  const digitalSection = hasDigital
    ? `
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-weight:bold;color:#166534;">📥 Link Download Produk Digital</p>
      ${order.items
        .filter(
          (i) =>
            (i.product_type === "DIGITAL" || i.product_type === "BOTH") &&
            i.download_url,
        )
        .map(
          (i) => `
          <p style="margin:4px 0;font-size:13px;">
            <strong>${i.product_name}:</strong><br/>
            <a href="${i.download_url}" style="color:#3B82F6;">${i.download_url}</a><br/>
            <small style="color:#666;">Link aktif hingga: ${i.download_expires_at ? new Date(i.download_expires_at).toLocaleString("id-ID") : "-"}</small>
          </p>`,
        )
        .join("")}
    </div>`
    : "";

  const content = `
    <h2 style="color:#166534;margin:0 0 8px;">✅ Pembayaran Berhasil!</h2>
    <p style="color:#555;margin:0 0 24px;">Terima kasih, <strong>${order.customer_name}</strong>. Pesanan Anda telah kami terima.</p>

    <div style="background:#f8f8f8;border-radius:6px;padding:16px;margin-bottom:16px;">
      <table width="100%" cellpadding="4" cellspacing="0">
        <tr><td style="color:#666;font-size:13px;">No. Order</td><td style="font-weight:bold;font-size:13px;">${order.order_code}</td></tr>
        <tr><td style="color:#666;font-size:13px;">Tanggal</td><td style="font-size:13px;">${new Date(order.created_at).toLocaleString("id-ID")}</td></tr>
        <tr><td style="color:#666;font-size:13px;">Status</td><td style="font-size:13px;color:#3B82F6;font-weight:bold;">LUNAS</td></tr>
        ${order.expedition_name ? `<tr><td style="color:#666;font-size:13px;">Ekspedisi</td><td style="font-size:13px;">${order.expedition_name}</td></tr>` : ""}
      </table>
    </div>

    <h3 style="font-size:14px;margin:16px 0 8px;">Detail Pesanan</h3>
    ${itemsTable(order.items)}

    <div style="text-align:right;padding:8px 0;border-top:2px solid #eee;">
      <strong style="font-size:15px;">Total: ${formatRupiah(order.total_amount)}</strong>
    </div>

    ${digitalSection}

    <div style="margin-top:24px;text-align:center;">
      <a href="${trackingUrl}"
         style="background:#3B82F6;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">
        Lacak Pesanan
      </a>
    </div>
    <p style="color:#999;font-size:12px;margin-top:12px;text-align:center;">
      Simpan kode order Anda: <strong>${order.order_code}</strong>
    </p>`;

  await transporter.sendMail({
    from: FROM,
    to: order.customer_email,
    subject: `✅ Pembayaran Berhasil - ${order.order_code}`,
    html: baseTemplate(content, brandName),
  });

  console.log(
    `📧 Email pembayaran berhasil dikirim ke ${order.customer_email}`,
  );
};

// ==========================================
// EMAIL 2: Barang Dikirim — Info Ekspedisi + Nomor Resi
// ==========================================
export const sendShippingEmail = async (
  order: OrderWithItems,
): Promise<void> => {
  const transporter = createTransporter();
  const brandName = process.env.EMAIL_FROM_NAME || "Toko Anda";
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const trackingUrl = `${frontendUrl}/tracking/${order.order_code}`;
  const confirmUrl = `${frontendUrl}/confirm/${order.order_code}`;

  const content = `
    <h2 style="color:#1d4ed8;margin:0 0 8px;">🚚 Pesanan Sedang Dikirim!</h2>
    <p style="color:#555;margin:0 0 24px;">Halo <strong>${order.customer_name}</strong>, pesanan Anda sedang dalam perjalanan.</p>

    <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:6px;padding:16px;margin-bottom:16px;">
      <table width="100%" cellpadding="4" cellspacing="0">
        <tr><td style="color:#666;font-size:13px;">No. Order</td><td style="font-weight:bold;font-size:13px;">${order.order_code}</td></tr>
        <tr><td style="color:#666;font-size:13px;">Ekspedisi</td><td style="font-weight:bold;font-size:13px;">${order.expedition_name ?? "-"}</td></tr>
        <tr><td style="color:#666;font-size:13px;">No. Resi</td><td style="font-weight:bold;font-size:15px;color:#1d4ed8;">${order.tracking_number ?? "-"}</td></tr>
        <tr><td style="color:#666;font-size:13px;">Dikirim</td><td style="font-size:13px;">${order.shipped_at ? new Date(order.shipped_at).toLocaleString("id-ID") : "-"}</td></tr>
      </table>
    </div>

    <h3 style="font-size:14px;margin:16px 0 8px;">Alamat Pengiriman</h3>
    <div style="background:#f8f8f8;border-radius:6px;padding:12px;font-size:13px;color:#555;">
      ${order.customer_name}<br/>
      ${order.customer_address ?? ""}, ${order.customer_city ?? ""}<br/>
      ${order.customer_province ?? ""} ${order.customer_postal_code ?? ""}<br/>
      ${order.customer_phone}
    </div>

    <div style="margin-top:24px;text-align:center;">
      <a href="${trackingUrl}"
         style="background:#3B82F6;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;margin-right:8px;">
        Lacak Pesanan
      </a>
      <a href="${confirmUrl}"
         style="background:#10B981;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">
        Konfirmasi Diterima
      </a>
    </div>
    <p style="color:#999;font-size:12px;margin-top:12px;text-align:center;">
      Klik tombol "Konfirmasi Diterima" setelah barang sampai di tangan Anda.
    </p>`;

  await transporter.sendMail({
    from: FROM,
    to: order.customer_email,
    subject: `🚚 Pesanan Dikirim - ${order.order_code} (Resi: ${order.tracking_number})`,
    html: baseTemplate(content, brandName),
  });

  console.log(`📧 Email pengiriman dikirim ke ${order.customer_email}`);
};

// ==========================================
// EMAIL 3: Pesanan Diterima — Konfirmasi Customer
// ==========================================
export const sendDeliveryConfirmEmail = async (
  order: OrderWithItems,
): Promise<void> => {
  const transporter = createTransporter();
  const brandName = process.env.EMAIL_FROM_NAME || "Toko Anda";

  const content = `
    <h2 style="color:#166534;margin:0 0 8px;">🎉 Pesanan Telah Diterima!</h2>
    <p style="color:#555;margin:0 0 24px;">
      Terima kasih <strong>${order.customer_name}</strong> telah berbelanja di ${brandName}.
      Senang bisa melayani Anda!
    </p>

    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:16px;margin-bottom:16px;">
      <table width="100%" cellpadding="4" cellspacing="0">
        <tr><td style="color:#666;font-size:13px;">No. Order</td><td style="font-weight:bold;font-size:13px;">${order.order_code}</td></tr>
        <tr><td style="color:#666;font-size:13px;">Status</td><td style="font-size:13px;color:#166534;font-weight:bold;">SELESAI ✓</td></tr>
        <tr><td style="color:#666;font-size:13px;">Dikonfirmasi</td><td style="font-size:13px;">${order.confirmed_at ? new Date(order.confirmed_at).toLocaleString("id-ID") : "-"}</td></tr>
      </table>
    </div>

    <p style="color:#555;font-size:14px;">
      Jika Anda puas dengan produk kami, ceritakan pengalaman Anda kepada orang-orang terdekat. 
      Kami sangat menghargai kepercayaan Anda! 😊
    </p>`;

  await transporter.sendMail({
    from: FROM,
    to: order.customer_email,
    subject: `🎉 Pesanan Selesai - ${order.order_code}`,
    html: baseTemplate(content, brandName),
  });

  console.log(
    `📧 Email konfirmasi diterima dikirim ke ${order.customer_email}`,
  );
};
