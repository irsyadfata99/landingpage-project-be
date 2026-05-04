import { Request, Response } from "express";
import { query } from "../config/db";
import {
  CreateVoucherBody,
  UpdateVoucherBody,
  ValidateVoucherBody,
  VoucherFilter,
} from "../types/voucher.types";
import { ApiResponse, PaginatedResponse } from "../types/response.types";

// ==========================================
// HELPER: hitung diskon
// ==========================================
export const calculateDiscount = (
  type: "PERCENT" | "NOMINAL",
  value: number,
  totalAmount: number,
): number => {
  if (type === "PERCENT") {
    return Math.floor((totalAmount * value) / 100);
  }
  return Math.min(value, totalAmount);
};

// ==========================================
// HELPER: validasi voucher (reusable)
// Dipakai di validate endpoint & createOrder
// ==========================================
export const validateVoucherCode = async (
  code: string,
  totalAmount: number,
  customerEmail: string,
): Promise<{
  valid: boolean;
  message: string;
  voucher?: {
    id: string;
    code: string;
    type: "PERCENT" | "NOMINAL";
    value: number;
    discount_amount: number;
  };
}> => {
  const result = await query("SELECT * FROM vouchers WHERE code = $1", [
    code.toUpperCase(),
  ]);

  if (result.rowCount === 0) {
    return { valid: false, message: "Voucher tidak ditemukan" };
  }

  const voucher = result.rows[0];

  if (!voucher.is_active) {
    return { valid: false, message: "Voucher tidak aktif" };
  }

  if (new Date() > new Date(voucher.expired_at)) {
    return { valid: false, message: "Voucher sudah kadaluarsa" };
  }

  if (voucher.used_count >= voucher.max_uses) {
    return { valid: false, message: "Voucher sudah mencapai batas pemakaian" };
  }

  if (totalAmount < voucher.minimum_order) {
    return {
      valid: false,
      message: `Minimum order untuk voucher ini adalah Rp ${Number(voucher.minimum_order).toLocaleString("id-ID")}`,
    };
  }

  // Cek apakah customer sudah pernah pakai voucher ini
  const usageResult = await query(
    "SELECT id FROM voucher_uses WHERE voucher_id = $1 AND customer_email = $2",
    [voucher.id, customerEmail.toLowerCase()],
  );

  if (usageResult.rowCount! > 0) {
    return {
      valid: false,
      message: "Anda sudah pernah menggunakan voucher ini",
    };
  }

  const discount_amount = calculateDiscount(
    voucher.type,
    Number(voucher.value),
    totalAmount,
  );

  return {
    valid: true,
    message: "Voucher valid",
    voucher: {
      id: voucher.id,
      code: voucher.code,
      type: voucher.type,
      value: Number(voucher.value),
      discount_amount,
    },
  };
};

