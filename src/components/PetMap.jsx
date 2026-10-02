import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { localApi } from "../localClient";
import {
  DEFAULT_CENTER,
  getDistanceKm,
  makeStatusIcon,
  tooltipTextByCategory,
} from "./map/petMapHelpers";
import {
  MapBoundsWatcher,
  MapInitializer,
  ReportClickHandler,
} from "./map/PetMapEvents";

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
  const [center] = useState(DEFAULT_CENTER);
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
