import L from "leaflet";
import { isClosedStatus } from "../../utils/petStatus";

export const DEFAULT_CENTER = { lat: 10.8019, lng: 106.7147 };

export function getDistanceKm(a, b) {
  if (!a || !b) return null;
  const radiusKm = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const value =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const arc = 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  return radiusKm * arc;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function makeStatusIcon(
  status,
  category,
  imageUrl,
  pet = {},
  currentUserId = null,
) {
  const cat = String(category || "lost").toLowerCase();
  const closed = isClosedStatus(status);
  let badgeColor = "#3b82f6";
  let badgeText = closed ? "Closed" : String(status || "Unknown");

  if (cat === "lost") {
    badgeColor = closed ? "#10b981" : "#ef4444";
    badgeText = closed ? "✓ Found" : "Lost";
  } else if (cat === "adopt") {
    badgeColor = closed ? "#6b7280" : "#10b981";
    badgeText = closed ? "Closed" : "Adopt";
  } else if (cat === "rescue") {
    badgeColor = closed ? "#6b7280" : "#f59e0b";
    badgeText = closed ? "Closed" : "Rescue";
  }

  const imgSrc = escapeHtml(
    imageUrl ||
      "https://cdn-icons-png.flaticon.com/512/2127/2127645.png",
  );
  const safeBadgeText = escapeHtml(badgeText);
  const isOwner = !!currentUserId && pet.owner_id === currentUserId;
  const ownerBadge = isOwner
    ? '<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#8b5cf6;color:#fff;padding:3px 10px;border-radius:12px;font-size:9px;font-weight:bold;box-shadow:0 3px 8px rgba(0,0,0,0.5);white-space:nowrap;letter-spacing:0.5px;">OWNER</div>'
    : "";

  return L.divIcon({
    className: "pet-marker-icon",
    html: `
      <div style="position:relative;width:80px;height:80px;">
        <div style="width:80px;height:80px;border-radius:50%;overflow:hidden;border:5px solid ${badgeColor};box-shadow:0 4px 12px rgba(0,0,0,0.3);background:#fff;">
          <img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;" />
        </div>
        <div style="position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);background:${badgeColor};color:#fff;padding:4px 12px;border-radius:14px;font-size:11px;font-weight:bold;white-space:nowrap;box-shadow:0 3px 6px rgba(0,0,0,0.4);">
          ${safeBadgeText}
        </div>
        ${ownerBadge}
      </div>
    `,
    iconSize: [112, 130],
    iconAnchor: [56, 130],
    popupAnchor: [0, -130],
  });
}

export function tooltipTextByCategory(category) {
  if (category === "adopt") {
    return "Nhận nuôi – liên hệ trực tiếp người đăng.";
  }
  if (category === "lost") {
    return "Đi lạc – liên hệ trực tiếp nếu có thông tin.";
  }
  if (category === "rescue") {
    return "Cứu hộ – nhận ca và hỗ trợ trực tiếp người cứu.";
  }
  return "Bài đăng thú cưng";
}
