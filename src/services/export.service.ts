import ExcelJS from "exceljs";
import { OrderFilter } from "../types/order.types";
import { query } from "../config/db";

// ==========================================
// HELPER: format rupiah plain
// ==========================================
const formatRupiah = (amount: number): string =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(amount);

// ==========================================
// HELPER: style header row
// ==========================================
const styleHeaderRow = (
  row: ExcelJS.Row,
  bgColor: string = "FF3B82F6",
): void => {
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: bgColor },
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
  row.height = 30;
};

// ==========================================
// HELPER: style data row
// ==========================================
const styleDataRow = (row: ExcelJS.Row, index: number): void => {
  const bgColor = index % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
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
  row.height = 20;
};

// ==========================================
// EXPORT ORDERS TO EXCEL
// Sheet 1: Orders
// Sheet 2: Pendapatan per Bulan
// Sheet 3: Inventory Produk
// ==========================================
export const exportOrdersToExcel = async (
  filter: OrderFilter,
): Promise<ExcelJS.Buffer> => {
  // ==========================================
  // BUILD QUERY ORDERS dengan filter
  // ==========================================
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

  const ordersResult = await query(
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
      o.discount_amount,
      o.voucher_code,
      o.payment_method,
      o.payment_bank,
      o.expedition_name,
      o.tracking_number,
      o.paid_at,
      o.shipped_at,
      o.delivered_at,
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
  // QUERY PENDAPATAN PER BULAN
  // Menggunakan total_amount (sudah setelah diskon)
  // dan menyertakan total_discount untuk referensi
  // ==========================================
  const revenueResult = await query(
    `SELECT
      TO_CHAR(DATE_TRUNC('month', paid_at), 'YYYY-MM') AS bulan,
      TO_CHAR(DATE_TRUNC('month', paid_at), 'Month YYYY') AS bulan_label,
      COUNT(*) AS jumlah_order,
      SUM(total_amount) AS total_pendapatan,
      SUM(discount_amount) AS total_diskon,
      COUNT(CASE WHEN status = 'DONE' THEN 1 END) AS order_selesai,
      COUNT(CASE WHEN status IN ('PAID','PROCESSING','SHIPPED','DELIVERED') THEN 1 END) AS order_proses
     FROM orders
     WHERE status IN ('PAID','PROCESSING','SHIPPED','DELIVERED','DONE')
       AND paid_at IS NOT NULL
     GROUP BY DATE_TRUNC('month', paid_at)
     ORDER BY DATE_TRUNC('month', paid_at) ASC`,
  );

  // ==========================================
  // QUERY INVENTORY PRODUK
  // ==========================================
  const inventoryResult = await query(
    `SELECT
      p.name,
      p.product_type,
      p.price,
      p.original_price,
      p.stock,
      p.is_active,
      COALESCE(SUM(oi.quantity), 0) AS total_terjual,
      COALESCE(SUM(oi.subtotal), 0) AS total_pendapatan
     FROM products p
     LEFT JOIN order_items oi ON oi.product_id = p.id
       AND oi.order_id IN (
         SELECT id FROM orders
         WHERE status IN ('PAID','PROCESSING','SHIPPED','DELIVERED','DONE')
       )
     GROUP BY p.id
     ORDER BY total_terjual DESC`,
  );

  // ==========================================
  // BUILD WORKBOOK
  // ==========================================
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Landing Page System";
  workbook.created = new Date();

  // ==========================================
  // SHEET 1: ORDERS
  // ==========================================
  const orderSheet = workbook.addWorksheet("Orders", {
    pageSetup: { fitToPage: true, orientation: "landscape" },
  });

  const statusColors: Record<string, string> = {
    PENDING: "FFFBBF24",
    PAID: "FF3B82F6",
    PROCESSING: "FF8B5CF6",
    SHIPPED: "FFF97316",
    DELIVERED: "FF10B981",
    DONE: "FF6B7280",
    EXPIRED: "FFD1D5DB",
    REFUNDED: "FFEF4444",
  };

  orderSheet.columns = [
    { header: "No. Order", key: "order_code", width: 22 },
    { header: "Tanggal Order", key: "created_at", width: 20 },
    { header: "Nama Customer", key: "customer_name", width: 22 },
    { header: "Email", key: "customer_email", width: 28 },
    { header: "No. HP", key: "customer_phone", width: 16 },
    { header: "Alamat", key: "customer_address", width: 30 },
    { header: "Kota", key: "customer_city", width: 16 },
    { header: "Provinsi", key: "customer_province", width: 18 },
    { header: "Produk", key: "products", width: 40 },
    { header: "Subtotal Produk", key: "subtotal_produk", width: 18 },
    { header: "Diskon", key: "discount_amount", width: 14 },
    { header: "Kode Voucher", key: "voucher_code", width: 16 },
    { header: "Total Dibayar", key: "total_amount", width: 18 },
    { header: "Status", key: "status", width: 14 },
    { header: "Pembayaran", key: "payment_method", width: 14 },
    { header: "Bank", key: "payment_bank", width: 12 },
    { header: "Ekspedisi", key: "expedition_name", width: 14 },
    { header: "No. Resi", key: "tracking_number", width: 20 },
    { header: "Tgl Bayar", key: "paid_at", width: 20 },
    { header: "Tgl Kirim", key: "shipped_at", width: 20 },
    { header: "Tgl Sampai", key: "delivered_at", width: 20 },
    { header: "Tgl Diterima Customer", key: "confirmed_at", width: 22 },
  ];

  styleHeaderRow(orderSheet.getRow(1));

  ordersResult.rows.forEach((order, i) => {
    const subtotalProduk =
      Number(order.total_amount) + Number(order.discount_amount);

    const row = orderSheet.addRow({
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
      subtotal_produk: `Rp ${formatRupiah(subtotalProduk)}`,
      discount_amount:
        Number(order.discount_amount) > 0
          ? `-Rp ${formatRupiah(Number(order.discount_amount))}`
          : "-",
      voucher_code: order.voucher_code ?? "-",
      total_amount: `Rp ${formatRupiah(Number(order.total_amount))}`,
      status: order.status,
      payment_method: order.payment_method ?? "-",
      payment_bank: order.payment_bank?.toUpperCase() ?? "-",
      expedition_name: order.expedition_name ?? "-",
      tracking_number: order.tracking_number ?? "-",
      paid_at: order.paid_at
        ? new Date(order.paid_at).toLocaleString("id-ID")
        : "-",
      shipped_at: order.shipped_at
        ? new Date(order.shipped_at).toLocaleString("id-ID")
        : "-",
      delivered_at: order.delivered_at
        ? new Date(order.delivered_at).toLocaleString("id-ID")
        : "-",
      confirmed_at: order.confirmed_at
        ? new Date(order.confirmed_at).toLocaleString("id-ID")
        : "-",
    });

    styleDataRow(row, i);

    // Warnai kolom status
    const statusCell = row.getCell("status");
    statusCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: statusColors[order.status] ?? "FF6B7280" },
    };
    statusCell.font = {
      bold: true,
      color: {
        argb: ["EXPIRED", "REFUNDED"].includes(order.status)
          ? "FF000000"
          : "FFFFFFFF",
      },
      size: 10,
    };
    statusCell.alignment = { horizontal: "center", vertical: "middle" };

    // Warnai kolom diskon jika ada
    if (Number(order.discount_amount) > 0) {
      const discountCell = row.getCell("discount_amount");
      discountCell.font = { color: { argb: "FFEF4444" }, bold: true };
    }
  });

  // Summary row orders
  const totalRevenue = ordersResult.rows.reduce(
    (sum, o) => sum + Number(o.total_amount),
    0,
  );
  const totalDiskon = ordersResult.rows.reduce(
    (sum, o) => sum + Number(o.discount_amount),
    0,
  );
  const summaryOrderRow = orderSheet.addRow({
    order_code: `Total: ${ordersResult.rows.length} order`,
    discount_amount: totalDiskon > 0 ? `-Rp ${formatRupiah(totalDiskon)}` : "-",
    total_amount: `Rp ${formatRupiah(totalRevenue)}`,
  });
  summaryOrderRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFF6FF" },
    };
  });

  orderSheet.views = [{ state: "frozen", ySplit: 1 }];

  // ==========================================
  // SHEET 2: PENDAPATAN PER BULAN
  // total_pendapatan = total_amount (sudah setelah diskon)
  // total_diskon     = akumulasi diskon voucher di bulan itu
  // ==========================================
  const revenueSheet = workbook.addWorksheet("Pendapatan per Bulan");

  revenueSheet.columns = [
    { header: "Bulan", key: "bulan_label", width: 20 },
    { header: "Jumlah Order", key: "jumlah_order", width: 16 },
    { header: "Order Selesai", key: "order_selesai", width: 16 },
    { header: "Order Proses", key: "order_proses", width: 16 },
    { header: "Total Diskon", key: "total_diskon", width: 18 },
    { header: "Total Pendapatan", key: "total_pendapatan", width: 22 },
  ];

  styleHeaderRow(revenueSheet.getRow(1), "FF10B981");

  revenueResult.rows.forEach((row, i) => {
    const dataRow = revenueSheet.addRow({
      bulan_label: row.bulan_label?.trim() ?? "-",
      jumlah_order: Number(row.jumlah_order),
      order_selesai: Number(row.order_selesai),
      order_proses: Number(row.order_proses),
      total_diskon:
        Number(row.total_diskon) > 0
          ? `-Rp ${formatRupiah(Number(row.total_diskon))}`
          : "-",
      total_pendapatan: `Rp ${formatRupiah(Number(row.total_pendapatan))}`,
    });
    styleDataRow(dataRow, i);

    // Warnai kolom total pendapatan
    const pendapatanCell = dataRow.getCell("total_pendapatan");
    pendapatanCell.font = { bold: true, color: { argb: "FF166534" } };

    // Warnai kolom total diskon jika ada
    if (Number(row.total_diskon) > 0) {
      const diskonCell = dataRow.getCell("total_diskon");
      diskonCell.font = { color: { argb: "FFEF4444" } };
    }
  });

  // Summary row revenue
  const totalRevenueAll = revenueResult.rows.reduce(
    (sum, r) => sum + Number(r.total_pendapatan),
    0,
  );
  const totalDiskonAll = revenueResult.rows.reduce(
    (sum, r) => sum + Number(r.total_diskon),
    0,
  );
  const totalOrdersAll = revenueResult.rows.reduce(
    (sum, r) => sum + Number(r.jumlah_order),
    0,
  );
  const summaryRevenueRow = revenueSheet.addRow({
    bulan_label: "TOTAL",
    jumlah_order: totalOrdersAll,
    total_diskon:
      totalDiskonAll > 0 ? `-Rp ${formatRupiah(totalDiskonAll)}` : "-",
    total_pendapatan: `Rp ${formatRupiah(totalRevenueAll)}`,
  });
  summaryRevenueRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF10B981" },
    };
  });

  revenueSheet.views = [{ state: "frozen", ySplit: 1 }];

  // ==========================================
  // SHEET 3: INVENTORY PRODUK
  // ==========================================
  const inventorySheet = workbook.addWorksheet("Inventory Produk");

  inventorySheet.columns = [
    { header: "Nama Produk", key: "name", width: 30 },
    { header: "Tipe", key: "product_type", width: 12 },
    { header: "Harga", key: "price", width: 18 },
    { header: "Harga Coret", key: "original_price", width: 18 },
    { header: "Stok", key: "stock", width: 12 },
    { header: "Status", key: "is_active", width: 12 },
    { header: "Total Terjual", key: "total_terjual", width: 14 },
    { header: "Total Pendapatan", key: "total_pendapatan", width: 22 },
  ];

  styleHeaderRow(inventorySheet.getRow(1), "FF8B5CF6");

  inventoryResult.rows.forEach((product, i) => {
    const dataRow = inventorySheet.addRow({
      name: product.name,
      product_type: product.product_type,
      price: `Rp ${formatRupiah(Number(product.price))}`,
      original_price: product.original_price
        ? `Rp ${formatRupiah(Number(product.original_price))}`
        : "-",
      stock: product.stock === null ? "Unlimited" : Number(product.stock),
      is_active: product.is_active ? "Aktif" : "Nonaktif",
      total_terjual: Number(product.total_terjual),
      total_pendapatan: `Rp ${formatRupiah(Number(product.total_pendapatan))}`,
    });

    styleDataRow(dataRow, i);

    // Warnai status aktif/nonaktif
    const statusCell = dataRow.getCell("is_active");
    statusCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: product.is_active ? "FFD1FAE5" : "FFFEE2E2" },
    };
    statusCell.font = {
      bold: true,
      color: { argb: product.is_active ? "FF166534" : "FF991B1B" },
    };
    statusCell.alignment = { horizontal: "center", vertical: "middle" };

    // Warnai tipe produk
    const tipeCell = dataRow.getCell("product_type");
    const tipeColors: Record<string, string> = {
      PHYSICAL: "FFDBEAFE",
      DIGITAL: "FFEDE9FE",
      BOTH: "FFFEF3C7",
    };
    tipeCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: tipeColors[product.product_type] ?? "FFFFFFFF" },
    };
    tipeCell.alignment = { horizontal: "center", vertical: "middle" };
  });

  // Summary row inventory
  const totalTerjual = inventoryResult.rows.reduce(
    (sum, p) => sum + Number(p.total_terjual),
    0,
  );
  const totalPendapatanInventory = inventoryResult.rows.reduce(
    (sum, p) => sum + Number(p.total_pendapatan),
    0,
  );
  const summaryInventoryRow = inventorySheet.addRow({
    name: `Total: ${inventoryResult.rows.length} produk`,
    total_terjual: totalTerjual,
    total_pendapatan: `Rp ${formatRupiah(totalPendapatanInventory)}`,
  });
  summaryInventoryRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF8B5CF6" },
    };
  });

  inventorySheet.views = [{ state: "frozen", ySplit: 1 }];

  return workbook.xlsx.writeBuffer();
};