// ==========================================
// POST /api/orders/validate-voucher (public)
// ==========================================
export const validateVoucher = async (
  req: Request<object, object, ValidateVoucherBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const { code, total_amount, customer_email } = req.body;

    const result = await validateVoucherCode(
      code,
      total_amount,
      customer_email,
    );

    if (!result.valid) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }

    res.json({
      success: true,
      message: result.message,
      data: result.voucher,
    });
  } catch (err) {
    console.error("validateVoucher error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// GET /api/admin/vouchers (admin)
// ==========================================
export const getAllVouchers = async (
  req: Request<object, object, object, VoucherFilter>,
  res: Response<PaginatedResponse<object>>,
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (req.query.is_active !== undefined) {
      conditions.push(`is_active = $${idx++}`);
      params.push(req.query.is_active);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await query(
      `SELECT COUNT(*) FROM vouchers ${where}`,
      params,
    );
    const total = Number(countResult.rows[0].count);

    const dataResult = await query(
      `SELECT * FROM vouchers ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset],
    );

    res.json({
      success: true,
      message: "OK",
      data: dataResult.rows,
      pagination: { total, page, limit, total_pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("getAllVouchers error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      data: [],
      pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
    });
  }
};

// ==========================================
// GET /api/admin/vouchers/:id (admin)
// ==========================================
export const getVoucherById = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query("SELECT * FROM vouchers WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Voucher tidak ditemukan" });
      return;
    }
    res.json({ success: true, message: "OK", data: result.rows[0] });
  } catch (err) {
    console.error("getVoucherById error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// POST /api/admin/vouchers (admin)
// ==========================================
export const createVoucher = async (
  req: Request<object, object, CreateVoucherBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const {
      code,
      type,
      value,
      minimum_order,
      max_uses,
      expired_at,
      is_active,
    } = req.body;

    // Cek duplikat kode
    const existing = await query("SELECT id FROM vouchers WHERE code = $1", [
      code.toUpperCase(),
    ]);
    if (existing.rowCount! > 0) {
      res
        .status(400)
        .json({ success: false, message: "Kode voucher sudah digunakan" });
      return;
    }

    const result = await query(
      `INSERT INTO vouchers
        (code, type, value, minimum_order, max_uses, expired_at, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        code.toUpperCase(),
        type,
        value,
        minimum_order ?? 0,
        max_uses ?? 1,
        expired_at,
        is_active ?? true,
      ],
    );

    res.status(201).json({
      success: true,
      message: "Voucher berhasil dibuat",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("createVoucher error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// PUT /api/admin/vouchers/:id (admin)
// ==========================================
export const updateVoucher = async (
  req: Request<{ id: string }, object, UpdateVoucherBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const existing = await query("SELECT * FROM vouchers WHERE id = $1", [
      req.params.id,
    ]);
    if (existing.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Voucher tidak ditemukan" });
      return;
    }
    const old = existing.rows[0];
    const {
      code,
      type,
      value,
      minimum_order,
      max_uses,
      expired_at,
      is_active,
    } = req.body;

    // Cek duplikat kode jika kode diubah
    if (code && code.toUpperCase() !== old.code) {
      const dupCheck = await query(
        "SELECT id FROM vouchers WHERE code = $1 AND id != $2",
        [code.toUpperCase(), req.params.id],
      );
      if (dupCheck.rowCount! > 0) {
        res
          .status(400)
          .json({ success: false, message: "Kode voucher sudah digunakan" });
        return;
      }
    }

    const result = await query(
      `UPDATE vouchers SET
        code=$1, type=$2, value=$3, minimum_order=$4,
        max_uses=$5, expired_at=$6, is_active=$7
       WHERE id = $8 RETURNING *`,
      [
        code ? code.toUpperCase() : old.code,
        type ?? old.type,
        value ?? old.value,
        minimum_order ?? old.minimum_order,
        max_uses ?? old.max_uses,
        expired_at ?? old.expired_at,
        is_active ?? old.is_active,
        req.params.id,
      ],
    );

    res.json({
      success: true,
      message: "Voucher berhasil diupdate",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("updateVoucher error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// DELETE /api/admin/vouchers/:id (admin)
// ==========================================
export const deleteVoucher = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      "DELETE FROM vouchers WHERE id = $1 RETURNING id",
      [req.params.id],
    );
    if (result.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Voucher tidak ditemukan" });
      return;
    }
    res.json({ success: true, message: "Voucher berhasil dihapus" });
  } catch (err) {
    console.error("deleteVoucher error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// PATCH /api/admin/vouchers/:id/toggle (admin)
// ==========================================
export const toggleVoucher = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      `UPDATE vouchers SET is_active = NOT is_active
       WHERE id = $1 RETURNING id, code, is_active`,
      [req.params.id],
    );
    if (result.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Voucher tidak ditemukan" });
      return;
    }
    const { code, is_active } = result.rows[0];
    res.json({
      success: true,
      message: `Voucher "${code}" ${is_active ? "diaktifkan" : "dinonaktifkan"}`,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("toggleVoucher error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
