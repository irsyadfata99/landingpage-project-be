import ExcelJS from "exceljs";
import { OrderFilter } from "../types/order.types";
import { query } from "../config/db";

// ==========================================
// HELPER: format rupiah plain
// ==========================================
const formatRupiah = (amount: number): string =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(amount);

// ==========================================
// EXPORT ORDERS TO EXCEL
// ==========================================
export const exportOrdersToExcel = async (
  filter: OrderFilter,
): Promise<ExcelJS.Buffer> => {
  // Build query dengan filter
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filter.status) {
    conditions.push(`o.status = $${idx++}`);
    params.push(filter.status);
  }
  if (filter.search) {
    conditions.push(
      `(o.order_code ILIKE $${idx} OR o.customer_name ILIKE $${idx} OR o.customer_email ILIKE $${idx})`,
    );
    params.push(`%${filter.search}%`);
    idx++;
  }
  if (filter.start_date) {
    conditions.push(`o.created_at >= $${idx++}`);
    params.push(filter.start_date);
  }
  if (filter.end_date) {
    conditions.push(`o.created_at <= $${idx++}`);
    params.push(filter.end_date);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `SELECT
      o.order_code,
      o.created_at,
      o.customer_name,
      o.customer_email,
      o.customer_phone,
      o.customer_address,
      o.customer_city,
      o.customer_province,
      o.status,
      o.total_amount,
      o.payment_method,
      o.payment_bank,
      o.expedition_name,
      o.tracking_number,
      o.paid_at,
      o.shipped_at,
      o.confirmed_at,
      STRING_AGG(oi.product_name || ' (x' || oi.quantity || ')', ', ') AS products
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     ${where}
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    params,
  );

  // ==========================================
  // BUILD WORKBOOK
  // ==========================================
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Landing Page System";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Orders", {
    pageSetup: { fitToPage: true, orientation: "landscape" },
  });

  // ==========================================
  // HEADER ROW
  // ==========================================
  const headers = [
    { header: "No. Order", key: "order_code", width: 22 },
    { header: "Tanggal Order", key: "created_at", width: 20 },
    { header: "Nama Customer", key: "customer_name", width: 22 },
    { header: "Email", key: "customer_email", width: 28 },
    { header: "No. HP", key: "customer_phone", width: 16 },
    { header: "Alamat", key: "customer_address", width: 30 },
    { header: "Kota", key: "customer_city", width: 16 },
    { header: "Provinsi", key: "customer_province", width: 18 },
    { header: "Produk", key: "products", width: 40 },
    { header: "Total", key: "total_amount", width: 16 },
    { header: "Status", key: "status", width: 14 },
    { header: "Pembayaran", key: "payment_method", width: 14 },
    { header: "Bank", key: "payment_bank", width: 12 },
    { header: "Ekspedisi", key: "expedition_name", width: 14 },
    { header: "No. Resi", key: "tracking_number", width: 20 },
    { header: "Tgl Bayar", key: "paid_at", width: 20 },
    { header: "Tgl Kirim", key: "shipped_at", width: 20 },
    { header: "Tgl Diterima", key: "confirmed_at", width: 20 },
  ];

  sheet.columns = headers;

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF3B82F6" },
    };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  headerRow.height = 30;

  // ==========================================
  // STATUS COLOR MAP
  // ==========================================
  const statusColors: Record<string, string> = {
    PENDING: "FFFBBF24",
    PAID: "FF3B82F6",
    PROCESSING: "FF8B5CF6",
    SHIPPED: "FFF97316",
    DELIVERED: "FF10B981",
    DONE: "FF6B7280",
  };

  // ==========================================
  // DATA ROWS
  // ==========================================
  result.rows.forEach((order, i) => {
    const row = sheet.addRow({
      order_code: order.order_code,
      created_at: order.created_at
        ? new Date(order.created_at).toLocaleString("id-ID")
        : "-",
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      customer_address: order.customer_address ?? "-",
      customer_city: order.customer_city ?? "-",
      customer_province: order.customer_province ?? "-",
      products: order.products ?? "-",
      total_amount: `Rp ${formatRupiah(order.total_amount)}`,
      status: order.status,
      payment_method: order.payment_method ?? "-",
      payment_bank: order.payment_bank ?? "-",
      expedition_name: order.expedition_name ?? "-",
      tracking_number: order.tracking_number ?? "-",
      paid_at: order.paid_at
        ? new Date(order.paid_at).toLocaleString("id-ID")
        : "-",
      shipped_at: order.shipped_at
        ? new Date(order.shipped_at).toLocaleString("id-ID")
        : "-",
      confirmed_at: order.confirmed_at
        ? new Date(order.confirmed_at).toLocaleString("id-ID")
        : "-",
    });

    // Alternating row color
    const bgColor = i % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";

    row.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: bgColor },
      };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });

    // Warnai kolom status
    const statusCell = row.getCell("status");
    const statusColor = statusColors[order.status] ?? "FF6B7280";
    statusCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: statusColor },
    };
    statusCell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    statusCell.alignment = { horizontal: "center", vertical: "middle" };

    row.height = 20;
  });

  // ==========================================
  // SUMMARY ROW
  // ==========================================
  const totalAll = result.rows.reduce(
    (sum, o) => sum + Number(o.total_amount),
    0,
  );
  const summaryRow = sheet.addRow({
    order_code: `Total: ${result.rows.length} order`,
    total_amount: `Rp ${formatRupiah(totalAll)}`,
  });
  summaryRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFF6FF" },
    };
  });

  // Freeze header row
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  return workbook.xlsx.writeBuffer();
};
