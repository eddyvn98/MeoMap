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

  const type = String(source.contact_type || "");
  const value = cleanText(source.contact_value, 300);
  if (!CONTACT_TYPES.has(type) || !value) {
    throw badRequest("Thông tin liên hệ không hợp lệ.");
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
  if (user?.id === profile.id) return { ...profile };

  return {
    id: profile.id,
    display_name: profile.display_name || "",
    avatar_url: profile.avatar_url || null,
    phone: profile.phone || null,
    zalo: profile.zalo || null,
  };
}

export function publicPet(pet, includePrivateContact = false) {
  if (includePrivateContact) return { ...pet };
  const {
    contact_type,
    contact_value,
    bank_account_number,
    bank_account_name,
    bank_name,
    bank_qr_code_url,
    ...safe
  } = pet;
  void contact_type;
  void contact_value;
  void bank_account_number;
  void bank_account_name;
  void bank_name;
  void bank_qr_code_url;
  return safe;
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
