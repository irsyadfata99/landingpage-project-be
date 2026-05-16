import { Request, Response } from "express";
import { query } from "../config/db";
import {
  CreatePainPointBody,
  UpdatePainPointBody,
} from "../types/content.types";
import { ApiResponse } from "../types/response.types";

// ==========================================
// GET /api/admin/pain-points (admin)
// ==========================================
export const getAllPainPoints = async (
  _req: Request,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      "SELECT * FROM pain_points ORDER BY sort_order ASC",
    );
    res.json({ success: true, message: "OK", data: result.rows });
  } catch (err) {
    console.error("getAllPainPoints error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// POST /api/admin/pain-points (admin)
// ==========================================
export const createPainPoint = async (
  req: Request<object, object, CreatePainPointBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const { headline, items, is_active, sort_order } = req.body;

    const result = await query(
      `INSERT INTO pain_points (headline, items, is_active, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [headline, items, is_active ?? true, sort_order ?? 0],
    );

    res.status(201).json({
      success: true,
      message: "Pain point berhasil dibuat",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("createPainPoint error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// PUT /api/admin/pain-points/:id (admin)
// ==========================================
export const updatePainPoint = async (
  req: Request<{ id: string }, object, UpdatePainPointBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const existing = await query("SELECT * FROM pain_points WHERE id = $1", [
      req.params.id,
    ]);
    if (existing.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Pain point tidak ditemukan" });
      return;
    }
    const old = existing.rows[0];
    const { headline, items, is_active, sort_order } = req.body;

    const result = await query(
      `UPDATE pain_points
       SET headline = $1, items = $2, is_active = $3, sort_order = $4
       WHERE id = $5 RETURNING *`,
      [
        headline ?? old.headline,
        items ?? old.items,
        is_active ?? old.is_active,
        sort_order ?? old.sort_order,
        req.params.id,
      ],
    );

    res.json({
      success: true,
      message: "Pain point berhasil diupdate",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("updatePainPoint error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// DELETE /api/admin/pain-points/:id (admin)
// ==========================================
export const deletePainPoint = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      "DELETE FROM pain_points WHERE id = $1 RETURNING id",
      [req.params.id],
    );
    if (result.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Pain point tidak ditemukan" });
      return;
    }
    res.json({ success: true, message: "Pain point berhasil dihapus" });
  } catch (err) {
    console.error("deletePainPoint error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
