// ==========================================
// ADMIN TYPES
// ==========================================

export interface Admin {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface AdminLoginBody {
  email: string;
  password: string;
}

export interface AdminTokenPayload {
  id: string;
  email: string;
  username: string;
}

// Extend Express Request untuk admin auth
declare global {
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}
