import {
  cleanPublicUrl,
  cleanText,
  sanitizeContactFields,
} from "./validation.js";

function safeStoredUrl(value) {
  try {
    return cleanPublicUrl(value);
  } catch {
    return null;
  }
}

function safeCoordinate(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max
    ? number
    : null;
}

export function publicProfile(profile, user) {
  if (!profile) return null;

  const safe = {
    id: cleanText(profile.id, 80),
    display_name: cleanText(profile.display_name, 100) || "",
    avatar_url: safeStoredUrl(profile.avatar_url),
    phone: cleanText(profile.phone, 40),
    zalo: cleanText(profile.zalo, 120),
  };

  if (user?.id === profile.id) {
    safe.email = user.email;
    safe.role = cleanText(profile.role, 40) || "user";
    safe.created_at = cleanText(profile.created_at, 40);
    safe.updated_at = cleanText(profile.updated_at, 40);
  }
  return safe;
}

export function publicPet(pet, includePrivateContact = false) {
  const safe = {
    id: cleanText(pet.id, 80),
    owner_id: cleanText(pet.owner_id, 80),
    name: cleanText(pet.name, 100) || "Chưa đặt tên",
    category: cleanText(pet.category, 40) || "lost",
    status: cleanText(pet.status, 40) || "available",
    district: cleanText(pet.district, 120),
    description: cleanText(pet.description, 4000),
    lat: safeCoordinate(pet.lat, -90, 90),
    lng: safeCoordinate(pet.lng, -180, 180),
    image_url: safeStoredUrl(pet.image_url),
    animal: cleanText(pet.animal, 40),
    color: cleanText(pet.color, 40),
    rescuer_id: cleanText(pet.rescuer_id, 80),
    created_at: cleanText(pet.created_at, 40),
    updated_at: cleanText(pet.updated_at, 40),
    completed_at: cleanText(pet.completed_at, 40),
  };

  if (includePrivateContact) {
    const contact = {};
    try {
      sanitizeContactFields(contact, {
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
    id: cleanText(row.id, 80),
    case_id: cleanText(row.case_id, 80),
    rescuer_id: cleanText(row.rescuer_id, 80),
    title: cleanText(row.title, 160) || "Cập nhật",
    content: cleanText(row.content, 5000),
    created_at: cleanText(row.created_at, 40),
    updated_at: cleanText(row.updated_at, 40),
  };

  if (table === "rescue_appeals") {
    return {
      ...base,
      status: row.status === "closed" ? "closed" : "active",
    };
  }

  const safeUrls = (value) =>
    Array.isArray(value)
      ? value.slice(0, 8).map(safeStoredUrl).filter(Boolean)
      : [];

  const spentCost = Number(row.spent_cost || 0);
  return {
    ...base,
    spent_cost:
      Number.isFinite(spentCost) && spentCost >= 0 ? spentCost : 0,
    image_urls: safeUrls(row.image_urls),
    video_urls: safeUrls(row.video_urls),
  };
}
