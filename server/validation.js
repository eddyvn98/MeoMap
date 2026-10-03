const PET_CATEGORIES = new Set(["lost", "adopt", "rescue"]);
const PET_STATUSES = new Set([
  "available",
  "pending",
  "in_contact",
  "closed",
  "delivered",
  "completed",
  "Lost",
  "Found",
  "Abandoned",
]);
const CONTACT_TYPES = new Set(["phone", "facebook", "email"]);

export const OWNER_PET_UPDATE_FIELDS = new Set([
  "name",
  "description",
  "category",
  "district",
  "image_url",
  "animal",
  "color",
  "status",
  "contact_type",
  "contact_value",
]);
export const RESCUER_SUPPORT_FIELDS = new Set([
  "bank_account_number",
  "bank_account_name",
  "bank_name",
  "bank_qr_code_url",
]);

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

export function cleanText(value, max = 500) {
  if (value == null) return null;
  return String(value).trim().slice(0, max);
}

export function cleanPublicUrl(value) {
  const text = cleanText(value, 1200);
  if (!text) return null;
  if (text.startsWith("/uploads/")) return text;

  try {
    const parsed = new URL(text);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    // Invalid URLs are rejected below.
  }
  throw badRequest("URL không hợp lệ.");
}

function safeStoredUrl(value) {
  try {
    return cleanPublicUrl(value);
  } catch {
    return null;
  }
}

function validateCategory(value) {
  const category = String(value || "lost");
  if (!PET_CATEGORIES.has(category)) {
    throw badRequest("Loại bài đăng không hợp lệ.");
  }
  return category;
}

function validateStatus(value) {
  const status = String(value || "available");
  if (!PET_STATUSES.has(status)) {
    throw badRequest("Trạng thái bài đăng không hợp lệ.");
  }
  return status;
}

function validateCoordinates(item) {
  if (!("lat" in item) && !("lng" in item)) return;
  const lat = Number(item.lat);
  const lng = Number(item.lng);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    throw badRequest("Tọa độ không hợp lệ.");
  }
  item.lat = lat;
  item.lng = lng;
}

function applyPetTextFields(target, source) {
  if ("name" in source) target.name = cleanText(source.name, 100) || "Chưa đặt tên";
  if ("description" in source) target.description = cleanText(source.description, 4000);
  if ("district" in source) target.district = cleanText(source.district, 120);
  if ("animal" in source) target.animal = cleanText(source.animal, 40);
  if ("color" in source) target.color = cleanText(source.color, 40);
  if ("image_url" in source) target.image_url = cleanPublicUrl(source.image_url);
}

function applyContactFields(target, source) {
  if (!("contact_type" in source) && !("contact_value" in source)) return;

  const type = String(source.contact_type || "").trim();
  let value = cleanText(source.contact_value, 300);
  if (!type && !value) {
    target.contact_type = null;
    target.contact_value = null;
    return;
  }
  if (!CONTACT_TYPES.has(type) || !value) {
    throw badRequest("Thông tin liên hệ không hợp lệ.");
  }

  if (type === "phone") {
    if (!/^[0-9+().\s-]{6,40}$/.test(value)) {
      throw badRequest("Số điện thoại không hợp lệ.");
    }
  } else if (type === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 254) {
      throw badRequest("Email liên hệ không hợp lệ.");
    }
    value = value.toLowerCase();
  } else {
    if (/^https?:\/\//i.test(value)) {
      value = cleanPublicUrl(value);
      if (!/^https?:\/\/(www\.)?(facebook\.com|fb\.com)\//i.test(value)) {
        throw badRequest("Liên kết Facebook không hợp lệ.");
      }
    } else {
      const username = value
        .replace(/^@/, "")
        .replace(/^(www\.)?(facebook\.com|fb\.com)\//i, "")
        .replace(/\/+$/, "");
      if (!/^[A-Za-z0-9._-]{2,100}$/.test(username)) {
        throw badRequest("Facebook ID không hợp lệ.");
      }
      value = `https://facebook.com/${username}`;
    }
  }

  target.contact_type = type;
  target.contact_value = value;
}

export function sanitizePetInsert(raw = {}) {
  const item = {};
  applyPetTextFields(item, raw);
  item.name = item.name || "Chưa đặt tên";
  item.category = validateCategory(raw.category);
  item.status = validateStatus(raw.status);
  if ("lat" in raw) item.lat = raw.lat;
  if ("lng" in raw) item.lng = raw.lng;
  validateCoordinates(item);
  applyContactFields(item, raw);
  return item;
}

