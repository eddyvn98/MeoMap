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
    Array.isArray(value) ? value.map(safeStoredUrl).filter(Boolean) : [];

  return {
    ...base,
    spent_cost: Number(row.spent_cost || 0),
    image_urls: safeUrls(row.image_urls),
    video_urls: safeUrls(row.video_urls),
  };
}
