import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { supabase } from '../supabaseClient';

const defaultCenter = { lat: 10.8019, lng: 106.7147 };

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

const makeStatusIcon = (status, category, imageUrl) => {
  const cat = (category || "lost").toLowerCase();
  
  let badgeColor, badgeText;
  if (cat === "lost") {
    badgeColor = "#ef4444";
    badgeText = "Lost";
  } else if (cat === "adopt") {
    badgeColor = "#10b981";
    badgeText = "Adopt";
  } else if (cat === "rescue") {
    badgeColor = "#f59e0b";
    badgeText = "Rescue";
  } else {
    badgeColor = "#3b82f6";
    badgeText = status || "Unknown";
  }

  const imgSrc = imageUrl || "https://cdn-icons-png.flaticon.com/512/2127/2127645.png";

  return L.divIcon({
    className: "pet-marker-icon",
    html: `
      <div style="position:relative;width:56px;height:56px;">
        <div style="width:56px;height:56px;border-radius:50%;overflow:hidden;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.2);background:#fff;">
          <img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;" />
        </div>
        <div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);background:${badgeColor};color:#fff;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);">
          ${badgeText}
        </div>
      </div>
    `,
    iconSize: [56, 70],
    iconAnchor: [28, 70],
    popupAnchor: [0, -70],
  });
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
  const [adoptRequests, setAdoptRequests] = useState({});

  useEffect(() => {
    if (!pets || pets.length === 0) return;
    const adoptPets = pets.filter(p => p.category === 'adopt');
    if (adoptPets.length === 0) return;

    const load = async () => {
      const { data, error } = await supabase
        .from('adoption_requests')
        .select('pet_id, status, receiver_confirmed_checkin, checkin_required_at')
        .in('pet_id', adoptPets.map(p => p.id || p.pet_id))
        .eq('status', 'delivered');

      if (error) { console.error(error); return; }
      const map = {};
      (data || []).forEach(r => {
        map[r.pet_id] = r;
      });
      setAdoptRequests(map);
    };
    load();
  }, [pets]);

  const computeBadge = (request) => {
    if (!request) return null;
    const due = request.checkin_required_at ? new Date(request.checkin_required_at) : null;
    const now = new Date();
    if (due && now > due) return { label: '🟥', bg: '#fee2e2' };
    if (request.receiver_confirmed_checkin) return { label: '🟨', bg: '#fef3c7' };
    return { label: '🟧', bg: '#fef3c7' };
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
          attribution='Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png"
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

        {console.log("Rendering map with", pets.length, "pets")}
        {pets.map((p) => {
          if (!p.lat || !p.lng) return null;

          const petId = p.id || p.pet_id;
          console.log("Map marker:", { name: p.name, id: p.id, pet_id: p.pet_id, petId });

          const req = adoptRequests[petId];
          const badge = req ? computeBadge(req) : null;

          let markerIcon = makeStatusIcon(p.status, p.category, p.image_url);

          // If adopt pet with follow-up badge, overlay badge on marker
          if (badge) {
            const imgSrc = p.image_url || "https://cdn-icons-png.flaticon.com/512/2127/2127645.png";
            markerIcon = L.divIcon({
              className: "pet-marker-icon",
              html: `
                <div style="position:relative;width:56px;height:56px;">
                  <div style="width:56px;height:56px;border-radius:50%;overflow:hidden;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.2);background:#fff;">
                    <img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;" />
                  </div>
                  <div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);">
                    Adopt
                  </div>
                  <div style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:${badge.bg};display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">
                    ${badge.label}
                  </div>
                </div>
              `,
              iconSize: [56, 70],
              iconAnchor: [28, 70],
              popupAnchor: [0, -70],
            });
          }

          return (
            <Marker
              key={petId}
              position={[p.lat, p.lng]}
              icon={markerIcon}
              eventHandlers={{
                click: () => {
                  onSelectPetDetail?.(p);
                },
              }}
            >
              <Popup>
                <div style={{ maxWidth: 200 }}>
                  {p.image_url && (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        marginBottom: 8,
                      }}
                    />
                  )}
                  <strong>{p.name}</strong>
                  <br />
                  <span>{p.status}</span>
                  <br />
                  <small>{p.district}</small>
                </div>
              </Popup>
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
