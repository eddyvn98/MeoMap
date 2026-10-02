import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { localApi } from '../localClient';

const defaultCenter = { lat: 10.8019, lng: 106.7147 };

// Haversine distance in km between two lat/lng points
function getDistanceKm(a, b) {
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

function ReportClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng);
    },
  });
  return null;
}

function MapBoundsWatcher({ onBoundsChange }) {
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

function MapInitializer({ setMap, setUserPos }) {
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

const makeCatIcon = (imageUrl) => {
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

const makeStatusIcon = (status, category, imageUrl, pet = {}, currentUserId = null) => {
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

  const isOwner = currentUserId && pet.owner_id === currentUserId;

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
      </div>
    `,
    iconSize: [112, 130],
    iconAnchor: [56, 130],
    popupAnchor: [0, -130],
  });
};

const tooltipTextByCategory = (cat) => {
  if (cat === "adopt") return "Nhận nuôi – liên hệ trực tiếp người đăng.";
  if (cat === "lost") return "Đi lạc – liên hệ trực tiếp nếu có thông tin.";
  if (cat === "rescue") return "Cứu hộ – nhận ca và hỗ trợ trực tiếp người cứu.";
  return "Bài đăng thú cưng";
};

export default forwardRef(function PetMap({
  pets = [],
  fullscreen = false,
  reportMode = false,
  onSelectPosition,
  onBoundsChange,
  selectedPetId,
  onSelectPet,
  height = 180,
  selectedPet,
  onSelectPetDetail,
}, ref) {
  const [userPos, setUserPos] = useState(null);
  const [center] = useState(defaultCenter);
  const [selectedPos, setSelectedPos] = useState(null);
  const [map, setMap] = useState(null);
  const [openPopupMarkerRef, setOpenPopupMarkerRef] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      const { data } = await localApi.auth.getUser();
      setCurrentUserId(data?.user?.id || null);
    };
    getUser();
  }, []);

  const renderPopover = (p) => {
    const petId = p.id || p.pet_id;
    const statusText = (p.category || p.status || "").toLowerCase();
    const statusLabel = statusText === 'lost' ? 'Lost' : statusText === 'adopt' ? 'Available' : statusText === 'adopted' ? 'Adopted' : p.status || 'Unknown';
    const badgeColor = statusText === 'lost' ? '#ef4444' : statusText === 'adopt' ? '#10b981' : statusText === 'adopted' ? '#3b82f6' : '#6b7280';
    const distanceKm = userPos ? getDistanceKm(userPos, { lat: p.lat, lng: p.lng }) : null;
    const distanceLabel = distanceKm ? `${distanceKm.toFixed(distanceKm >= 10 ? 0 : 1)} km` : '—';

    const actionLabel = statusText === 'lost' ? 'Report Found' : 'Adopt';

    return (
      <div style={{ width: 220 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', background: '#f3f4f6' }}>
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#9ca3af', fontSize: 12 }}>No image</div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name || 'Chưa đặt tên'}</div>
            <div style={{ margin: '4px 0', fontSize: 12, color: '#6b7280' }}>{p.district || p.area || 'Không rõ khu vực'}</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
              <span style={{ padding: '4px 8px', background: badgeColor, color: '#fff', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{statusLabel}</span>
              <span style={{ fontSize: 12, color: '#4b5563' }}>• {distanceLabel}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            style={{
              flex: 1,
              padding: '8px 10px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer'
            }}
            onClick={() => {
              onSelectPetDetail?.(p);
              // Close popup by closing any open popups
              if (openPopupMarkerRef) {
                openPopupMarkerRef.closePopup?.();
              }
            }}
          >
            Xem chi tiết
          </button>
          <button
            style={{
              flex: 1,
              padding: '8px 10px',
              background: statusText === 'lost' ? '#f59e0b' : '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer'
            }}
            onClick={() => onSelectPetDetail?.(p)}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    );
  };


  useImperativeHandle(ref, () => map);

  const handleSelectPos = (latlng) => {
    setSelectedPos(latlng);
    onSelectPosition && onSelectPosition(latlng);
  };

  useEffect(() => {
    if (!selectedPetId || !map) return;
    const pet = pets.find((p) => (p.id || p.pet_id) === selectedPetId);
    if (!pet || !pet.lat || !pet.lng) return;

    const targetZoom = Math.max(map.getZoom() || 13, 15);
    map.setView([pet.lat, pet.lng], targetZoom, { animate: true });
  }, [selectedPetId, pets, map]);

  const containerStyle = fullscreen
    ? { width: "100%", height: "calc(100vh - 120px)" }
    : typeof height === "string"
    ? { width: "100%", height }
    : { width: "100%", height: height || 180 };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 0,
        overflow: "hidden",
      }}
    >
      <MapContainer
        center={center}
        zoom={14}
        style={containerStyle}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap & CartoDB"
        />

        <MapInitializer setMap={setMap} setUserPos={setUserPos} />
        {onBoundsChange && <MapBoundsWatcher onBoundsChange={onBoundsChange} />}

        {userPos && (
          <>
            <Marker
              position={userPos}
              icon={L.icon({
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
                shadowSize: [41, 41],
              })}
            >
              <Popup>Đây là vị trí của bạn</Popup>
            </Marker>
            <Circle
              center={userPos}
              radius={500}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.15,
                weight: 2,
              }}
            />
          </>
        )}

        {pets.map((p) => {
          if (!p.lat || !p.lng) return null;

          const petId = p.id || p.pet_id;

          let markerIcon = makeStatusIcon(p.status, p.category, p.image_url, p, currentUserId);


          return (
            <Marker
              key={petId}
              position={[p.lat, p.lng]}
              icon={markerIcon}
              eventHandlers={{
                click: () => {
                  onSelectPet && onSelectPet(p);
                  onSelectPetDetail && onSelectPetDetail(p);
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={0.95} permanent={false}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  {tooltipTextByCategory((p.category || "").toLowerCase())}
                </div>
              </Tooltip>
              {badge && (
                <Popup>
                  <div style={{ fontWeight: 600, color: badge.color }}>
                    {badge.text}
                  </div>
                  {badge.sub && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>{badge.sub}</div>
                  )}
                </Popup>
              )}
            </Marker>
          );
        })}

        {reportMode && <ReportClickHandler onSelect={handleSelectPos} />}

        {reportMode && selectedPos && (
          <Marker
            position={selectedPos}
            icon={
              L.icon({
                iconUrl:
                  "https://cdn-icons-png.flaticon.com/512/220/220489.png",
                iconSize: [32, 32],
                iconAnchor: [16, 32],
              })
            }
          >
            <Popup>
              Vị trí báo mèo:
              <br />
              {selectedPos.lat.toFixed(5)}, {selectedPos.lng.toFixed(5)}
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
});
