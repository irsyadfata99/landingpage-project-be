import { Request, Response } from "express";
import { query } from "../config/db";
import {
  CreateExpeditionBody,
  UpdateExpeditionBody,
} from "../types/content.types";
import { ApiResponse } from "../types/response.types";
import { deleteFile, getFileUrl } from "../middlewares/upload.middleware";

// ==========================================
// GET /api/products/expeditions (public)
// ==========================================
export const getPublicExpeditions = async (
  _req: Request,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, name, logo_url, description FROM expeditions
       WHERE is_active = TRUE ORDER BY sort_order ASC`,
    );
    res.json({ success: true, message: "OK", data: result.rows });
  } catch (err) {
    console.error("getPublicExpeditions error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// GET /api/admin/expeditions (admin)
// ==========================================
export const getAllExpeditions = async (
  _req: Request,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      "SELECT * FROM expeditions ORDER BY sort_order ASC",
    );
    res.json({ success: true, message: "OK", data: result.rows });
  } catch (err) {
    console.error("getAllExpeditions error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// POST /api/admin/expeditions (admin)
// ==========================================
export const createExpedition = async (
  req: Request<object, object, CreateExpeditionBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const { name, description, is_active, sort_order } = req.body;

    if (!name) {
      res
        .status(400)
        .json({ success: false, message: "Nama ekspedisi wajib diisi" });
      return;
    }

    const logo_url = req.file ? getFileUrl(req.file.filename) : null;

    const result = await query(
      `INSERT INTO expeditions (name, logo_url, description, is_active, sort_order)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, logo_url, description ?? null, is_active ?? true, sort_order ?? 0],
    );

    res.status(201).json({
      success: true,
      message: "Ekspedisi berhasil dibuat",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("createExpedition error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// PUT /api/admin/expeditions/:id (admin)
// ==========================================
export const updateExpedition = async (
  req: Request<{ id: string }, object, UpdateExpeditionBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const existing = await query("SELECT * FROM expeditions WHERE id = $1", [
      req.params.id,
    ]);
    if (existing.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Ekspedisi tidak ditemukan" });
      return;
    }

    const old = existing.rows[0];
    const { name, description, is_active, sort_order } = req.body;

    let logo_url = old.logo_url;
    if (req.file) {
      if (old.logo_url) deleteFile(old.logo_url);
      logo_url = getFileUrl(req.file.filename);
    }

    const result = await query(
      `UPDATE expeditions SET name=$1, logo_url=$2, description=$3, is_active=$4, sort_order=$5
       WHERE id = $6 RETURNING *`,
      [
        name ?? old.name,
        logo_url,
        description ?? old.description,
        is_active ?? old.is_active,
        sort_order ?? old.sort_order,
        req.params.id,
      ],
    );

    res.json({
      success: true,
      message: "Ekspedisi berhasil diupdate",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("updateExpedition error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// DELETE /api/admin/expeditions/:id (admin)
// ==========================================
export const deleteExpedition = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      "DELETE FROM expeditions WHERE id = $1 RETURNING logo_url",
      [req.params.id],
    );
    if (result.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Ekspedisi tidak ditemukan" });
      return;
    }
    if (result.rows[0].logo_url) deleteFile(result.rows[0].logo_url);
    res.json({ success: true, message: "Ekspedisi berhasil dihapus" });
  } catch (err) {
    console.error("deleteExpedition error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// PATCH /api/admin/expeditions/:id/toggle (admin)
// ==========================================
export const toggleExpedition = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      `UPDATE expeditions SET is_active = NOT is_active
       WHERE id = $1 RETURNING id, name, is_active`,
      [req.params.id],
    );
    if (result.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Ekspedisi tidak ditemukan" });
      return;
    }
    const { name, is_active } = result.rows[0];
    res.json({
      success: true,
      message: `Ekspedisi "${name}" ${is_active ? "diaktifkan" : "dinonaktifkan"}`,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("toggleExpedition error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
