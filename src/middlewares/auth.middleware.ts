import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AdminTokenPayload } from "../types/admin.types";
import { ApiResponse } from "../types/response.types";

export const authMiddleware = (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
): void => {
  try {
    // Ambil token dari Authorization header atau cookie
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: token tidak ditemukan",
      });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET tidak dikonfigurasi");
    }

    const decoded = jwt.verify(token, secret) as AdminTokenPayload;
    req.admin = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: token sudah kadaluarsa",
      });
      return;
    }

    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: token tidak valid",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
