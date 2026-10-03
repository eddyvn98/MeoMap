const PET_CATEGORIES = new Set(["lost", "adopt", "rescue"]);
const PET_STATUSES = new Set(["available", "closed", "delivered", "completed", "Lost", "Found", "Abandoned"]);

function cleanText(value, max = 500) {
  if (value == null) return value;
  return String(value).trim().slice(0, max);
}

export function validatePetInsert(item) {
  if (!PET_CATEGORIES.has(item.category)) {
    throw Object.assign(new Error("Loại bài đăng không hợp lệ."), { status: 400 });
  }
  if (!PET_STATUSES.has(item.status)) {
    throw Object.assign(new Error("Trạng thái bài đăng không hợp lệ."), { status: 400 });
  }

  item.name = cleanText(item.name, 100) || "Chưa đặt tên";
  if ("description" in item) item.description = cleanText(item.description, 4000);
  if ("district" in item) item.district = cleanText(item.district, 120);

  if ("lat" in item || "lng" in item) {
    const lat = Number(item.lat);
    const lng = Number(item.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw Object.assign(new Error("Tọa độ không hợp lệ."), { status: 400 });
    }
    item.lat = lat;
    item.lng = lng;
  }

  return item;
}

export function validatePetUpdate(payload) {
  const next = { ...(payload || {}) };
  if ("category" in next && !PET_CATEGORIES.has(next.category)) {
    throw Object.assign(new Error("Loại bài đăng không hợp lệ."), { status: 400 });
  }
  if ("status" in next && !PET_STATUSES.has(next.status)) {
    throw Object.assign(new Error("Trạng thái bài đăng không hợp lệ."), { status: 400 });
  }
  if ("name" in next) next.name = cleanText(next.name, 100);
  if ("description" in next) next.description = cleanText(next.description, 4000);
  if ("district" in next) next.district = cleanText(next.district, 120);
  return next;
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
    role: profile.role || "user",
  };
}

export function assertProfileSelectAllowed(filters, user) {
  const idFilter = (filters || []).find(
    (filter) => filter.op === "eq" && filter.column === "id" && typeof filter.value === "string",
  );
  if (!idFilter) {
    throw Object.assign(new Error("Profile query requires an id filter."), { status: 403 });
  }
  if (user?.id && idFilter.value === user.id) return;
}
