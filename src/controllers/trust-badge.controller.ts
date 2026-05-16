import { Request, Response } from "express";
import { query } from "../config/db";
import {
  CreateTrustBadgeBody,
  UpdateTrustBadgeBody,
} from "../types/content.types";
import { ApiResponse } from "../types/response.types";
import {
  deleteFile,
  getFileUrl,
  uploadToR2,
} from "../middlewares/upload.middleware";

// ==========================================
// GET /api/admin/trust-badges (admin)
// ==========================================
export const getAllTrustBadges = async (
  _req: Request,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      "SELECT * FROM trust_badges ORDER BY sort_order ASC",
    );
    res.json({ success: true, message: "OK", data: result.rows });
  } catch (err) {
    console.error("getAllTrustBadges error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// POST /api/admin/trust-badges (admin)
// ==========================================
export const createTrustBadge = async (
  req: Request<object, object, CreateTrustBadgeBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const { label, sort_order, is_active } = req.body;

    let image_url = null;
    if (req.file) {
      const filename = await uploadToR2(req.file);
      image_url = getFileUrl(filename);
    }

    const result = await query(
      `INSERT INTO trust_badges (label, image_url, sort_order, is_active)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [label, image_url, sort_order ?? 0, is_active ?? true],
    );

    res.status(201).json({
      success: true,
      message: "Trust badge berhasil dibuat",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("createTrustBadge error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// PUT /api/admin/trust-badges/:id (admin)
// ==========================================
export const updateTrustBadge = async (
  req: Request<{ id: string }, object, UpdateTrustBadgeBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const existing = await query("SELECT * FROM trust_badges WHERE id = $1", [
      req.params.id,
    ]);
    if (existing.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Trust badge tidak ditemukan" });
      return;
    }

    const old = existing.rows[0];
    const { label, sort_order, is_active } = req.body;

    let image_url = old.image_url;
    if (req.file) {
      if (old.image_url) await deleteFile(old.image_url);
      const filename = await uploadToR2(req.file);
      image_url = getFileUrl(filename);
    }

    const result = await query(
      `UPDATE trust_badges SET
        label = $1, image_url = $2, sort_order = $3, is_active = $4
       WHERE id = $5 RETURNING *`,
      [
        label ?? old.label,
        image_url,
        sort_order ?? old.sort_order,
        is_active ?? old.is_active,
        req.params.id,
      ],
    );

    res.json({
      success: true,
      message: "Trust badge berhasil diupdate",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("updateTrustBadge error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// DELETE /api/admin/trust-badges/:id (admin)
// ==========================================
export const deleteTrustBadge = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      "DELETE FROM trust_badges WHERE id = $1 RETURNING image_url",
      [req.params.id],
    );
    if (result.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Trust badge tidak ditemukan" });
      return;
    }
    if (result.rows[0].image_url) await deleteFile(result.rows[0].image_url);
    res.json({ success: true, message: "Trust badge berhasil dihapus" });
  } catch (err) {
    console.error("deleteTrustBadge error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// PATCH /api/admin/trust-badges/:id/toggle (admin)
// ==========================================
export const toggleTrustBadge = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      `UPDATE trust_badges SET is_active = NOT is_active
       WHERE id = $1 RETURNING id, label, is_active`,
      [req.params.id],
    );
    if (result.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Trust badge tidak ditemukan" });
      return;
    }
    const { label, is_active } = result.rows[0];
    res.json({
      success: true,
      message: `Trust badge "${label}" ${is_active ? "diaktifkan" : "dinonaktifkan"}`,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("toggleTrustBadge error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
