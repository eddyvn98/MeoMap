import { useEffect } from "react";
import { useMapEvents } from "react-leaflet";
import L from "leaflet";

export const defaultCenter = { lat: 10.8019, lng: 106.7147 };

// Haversine distance in km between two lat/lng points
export function getDistanceKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const aCalc = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(aCalc), Math.sqrt(1 - aCalc));
  return R * c;
}

export function ReportClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng);
    },
  });
  return null;
}

export function MapBoundsWatcher({ onBoundsChange }) {
  const map = useMapEvents({
    moveend() {
      const b = map.getBounds();
      onBoundsChange?.({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    },
  });

  useEffect(() => {
    if (!onBoundsChange) return;
    const b = map.getBounds();
    onBoundsChange({
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    });
  }, [map, onBoundsChange]);

  return null;
}

export function MapInitializer({ setMap, setUserPos }) {
  const map = useMapEvents({});

  useEffect(() => {
    setMap(map);

    if (!navigator.geolocation) {
      console.warn("Geolocation không khả dụng");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        console.log("Got user position:", p);
        setUserPos(p);
        map.setView([p.lat, p.lng], 15);
      },
      (err) => {
        console.warn("Geolocation error:", err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [map, setMap, setUserPos]);

  return null;
}

export const makeCatIcon = (imageUrl) => {
  // Nếu không có ảnh -> dùng icon mặc định của Leaflet
  if (typeof imageUrl !== "string" || !imageUrl.startsWith("http")) {
    return L.icon({
      iconUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      shadowSize: [41, 41],
    });
  }

  return L.icon({
    iconUrl: imageUrl,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
    className: "pet-marker-icon",
  });
};

export const makeStatusIcon = (status, category, imageUrl, pet = {}, currentUserId = null) => {
  const cat = (category || "lost").toLowerCase();
  const isDelivered = status === "delivered";
  
  let badgeColor, badgeText, borderColor;
  if (cat === "lost") {
    // Delivered pets show as green with checkmark
    if (isDelivered) {
      badgeColor = "#10b981";
      borderColor = "#10b981";
      badgeText = "✓ Found";
    } else {
      badgeColor = "#ef4444";
      borderColor = "#ef4444";
      badgeText = "Lost";
    }
  } else if (cat === "adopt") {
    badgeColor = "#10b981";
    borderColor = "#10b981";
    badgeText = "Adopt";
  } else if (cat === "rescue") {
    badgeColor = "#f59e0b";
    borderColor = "#f59e0b";
    badgeText = "Rescue";
  } else {
    badgeColor = "#3b82f6";
    borderColor = "#3b82f6";
    badgeText = status || "Unknown";
  }

  const imgSrc = imageUrl || "https://cdn-icons-png.flaticon.com/512/2127/2127645.png";

  // Check for deposit/bounty
  const hasDeposit = pet.required_deposit && pet.required_deposit > 0;
  const hasBounty = pet.bounty_amount && pet.bounty_amount > 0;
  const isOwner = currentUserId && pet.owner_id === currentUserId;
  
  // Format money (100000 -> 100k)
  const formatMoney = (amount) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}tr`;
    if (amount >= 1000) return `${Math.floor(amount / 1000)}k`;
    return amount;
  };
  
  // Money badge with amount text and pulsing animation
  // Note: All users can see bounty amounts on lost/rescue posts
  let moneyBadge = '';
  if (cat === 'lost' && hasBounty) {
    moneyBadge = `<div style="position:absolute;top:-8px;right:-8px;background:#fbbf24;color:#fff;padding:2px 6px;border-radius:10px;font-size:9px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.4);white-space:nowrap;animation:pulse-money 2s infinite;">🎁 ${formatMoney(pet.bounty_amount)}</div>`;
  } else if (cat === 'rescue' && hasBounty) {
    console.log('🔥 Rescue with bounty:', { category: cat, bountyAmount: pet.bounty_amount, hasBounty });
    moneyBadge = `<div style="position:absolute;top:-8px;right:-8px;background:#ef4444;color:#fff;padding:2px 6px;border-radius:10px;font-size:9px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.4);white-space:nowrap;animation:pulse-money 2s infinite;">🔥 ${formatMoney(pet.bounty_amount)}</div>`;
  } else if (cat === 'rescue') {
    console.log('🟠 Rescue WITHOUT bounty:', { category: cat, bountyAmount: pet.bounty_amount, hasBounty });
  }
  // Removed deposit badge for adopt category (internal info only)

  // Owner badge - show "OWNER" text instead of icon
  const ownerBadge = isOwner ? '<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#8b5cf6;color:#fff;padding:3px 10px;border-radius:12px;font-size:9px;font-weight:bold;box-shadow:0 3px 8px rgba(0,0,0,0.5);white-space:nowrap;letter-spacing:0.5px;">OWNER</div>' : '';

  return L.divIcon({
    className: "pet-marker-icon",
    html: `
      <div style="position:relative;width:80px;height:80px;">
        <div style="width:80px;height:80px;border-radius:50%;overflow:hidden;border:5px solid ${borderColor};box-shadow:0 4px 12px rgba(0,0,0,0.3);background:#fff;">
          <img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;" />
        </div>
        <div style="position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);background:${badgeColor};color:#fff;padding:4px 12px;border-radius:14px;font-size:11px;font-weight:bold;white-space:nowrap;box-shadow:0 3px 6px rgba(0,0,0,0.4);">
          ${badgeText}
        </div>
        ${ownerBadge}
        ${moneyBadge}
      </div>
    `,
    iconSize: [112, 130],
    iconAnchor: [56, 130],
    popupAnchor: [0, -130],
  });
};

export const tooltipTextByCategory = (cat) => {
  if (cat === "adopt") return "Nhận nuôi miễn phí, có cọc đảm bảo an toàn.";
  if (cat === "lost") return "Mèo đi lạc – báo tin để nhận thưởng.";
  if (cat === "rescue") return "Cứu hộ – mọi người cùng hỗ trợ.";
  return "Bài đăng thú cưng";
};
