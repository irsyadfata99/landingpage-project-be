import { Request, Response } from "express";
import { query } from "../config/db";
import {
  CreateBankAccountBody,
  UpdateBankAccountBody,
  UpdateWithdrawalSettingsBody,
  CreateWithdrawalBody,
  UpdateWithdrawalStatusBody,
  WithdrawalFilter,
} from "../types/withdrawal.types";
import { ApiResponse, PaginatedResponse } from "../types/response.types";

// ==========================================
// BANK ACCOUNTS
// ==========================================

export const getAllBankAccounts = async (
  _req: Request,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      "SELECT * FROM bank_accounts ORDER BY is_active DESC, created_at ASC",
    );
    res.json({ success: true, message: "OK", data: result.rows });
  } catch (err) {
    console.error("getAllBankAccounts error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const createBankAccount = async (
  req: Request<object, object, CreateBankAccountBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const { bank_name, account_number, account_name, is_active } = req.body;

    if (!bank_name || !account_number || !account_name) {
      res.status(400).json({
        success: false,
        message: "bank_name, account_number, account_name wajib diisi",
      });
      return;
    }

    const result = await query(
      `INSERT INTO bank_accounts (bank_name, account_number, account_name, is_active)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [bank_name, account_number, account_name, is_active ?? false],
    );

    res.status(201).json({
      success: true,
      message: "Rekening berhasil ditambahkan",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("createBankAccount error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateBankAccount = async (
  req: Request<{ id: string }, object, UpdateBankAccountBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const existing = await query("SELECT * FROM bank_accounts WHERE id = $1", [
      req.params.id,
    ]);
    if (existing.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Rekening tidak ditemukan" });
      return;
    }
    const old = existing.rows[0];
    const { bank_name, account_number, account_name, is_active } = req.body;

    const result = await query(
      `UPDATE bank_accounts SET
        bank_name = $1, account_number = $2, account_name = $3, is_active = $4
       WHERE id = $5 RETURNING *`,
      [
        bank_name ?? old.bank_name,
        account_number ?? old.account_number,
        account_name ?? old.account_name,
        is_active ?? old.is_active,
        req.params.id,
      ],
    );

    res.json({
      success: true,
      message: "Rekening berhasil diupdate",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("updateBankAccount error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deleteBankAccount = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const existing = await query("SELECT * FROM bank_accounts WHERE id = $1", [
      req.params.id,
    ]);
    if (existing.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Rekening tidak ditemukan" });
      return;
    }
    if (existing.rows[0].is_active) {
      res.status(400).json({
        success: false,
        message:
          "Tidak bisa menghapus rekening yang sedang aktif. Nonaktifkan dulu.",
      });
      return;
    }

    const usageCheck = await query(
      "SELECT id FROM withdrawal_history WHERE bank_account_id = $1 LIMIT 1",
      [req.params.id],
    );
    if (usageCheck.rowCount! > 0) {
      res.status(400).json({
        success: false,
        message:
          "Rekening tidak bisa dihapus karena sudah digunakan di riwayat penarikan",
      });
      return;
    }

    await query("DELETE FROM bank_accounts WHERE id = $1", [req.params.id]);
    res.json({ success: true, message: "Rekening berhasil dihapus" });
  } catch (err) {
    console.error("deleteBankAccount error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const activateBankAccount = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      "UPDATE bank_accounts SET is_active = TRUE WHERE id = $1 RETURNING *",
      [req.params.id],
    );
    if (result.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Rekening tidak ditemukan" });
      return;
    }
    res.json({
      success: true,
      message: `Rekening ${result.rows[0].bank_name} - ${result.rows[0].account_number} diaktifkan`,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("activateBankAccount error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// WITHDRAWAL SETTINGS
// ==========================================

export const getWithdrawalSettings = async (
  _req: Request,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query("SELECT * FROM withdrawal_settings LIMIT 1");
    res.json({ success: true, message: "OK", data: result.rows[0] ?? null });
  } catch (err) {
    console.error("getWithdrawalSettings error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateWithdrawalSettings = async (
  req: Request<object, object, UpdateWithdrawalSettingsBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const { withdrawal_date, minimum_amount, is_auto, notification_email } =
      req.body;

    if (
      withdrawal_date !== undefined &&
      (withdrawal_date < 1 || withdrawal_date > 28)
    ) {
      res.status(400).json({
        success: false,
        message: "Tanggal penarikan harus antara 1 dan 28",
      });
      return;
    }

    const existing = await query("SELECT * FROM withdrawal_settings LIMIT 1");
    const old = existing.rows[0];

    let result;
    if (!old) {
      result = await query(
        `INSERT INTO withdrawal_settings
          (withdrawal_date, minimum_amount, is_auto, notification_email)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [
          withdrawal_date ?? 1,
          minimum_amount ?? 0,
          is_auto ?? false,
          notification_email ?? null,
        ],
      );
    } else {
      result = await query(
        `UPDATE withdrawal_settings SET
          withdrawal_date = $1, minimum_amount = $2,
          is_auto = $3, notification_email = $4
         WHERE id = $5 RETURNING *`,
        [
          withdrawal_date ?? old.withdrawal_date,
          minimum_amount ?? old.minimum_amount,
          is_auto ?? old.is_auto,
          notification_email ?? old.notification_email,
          old.id,
        ],
      );
    }

    res.json({
      success: true,
      message: "Pengaturan penarikan berhasil diupdate",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("updateWithdrawalSettings error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// WITHDRAWAL HISTORY
// ==========================================

export const getWithdrawalHistory = async (
  req: Request<object, object, object, WithdrawalFilter>,
  res: Response<PaginatedResponse<object>>,
): Promise<void> => {
  try {
    const { status, start_date, end_date } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (status) {
      conditions.push(`wh.status = $${idx++}`);
      params.push(status);
    }
    if (start_date) {
      conditions.push(`wh.requested_at >= $${idx++}`);
      params.push(start_date);
    }
    if (end_date) {
      conditions.push(`wh.requested_at <= $${idx++}`);
      params.push(end_date);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await query(
      `SELECT COUNT(*) FROM withdrawal_history wh ${where}`,
      params,
    );
    const total = Number(countResult.rows[0].count);

    const dataResult = await query(
      `SELECT wh.*, ba.bank_name, ba.account_number, ba.account_name
       FROM withdrawal_history wh
       LEFT JOIN bank_accounts ba ON ba.id = wh.bank_account_id
       ${where}
       ORDER BY wh.requested_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset],
    );

    res.json({
      success: true,
      message: "OK",
      data: dataResult.rows,
      pagination: { total, page, limit, total_pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("getWithdrawalHistory error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      data: [],
      pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
    });
  }
};

export const requestWithdrawal = async (
  req: Request<object, object, CreateWithdrawalBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const { amount, bank_account_id, notes } = req.body;

    if (!amount || !bank_account_id) {
      res.status(400).json({
        success: false,
        message: "amount dan bank_account_id wajib diisi",
      });
      return;
    }

    if (amount <= 0) {
      res.status(400).json({
        success: false,
        message: "Jumlah penarikan harus lebih dari 0",
      });
      return;
    }

    const bankResult = await query(
      "SELECT * FROM bank_accounts WHERE id = $1 AND is_active = TRUE",
      [bank_account_id],
    );
    if (bankResult.rowCount === 0) {
      res.status(400).json({
        success: false,
        message: "Rekening tidak ditemukan atau tidak aktif",
      });
      return;
    }

    const settingsResult = await query(
      "SELECT * FROM withdrawal_settings LIMIT 1",
    );
    const settings = settingsResult.rows[0];
    if (settings && amount < settings.minimum_amount) {
      res.status(400).json({
        success: false,
        message: `Jumlah penarikan minimal Rp ${settings.minimum_amount.toLocaleString("id-ID")}`,
      });
      return;
    }

    const currentMonth = new Date();
    const startOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );
    const endOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0,
    );

    const existingThisMonth = await query(
      `SELECT id FROM withdrawal_history
       WHERE requested_at BETWEEN $1 AND $2
         AND status IN ('PENDING', 'SUCCESS')`,
      [startOfMonth.toISOString(), endOfMonth.toISOString()],
    );

    if (existingThisMonth.rowCount! > 0) {
      res.status(400).json({
        success: false,
        message: "Penarikan hanya bisa dilakukan sekali dalam satu bulan",
      });
      return;
    }

    if (settings) {
      const today = new Date().getDate();
      if (today !== settings.withdrawal_date) {
        res.status(400).json({
          success: false,
          message: `Penarikan hanya bisa dilakukan pada tanggal ${settings.withdrawal_date} setiap bulan`,
        });
        return;
      }
    }

    const result = await query(
      `INSERT INTO withdrawal_history (bank_account_id, amount, status, notes)
       VALUES ($1,$2,'PENDING',$3) RETURNING *`,
      [bank_account_id, amount, notes ?? null],
    );

    res.status(201).json({
      success: true,
      message: "Request penarikan berhasil dibuat, menunggu diproses",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("requestWithdrawal error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateWithdrawalStatus = async (
  req: Request<{ id: string }, object, UpdateWithdrawalStatusBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    // FIX #2: midtrans_ref → tripay_ref
    const { status, tripay_ref, notes } = req.body;

    if (!status) {
      res.status(400).json({ success: false, message: "Status wajib diisi" });
      return;
    }

    if (!["SUCCESS", "FAILED"].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Status hanya bisa diubah ke SUCCESS atau FAILED",
      });
      return;
    }

    const existing = await query(
      "SELECT * FROM withdrawal_history WHERE id = $1",
      [req.params.id],
    );
    if (existing.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Riwayat penarikan tidak ditemukan" });
      return;
    }
    if (existing.rows[0].status !== "PENDING") {
      res.status(400).json({
        success: false,
        message: "Status hanya bisa diubah jika masih PENDING",
      });
      return;
    }

    // FIX #2: gunakan kolom tripay_ref
    const result = await query(
      `UPDATE withdrawal_history SET
        status = $1,
        tripay_ref = $2,
        notes = COALESCE($3, notes),
        processed_at = NOW()
       WHERE id = $4 RETURNING *`,
      [status, tripay_ref ?? null, notes ?? null, req.params.id],
    );

    res.json({
      success: true,
      message: `Status penarikan diubah ke ${status}`,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("updateWithdrawalStatus error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
