import { Request, Response } from "express";
import { query } from "../config/db";
import {
  UpdateSiteConfigBody,
  UpdateHeroBody,
  UpdatePromoBody,
  CreatePricingBody,
  UpdatePricingBody,
  CreateTestimonialBody,
  UpdateTestimonialBody,
  CreateFAQBody,
  UpdateFAQBody,
  UpdateContactPersonBody,
} from "../types/content.types";
import { ApiResponse } from "../types/response.types";
import { deleteFile, getFileUrl } from "../middlewares/upload.middleware";

// ==========================================
// GET /api/content (public — semua section sekaligus)
// ==========================================
export const getLandingPage = async (
  _req: Request,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const [siteConfig, hero, promo, pricing, testimonials, faqs, contact] =
      await Promise.all([
        query("SELECT * FROM site_config LIMIT 1"),
        query("SELECT * FROM hero_section LIMIT 1"),
        query("SELECT * FROM promo_section LIMIT 1"),
        query(
          "SELECT * FROM pricing_items WHERE is_active = TRUE ORDER BY sort_order ASC",
        ),
        query(
          "SELECT * FROM testimonials WHERE is_active = TRUE ORDER BY sort_order ASC",
        ),
        query(
          "SELECT * FROM faqs WHERE is_active = TRUE ORDER BY sort_order ASC",
        ),
        query("SELECT * FROM contact_person LIMIT 1"),
      ]);

    res.json({
      success: true,
      message: "OK",
      data: {
        site_config: siteConfig.rows[0] ?? null,
        hero: hero.rows[0] ?? null,
        promo: promo.rows[0] ?? null,
        pricing: pricing.rows,
        testimonials: testimonials.rows,
        faqs: faqs.rows,
        contact_person: contact.rows[0] ?? null,
      },
    });
  } catch (err) {
    console.error("getLandingPage error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// SITE CONFIG
// ==========================================
export const updateSiteConfig = async (
  req: Request<object, object, UpdateSiteConfigBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const existing = await query("SELECT * FROM site_config LIMIT 1");
    const old = existing.rows[0];

    let logo_url = old?.logo_url;
    let favicon_url = old?.favicon_url;

    // Handle multiple file fields via req.files
    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;
    if (files?.logo?.[0]) {
      if (old?.logo_url) deleteFile(old.logo_url);
      logo_url = getFileUrl(files.logo[0].filename);
    }
    if (files?.favicon?.[0]) {
      if (old?.favicon_url) deleteFile(old.favicon_url);
      favicon_url = getFileUrl(files.favicon[0].filename);
    }

    const {
      brand_name,
      primary_color,
      secondary_color,
      meta_title,
      meta_description,
    } = req.body;

    let result;
    if (!old) {
      result = await query(
        `INSERT INTO site_config (brand_name, logo_url, favicon_url, primary_color, secondary_color, meta_title, meta_description)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
          brand_name,
          logo_url,
          favicon_url,
          primary_color,
          secondary_color,
          meta_title,
          meta_description,
        ],
      );
    } else {
      result = await query(
        `UPDATE site_config SET
          brand_name = $1, logo_url = $2, favicon_url = $3,
          primary_color = $4, secondary_color = $5,
          meta_title = $6, meta_description = $7
         WHERE id = $8 RETURNING *`,
        [
          brand_name ?? old.brand_name,
          logo_url,
          favicon_url,
          primary_color ?? old.primary_color,
          secondary_color ?? old.secondary_color,
          meta_title ?? old.meta_title,
          meta_description ?? old.meta_description,
          old.id,
        ],
      );
    }

    res.json({
      success: true,
      message: "Site config berhasil diupdate",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("updateSiteConfig error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// HERO SECTION
// ==========================================
export const updateHero = async (
  req: Request<object, object, UpdateHeroBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const existing = await query("SELECT * FROM hero_section LIMIT 1");
    const old = existing.rows[0];
    const { headline, subheadline, cta_text, bg_color, is_active } = req.body;

    let image_url = old?.image_url;
    if (req.file) {
      if (old?.image_url) deleteFile(old.image_url);
      image_url = getFileUrl(req.file.filename);
    }

    let result;
    if (!old) {
      result = await query(
        `INSERT INTO hero_section (headline, subheadline, cta_text, image_url, bg_color, is_active)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [
          headline,
          subheadline,
          cta_text,
          image_url,
          bg_color,
          is_active ?? true,
        ],
      );
    } else {
      result = await query(
        `UPDATE hero_section SET
          headline = $1, subheadline = $2, cta_text = $3,
          image_url = $4, bg_color = $5, is_active = $6
         WHERE id = $7 RETURNING *`,
        [
          headline ?? old.headline,
          subheadline ?? old.subheadline,
          cta_text ?? old.cta_text,
          image_url,
          bg_color ?? old.bg_color,
          is_active ?? old.is_active,
          old.id,
        ],
      );
    }

    res.json({
      success: true,
      message: "Hero section berhasil diupdate",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("updateHero error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// PROMO SECTION
// ==========================================
export const updatePromo = async (
  req: Request<object, object, UpdatePromoBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const existing = await query("SELECT * FROM promo_section LIMIT 1");
    const old = existing.rows[0];
    const { badge_text, title, description, start_date, end_date, is_active } =
      req.body;

    let image_url = old?.image_url;
    if (req.file) {
      if (old?.image_url) deleteFile(old.image_url);
      image_url = getFileUrl(req.file.filename);
    }

    let result;
    if (!old) {
      result = await query(
        `INSERT INTO promo_section (badge_text, title, description, image_url, start_date, end_date, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
          badge_text,
          title,
          description,
          image_url,
          start_date,
          end_date,
          is_active ?? false,
        ],
      );
    } else {
      result = await query(
        `UPDATE promo_section SET
          badge_text = $1, title = $2, description = $3, image_url = $4,
          start_date = $5, end_date = $6, is_active = $7
         WHERE id = $8 RETURNING *`,
        [
          badge_text ?? old.badge_text,
          title ?? old.title,
          description ?? old.description,
          image_url,
          start_date ?? old.start_date,
          end_date ?? old.end_date,
          is_active ?? old.is_active,
          old.id,
        ],
      );
    }

    res.json({
      success: true,
      message: "Promo section berhasil diupdate",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("updatePromo error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// PRICING ITEMS
// ==========================================
export const getPricing = async (
  _req: Request,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      "SELECT * FROM pricing_items ORDER BY sort_order ASC",
    );
    res.json({ success: true, message: "OK", data: result.rows });
  } catch (err) {
    console.error("getPricing error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const createPricing = async (
  req: Request<object, object, CreatePricingBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const {
      name,
      price,
      original_price,
      features,
      is_popular,
      cta_text,
      is_active,
      sort_order,
    } = req.body;
    if (!name || price === undefined || !features) {
      res
        .status(400)
        .json({ success: false, message: "name, price, features wajib diisi" });
      return;
    }
    const result = await query(
      `INSERT INTO pricing_items (name, price, original_price, features, is_popular, cta_text, is_active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        name,
        price,
        original_price ?? null,
        features,
        is_popular ?? false,
        cta_text ?? "Pilih Paket",
        is_active ?? true,
        sort_order ?? 0,
      ],
    );
    res
      .status(201)
      .json({
        success: true,
        message: "Pricing berhasil dibuat",
        data: result.rows[0],
      });
  } catch (err) {
    console.error("createPricing error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updatePricing = async (
  req: Request<{ id: string }, object, UpdatePricingBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const existing = await query("SELECT * FROM pricing_items WHERE id = $1", [
      req.params.id,
    ]);
    if (existing.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Pricing tidak ditemukan" });
      return;
    }
    const old = existing.rows[0];
    const {
      name,
      price,
      original_price,
      features,
      is_popular,
      cta_text,
      is_active,
      sort_order,
    } = req.body;
    const result = await query(
      `UPDATE pricing_items SET name=$1, price=$2, original_price=$3, features=$4,
        is_popular=$5, cta_text=$6, is_active=$7, sort_order=$8
       WHERE id = $9 RETURNING *`,
      [
        name ?? old.name,
        price ?? old.price,
        original_price ?? old.original_price,
        features ?? old.features,
        is_popular ?? old.is_popular,
        cta_text ?? old.cta_text,
        is_active ?? old.is_active,
        sort_order ?? old.sort_order,
        req.params.id,
      ],
    );
    res.json({
      success: true,
      message: "Pricing berhasil diupdate",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("updatePricing error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deletePricing = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      "DELETE FROM pricing_items WHERE id = $1 RETURNING id",
      [req.params.id],
    );
    if (result.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Pricing tidak ditemukan" });
      return;
    }
    res.json({ success: true, message: "Pricing berhasil dihapus" });
  } catch (err) {
    console.error("deletePricing error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// TESTIMONIALS
// ==========================================
export const getTestimonials = async (
  _req: Request,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      "SELECT * FROM testimonials ORDER BY sort_order ASC",
    );
    res.json({ success: true, message: "OK", data: result.rows });
  } catch (err) {
    console.error("getTestimonials error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const createTestimonial = async (
  req: Request<object, object, CreateTestimonialBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const {
      customer_name,
      content,
      rating,
      testimonial_date,
      is_active,
      sort_order,
    } = req.body;
    if (!customer_name || !content || rating === undefined) {
      res
        .status(400)
        .json({
          success: false,
          message: "customer_name, content, rating wajib diisi",
        });
      return;
    }
    const photo_url = req.file ? getFileUrl(req.file.filename) : null;
    const result = await query(
      `INSERT INTO testimonials (customer_name, customer_photo_url, content, rating, testimonial_date, is_active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        customer_name,
        photo_url,
        content,
        rating,
        testimonial_date ?? null,
        is_active ?? true,
        sort_order ?? 0,
      ],
    );
    res
      .status(201)
      .json({
        success: true,
        message: "Testimoni berhasil dibuat",
        data: result.rows[0],
      });
  } catch (err) {
    console.error("createTestimonial error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateTestimonial = async (
  req: Request<{ id: string }, object, UpdateTestimonialBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const existing = await query("SELECT * FROM testimonials WHERE id = $1", [
      req.params.id,
    ]);
    if (existing.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Testimoni tidak ditemukan" });
      return;
    }
    const old = existing.rows[0];
    const {
      customer_name,
      content,
      rating,
      testimonial_date,
      is_active,
      sort_order,
    } = req.body;

    let photo_url = old.customer_photo_url;
    if (req.file) {
      if (old.customer_photo_url) deleteFile(old.customer_photo_url);
      photo_url = getFileUrl(req.file.filename);
    }

    const result = await query(
      `UPDATE testimonials SET customer_name=$1, customer_photo_url=$2, content=$3,
        rating=$4, testimonial_date=$5, is_active=$6, sort_order=$7
       WHERE id = $8 RETURNING *`,
      [
        customer_name ?? old.customer_name,
        photo_url,
        content ?? old.content,
        rating ?? old.rating,
        testimonial_date ?? old.testimonial_date,
        is_active ?? old.is_active,
        sort_order ?? old.sort_order,
        req.params.id,
      ],
    );
    res.json({
      success: true,
      message: "Testimoni berhasil diupdate",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("updateTestimonial error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deleteTestimonial = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query(
      "DELETE FROM testimonials WHERE id = $1 RETURNING customer_photo_url",
      [req.params.id],
    );
    if (result.rowCount === 0) {
      res
        .status(404)
        .json({ success: false, message: "Testimoni tidak ditemukan" });
      return;
    }
    if (result.rows[0].customer_photo_url)
      deleteFile(result.rows[0].customer_photo_url);
    res.json({ success: true, message: "Testimoni berhasil dihapus" });
  } catch (err) {
    console.error("deleteTestimonial error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// FAQ
// ==========================================
export const getFAQs = async (
  _req: Request,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query("SELECT * FROM faqs ORDER BY sort_order ASC");
    res.json({ success: true, message: "OK", data: result.rows });
  } catch (err) {
    console.error("getFAQs error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const createFAQ = async (
  req: Request<object, object, CreateFAQBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const { question, answer, is_active, sort_order } = req.body;
    if (!question || !answer) {
      res
        .status(400)
        .json({ success: false, message: "question dan answer wajib diisi" });
      return;
    }
    const result = await query(
      `INSERT INTO faqs (question, answer, is_active, sort_order) VALUES ($1,$2,$3,$4) RETURNING *`,
      [question, answer, is_active ?? true, sort_order ?? 0],
    );
    res
      .status(201)
      .json({
        success: true,
        message: "FAQ berhasil dibuat",
        data: result.rows[0],
      });
  } catch (err) {
    console.error("createFAQ error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateFAQ = async (
  req: Request<{ id: string }, object, UpdateFAQBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const existing = await query("SELECT * FROM faqs WHERE id = $1", [
      req.params.id,
    ]);
    if (existing.rowCount === 0) {
      res.status(404).json({ success: false, message: "FAQ tidak ditemukan" });
      return;
    }
    const old = existing.rows[0];
    const { question, answer, is_active, sort_order } = req.body;
    const result = await query(
      `UPDATE faqs SET question=$1, answer=$2, is_active=$3, sort_order=$4
       WHERE id = $5 RETURNING *`,
      [
        question ?? old.question,
        answer ?? old.answer,
        is_active ?? old.is_active,
        sort_order ?? old.sort_order,
        req.params.id,
      ],
    );
    res.json({
      success: true,
      message: "FAQ berhasil diupdate",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("updateFAQ error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deleteFAQ = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const result = await query("DELETE FROM faqs WHERE id = $1 RETURNING id", [
      req.params.id,
    ]);
    if (result.rowCount === 0) {
      res.status(404).json({ success: false, message: "FAQ tidak ditemukan" });
      return;
    }
    res.json({ success: true, message: "FAQ berhasil dihapus" });
  } catch (err) {
    console.error("deleteFAQ error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==========================================
// CONTACT PERSON
// ==========================================
export const updateContactPerson = async (
  req: Request<object, object, UpdateContactPersonBody>,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const existing = await query("SELECT * FROM contact_person LIMIT 1");
    const old = existing.rows[0];
    const {
      name,
      whatsapp_number,
      email,
      cta_text,
      instagram_url,
      tiktok_url,
      is_active,
    } = req.body;

    let photo_url = old?.photo_url;
    if (req.file) {
      if (old?.photo_url) deleteFile(old.photo_url);
      photo_url = getFileUrl(req.file.filename);
    }

    let result;
    if (!old) {
      result = await query(
        `INSERT INTO contact_person (name, whatsapp_number, email, photo_url, cta_text, instagram_url, tiktok_url, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          name,
          whatsapp_number,
          email,
          photo_url,
          cta_text,
          instagram_url,
          tiktok_url,
          is_active ?? true,
        ],
      );
    } else {
      result = await query(
        `UPDATE contact_person SET name=$1, whatsapp_number=$2, email=$3, photo_url=$4,
          cta_text=$5, instagram_url=$6, tiktok_url=$7, is_active=$8
         WHERE id = $9 RETURNING *`,
        [
          name ?? old.name,
          whatsapp_number ?? old.whatsapp_number,
          email ?? old.email,
          photo_url,
          cta_text ?? old.cta_text,
          instagram_url ?? old.instagram_url,
          tiktok_url ?? old.tiktok_url,
          is_active ?? old.is_active,
          old.id,
        ],
      );
    }

    res.json({
      success: true,
      message: "Contact person berhasil diupdate",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("updateContactPerson error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
