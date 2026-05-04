import multer from "multer";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "../config/r2";
import { Request } from "express";

// ==========================================
// FILE FILTER — hanya izinkan gambar
// ==========================================
const imageFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Format file tidak didukung. Gunakan JPEG, PNG, atau WebP"));
  }
};

const MAX_SIZE = Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;

// Gunakan memory storage — file di-upload langsung ke R2, tidak disimpan ke disk
const storage = multer.memoryStorage();

// ==========================================
// UPLOAD INSTANCES
// ==========================================
export const uploadSingle = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_SIZE },
}).single("image");

export const uploadMultiple = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_SIZE },
}).array("images", 5);

// ==========================================
// HELPER: upload file ke R2
// Dipanggil dari controller setelah multer selesai
// ==========================================
export const uploadToR2 = async (
  file: Express.Multer.File,
): Promise<string> => {
  const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  return filename;
};

// ==========================================
// HELPER: hapus file dari R2
// ==========================================
export const deleteFile = async (fileUrl: string): Promise<void> => {
  try {
    // Ambil filename dari URL: https://pub-xxx.r2.dev/filename.jpg → filename.jpg
    const filename = fileUrl.replace(`${R2_PUBLIC_URL}/`, "");

    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: filename,
      }),
    );
  } catch {
    console.warn(`⚠️  Gagal hapus file dari R2: ${fileUrl}`);
  }
};

// ==========================================
// HELPER: buat URL publik dari nama file
// ==========================================
export const getFileUrl = (filename: string): string => {
  return `${R2_PUBLIC_URL}/${filename}`;
};
