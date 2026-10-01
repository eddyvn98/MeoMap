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
import { supabase } from '../supabaseClient';
import {
  defaultCenter,
  ReportClickHandler,
  MapBoundsWatcher,
  MapInitializer,
  makeStatusIcon,
  tooltipTextByCategory,
} from "./PetMapHelpers";

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
  const [openPopupMarkerRef, setOpenPopupMarkerRef] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data?.user?.id || null);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!pets || pets.length === 0) return;
    const adoptPets = pets.filter(p => p.category === 'adopt');
    if (adoptPets.length === 0) return;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('adoption_requests')
          .select('pet_id, status, receiver_confirmed_checkin, checkin_required_at')
          .in('pet_id', adoptPets.map(p => p.id || p.pet_id))
          .in('status', ['delivered', 'completed']);

        // If table doesn't exist (404 PGRST205), silently skip
        if (error) {
          if (error.code === 'PGRST205') {
            console.warn('[PetMap] adoption_requests table not found; skipping badge load');
            return;
          }
          console.error('[PetMap] Error loading adoption requests:', error);
          return;
        }

        const map = {};
        (data || []).forEach(r => {
          map[r.pet_id] = r;
        });
        setAdoptRequests(map);
      } catch (err) {
        console.warn('[PetMap] Exception loading adoptions:', err.message);
      }
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

          // Ẩn pet adopt nếu đã có người nhận (delivered/completed)
          const req = adoptRequests[petId];
          if (p.category === 'adopt' && req && (req.status === 'delivered' || req.status === 'completed')) {
            return null; // Không hiển thị pet này trên map
          }

          const badge = req ? computeBadge(req) : null;

          let markerIcon = makeStatusIcon(p.status, p.category, p.image_url, p, currentUserId);

          // If adopt pet with follow-up badge, overlay badge on marker
          if (badge) {
            const imgSrc = p.image_url || "https://cdn-icons-png.flaticon.com/512/2127/2127645.png";
            const isOwner = currentUserId && p.owner_id === currentUserId;
            const ownerBadge = isOwner ? '<div style="position:absolute;top:-8px;left:-8px;width:24px;height:24px;border-radius:50%;background:#8b5cf6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.4);">👤</div>' : '';
            
            markerIcon = L.divIcon({
              className: "pet-marker-icon",
              html: `
                <div style="position:relative;width:80px;height:80px;">
                  <div style="width:80px;height:80px;border-radius:50%;overflow:hidden;border:5px solid #10b981;box-shadow:0 4px 12px rgba(0,0,0,0.3);background:#fff;">
                    <img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;" />
                  </div>
                  <div style="position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;padding:4px 12px;border-radius:14px;font-size:11px;font-weight:bold;white-space:nowrap;box-shadow:0 3px 6px rgba(0,0,0,0.4);">
                    Adopt
                  </div>
                  <div style="position:absolute;top:-6px;right:-6px;width:24px;height:24px;border-radius:50%;background:${badge.bg};display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">
                    ${badge.label}
                  </div>
                  ${ownerBadge}
                </div>
              `,
              iconSize: [112, 130],
              iconAnchor: [56, 130],
              popupAnchor: [0, -130],
            });
          }

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
