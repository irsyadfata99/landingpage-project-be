import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

// ==========================================
// HELPER: pastikan folder ada
// ==========================================
const ensureDir = (dir: string): void => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// ==========================================
// STORAGE CONFIG
// ==========================================
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    const uploadDir = path.join(
      process.cwd(),
      process.env.UPLOAD_DIR || "uploads",
    );
    ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    // Format: timestamp-originalname (spasi diganti -)
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    cb(null, uniqueName);
  },
});

// ==========================================
// FILE FILTER — hanya izinkan gambar
// ==========================================
const imageFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Format file tidak didukung. Gunakan JPEG, PNG, atau WebP"));
  }
};

const MAX_SIZE = Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB

// ==========================================
// UPLOAD INSTANCES
// ==========================================

// Upload 1 gambar (untuk hero, promo, contact, produk)
export const uploadSingle = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_SIZE },
}).single("image");

// Upload banyak gambar (maksimal 5)
export const uploadMultiple = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_SIZE },
}).array("images", 5);

// ==========================================
// HELPER: hapus file lama saat update gambar
// ==========================================
export const deleteFile = (fileUrl: string): void => {
  try {
    // Ambil nama file dari URL: /uploads/filename.jpg → filename.jpg
    const filename = path.basename(fileUrl);
    const filePath = path.join(
      process.cwd(),
      process.env.UPLOAD_DIR || "uploads",
      filename,
    );
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Tidak perlu throw — gagal hapus file lama tidak kritis
    console.warn(`⚠️  Gagal hapus file: ${fileUrl}`);
  }
};

// ==========================================
// HELPER: buat URL publik dari nama file
// ==========================================
export const getFileUrl = (filename: string): string => {
  const baseUrl = process.env.BASE_URL || "http://localhost:5000";
  return `${baseUrl}/uploads/${filename}`;
};