export function sanitizePetUpdate(raw = {}) {
  const allowed = new Set([
    ...OWNER_PET_UPDATE_FIELDS,
    ...RESCUER_SUPPORT_FIELDS,
    "rescuer_id",
  ]);
  for (const key of Object.keys(raw)) {
    if (key === "updated_at") continue;
    if (!allowed.has(key)) throw badRequest(`Không được cập nhật trường ${key}.`);
  }

  const next = {};
  applyPetTextFields(next, raw);
  applyContactFields(next, raw);
  if ("category" in raw) next.category = validateCategory(raw.category);
  if ("status" in raw) next.status = validateStatus(raw.status);
  if ("rescuer_id" in raw) next.rescuer_id = raw.rescuer_id;

  for (const key of RESCUER_SUPPORT_FIELDS) {
    if (!(key in raw)) continue;
    next[key] =
      key === "bank_qr_code_url"
        ? cleanPublicUrl(raw[key])
        : cleanText(raw[key], key === "bank_account_number" ? 64 : 120);
  }
  return next;
}

export function sanitizeProfileInput(raw = {}) {
  const result = {};
  if ("display_name" in raw) result.display_name = cleanText(raw.display_name, 100);
  if ("avatar_url" in raw) result.avatar_url = cleanPublicUrl(raw.avatar_url);
  if ("phone" in raw) result.phone = cleanText(raw.phone, 40);
  if ("zalo" in raw) result.zalo = cleanText(raw.zalo, 120);
  return result;
}

function cleanUrlArray(value) {
  if (!Array.isArray(value)) return [];
  if (value.length > 8) throw badRequest("Quá nhiều liên kết media.");
  return value.map((item) => cleanPublicUrl(item)).filter(Boolean);
}

export function sanitizeRescueRecord(table, raw = {}) {
  const item = {
    case_id: cleanText(raw.case_id, 80),
    title: cleanText(raw.title, 160) || (table === "rescue_appeals" ? "Kêu gọi hỗ trợ" : "Cập nhật"),
    content: cleanText(raw.content, 5000),
  };
  if (!item.case_id) throw badRequest("Thiếu case_id.");

  if (table === "rescue_appeals") {
    item.status = raw.status === "closed" ? "closed" : "active";
  } else {
    const cost = Number(raw.spent_cost || 0);
    if (!Number.isFinite(cost) || cost < 0 || cost > 1_000_000_000) {
      throw badRequest("Chi phí không hợp lệ.");
    }
    item.spent_cost = cost;
    item.image_urls = cleanUrlArray(raw.image_urls);
    item.video_urls = cleanUrlArray(raw.video_urls);
  }
  return item;
}

export function publicProfile(profile, user) {
  if (!profile) return null;

  const safe = {
    id: profile.id,
    display_name: cleanText(profile.display_name, 100) || "",
    avatar_url: safeStoredUrl(profile.avatar_url),
    phone: cleanText(profile.phone, 40),
    zalo: cleanText(profile.zalo, 120),
  };

  if (user?.id === profile.id) {
    safe.email = user.email;
    safe.role = profile.role || "user";
    safe.created_at = profile.created_at;
    safe.updated_at = profile.updated_at;
  }
  return safe;
}

export function publicPet(pet, includePrivateContact = false) {
  const safe = {
    id: pet.id,
    owner_id: pet.owner_id,
    name: pet.name,
    category: pet.category,
    status: pet.status,
    district: pet.district ?? null,
    description: pet.description ?? null,
    lat: pet.lat ?? null,
    lng: pet.lng ?? null,
    image_url: safeStoredUrl(pet.image_url),
    animal: pet.animal ?? null,
    color: pet.color ?? null,
    rescuer_id: pet.rescuer_id ?? null,
    created_at: pet.created_at,
    updated_at: pet.updated_at,
    completed_at: pet.completed_at ?? null,
  };

  if (includePrivateContact) {
    const contact = {};
    try {
      applyContactFields(contact, {
        contact_type: pet.contact_type,
        contact_value: pet.contact_value,
      });
    } catch {
      contact.contact_type = null;
      contact.contact_value = null;
    }

    safe.contact_type = contact.contact_type ?? null;
    safe.contact_value = contact.contact_value ?? null;
    safe.bank_account_number = cleanText(pet.bank_account_number, 64);
    safe.bank_account_name = cleanText(pet.bank_account_name, 120);
    safe.bank_name = cleanText(pet.bank_name, 120);
    safe.bank_qr_code_url = safeStoredUrl(pet.bank_qr_code_url);
  }
  return safe;
}

export function publicRescueRecord(table, row) {
  const base = {
    id: row.id,
    case_id: row.case_id,
    rescuer_id: row.rescuer_id,
    title: row.title,
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  if (table === "rescue_appeals") {
    return { ...base, status: row.status || "active" };
  }

  const safeUrls = (value) =>
    Array.isArray(value)
      ? value.map(safeStoredUrl).filter(Boolean)
      : [];

  return {
    ...base,
    spent_cost: Number(row.spent_cost || 0),
    image_urls: safeUrls(row.image_urls),
    video_urls: safeUrls(row.video_urls),
  };
}

export function assertProfileSelectAllowed(filters) {
  const idFilter = (filters || []).find(
    (filter) =>
      filter.op === "eq" &&
      filter.column === "id" &&
      typeof filter.value === "string",
  );
  if (!idFilter) {
    throw Object.assign(
      new Error("Profile query requires an id filter."),
      { status: 403 },
    );
  }
}
