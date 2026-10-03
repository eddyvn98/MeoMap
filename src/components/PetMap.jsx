import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Tooltip,
} from "react-leaflet";
import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { localApi } from "../localClient";
import {
  DEFAULT_CENTER,
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
  onSelectPetDetail,
}, ref) {
  const [userPos, setUserPos] = useState(null);
  const [center] = useState(DEFAULT_CENTER);
  const [selectedPos, setSelectedPos] = useState(null);
  const [map, setMap] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      const { data } = await localApi.auth.getUser();
      setCurrentUserId(data?.user?.id || null);
    };
    getUser();
  }, []);


  useImperativeHandle(ref, () => map);

  const handleSelectPos = (latlng) => {
    setSelectedPos(latlng);
    onSelectPosition && onSelectPosition(latlng);
  };

  useEffect(() => {
    if (!selectedPetId || !map) return;
    const pet = pets.find((p) => (p.id || p.pet_id) === selectedPetId);
    const lat = Number(pet?.lat);
    const lng = Number(pet?.lng);
    if (!pet || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const targetZoom = Math.max(map.getZoom() || 13, 15);
    map.setView([lat, lng], targetZoom, { animate: true });
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
          const lat = Number(p.lat);
          const lng = Number(p.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

          const petId = p.id || p.pet_id;
          const markerIcon = makeStatusIcon(
            p.status,
            p.category,
            p.image_url,
            p,
            currentUserId,
          );

          return (
            <Marker
              key={petId}
              position={[lat, lng]}
              icon={markerIcon}
              eventHandlers={{
                click: () => {
                  onSelectPet?.(petId);
                  onSelectPetDetail?.(p);
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
