import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodIssue } from "zod";
import { ApiResponse } from "../types/response.types";

// ==========================================
// VALIDATE MIDDLEWARE (Zod v4 compatible)
// Validasi req.body menggunakan Zod schema
// Jika gagal → 400 dengan daftar error yang readable
// ==========================================
export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response<ApiResponse>, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = formatZodErrors(result.error.issues);
      res.status(400).json({
        success: false,
        message: errors[0], // pesan error pertama sebagai message utama
        data: { errors }, // semua error untuk debugging di frontend
      });
      return;
    }

    // Ganti req.body dengan data yang sudah di-parse & di-strip unknown fields
    req.body = result.data;
    next();
  };

// ==========================================
// HELPER: format ZodIssue[] menjadi array string yang readable
// ==========================================
const formatZodErrors = (issues: ZodIssue[]): string[] => {
  return issues.map((issue) => {
    const field = issue.path.join(".");
    const label = field ? `${field}: ` : "";
    return `${label}${issue.message}`;
  });
};
