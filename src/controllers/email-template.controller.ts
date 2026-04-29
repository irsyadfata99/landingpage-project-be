import { Request, Response } from "express";
import { query } from "../config/db";
import {
  EmailTemplateType,
  UpdateEmailTemplateBody,
  EMAIL_TEMPLATE_VARS,
} from "../types/email-template.types";
import { ApiResponse } from "../types/response.types";

// ==========================================
// GET /api/admin/email-templates (admin)
// Ambil semua template email
// ==========================================
export const getAllEmailTemplates = async (
  _req: Request,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      "SELECT * FROM email_templates ORDER BY type ASC",
    );
    res.json({ success: true, message: "OK", data: result.rows });
  } catch (err) {
    console.error("getAllEmailTemplates error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// GET /api/admin/email-templates/:type (admin)
// Ambil satu template berdasarkan type
// ==========================================
export const getEmailTemplateByType = async (
  req: Request<{ type: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const validTypes: EmailTemplateType[] = [
      "payment_success",
      "shipping",
      "delivery_confirm",
    ];

    if (!validTypes.includes(req.params.type as EmailTemplateType)) {
      res.status(400).json({
        success: false,
        message: `Tipe template tidak valid. Pilihan: ${validTypes.join(", ")}`,
      });
      return;
    }

    const result = await query(
      "SELECT * FROM email_templates WHERE type = $1",
      [req.params.type],
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: "Template tidak ditemukan",
      });
      return;
    }

    res.json({ success: true, message: "OK", data: result.rows[0] });
  } catch (err) {
    console.error("getEmailTemplateByType error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// PUT /api/admin/email-templates/:type (admin)
// Update subject dan/atau body_html template
// available_vars tidak bisa diubah (read-only)
// ==========================================
export const updateEmailTemplate = async (
  req: Request<{ type: string }, object, UpdateEmailTemplateBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const validTypes: EmailTemplateType[] = [
      "payment_success",
      "shipping",
      "delivery_confirm",
    ];

    const type = req.params.type as EmailTemplateType;
    if (!validTypes.includes(type)) {
      res.status(400).json({
        success: false,
        message: `Tipe template tidak valid. Pilihan: ${validTypes.join(", ")}`,
      });
      return;
    }

    const { subject, body_html, is_active } = req.body;

    if (!subject && !body_html && is_active === undefined) {
      res.status(400).json({
        success: false,
        message:
          "Minimal satu field harus diisi: subject, body_html, atau is_active",
      });
      return;
    }

    const existing = await query(
      "SELECT * FROM email_templates WHERE type = $1",
      [type],
    );

    if (existing.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: "Template tidak ditemukan",
      });
      return;
    }

    const old = existing.rows[0];

    const result = await query(
      `UPDATE email_templates SET subject = $1, body_html = $2, is_active = $3
       WHERE type = $4 RETURNING *`,
      [
        subject ?? old.subject,
        body_html ?? old.body_html,
        is_active ?? old.is_active,
        type,
      ],
    );

    res.json({
      success: true,
      message: "Template email berhasil diupdate",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("updateEmailTemplate error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// GET /api/admin/email-templates/:type/vars (admin)
// Ambil daftar variabel yang tersedia untuk suatu template
// ==========================================
export const getTemplateVars = async (
  req: Request<{ type: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const validTypes = Object.keys(EMAIL_TEMPLATE_VARS) as EmailTemplateType[];
    const type = req.params.type as EmailTemplateType;

    if (!validTypes.includes(type)) {
      res.status(400).json({
        success: false,
        message: `Tipe template tidak valid. Pilihan: ${validTypes.join(", ")}`,
      });
      return;
    }

    res.json({
      success: true,
      message: "OK",
      data: {
        type,
        available_vars: EMAIL_TEMPLATE_VARS[type],
      },
    });
  } catch (err) {
    console.error("getTemplateVars error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
