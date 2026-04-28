import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/db";
import { AdminLoginBody, AdminTokenPayload } from "../types/admin.types";
import { ApiResponse } from "../types/response.types";

// ==========================================
// POST /api/admin/login
// ==========================================
export const login = async (
  req: Request<object, object, AdminLoginBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email dan password wajib diisi",
      });
      return;
    }

    const result = await query(
      "SELECT id, username, email, password_hash FROM admins WHERE email = $1",
      [email],
    );

    if (result.rowCount === 0) {
      res.status(401).json({
        success: false,
        message: "Email atau password salah",
      });
      return;
    }

    const admin = result.rows[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);

    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Email atau password salah",
      });
      return;
    }

    const payload: AdminTokenPayload = {
      id: admin.id,
      email: admin.email,
      username: admin.username,
    };

    const secret = process.env.JWT_SECRET!;
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
    const token = jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);

    res.status(200).json({
      success: true,
      message: "Login berhasil",
      data: {
        token,
        admin: payload,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// GET /api/admin/me
// ==========================================
export const getMe = async (
  req: Request,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      "SELECT id, username, email, created_at FROM admins WHERE id = $1",
      [req.admin!.id],
    );

    if (result.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Admin tidak ditemukan" });
      return;
    }

    res.json({ success: true, message: "OK", data: result.rows[0] });
  } catch (err) {
    console.error("GetMe error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// PUT /api/admin/password
// ==========================================
export const changePassword = async (
  req: Request<object, object, { old_password: string; new_password: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      res
        .status(400)
        .json({
          success: false,
          message: "Password lama dan baru wajib diisi",
        });
      return;
    }

    if (new_password.length < 6) {
      res
        .status(400)
        .json({ success: false, message: "Password baru minimal 6 karakter" });
      return;
    }

    const result = await query(
      "SELECT password_hash FROM admins WHERE id = $1",
      [req.admin!.id],
    );

    const isMatch = await bcrypt.compare(
      old_password,
      result.rows[0].password_hash,
    );
    if (!isMatch) {
      res
        .status(400)
        .json({ success: false, message: "Password lama tidak sesuai" });
      return;
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await query("UPDATE admins SET password_hash = $1 WHERE id = $2", [
      newHash,
      req.admin!.id,
    ]);

    res.json({ success: true, message: "Password berhasil diubah" });
  } catch (err) {
    console.error("ChangePassword error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
