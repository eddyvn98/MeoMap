import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const defaultCenter = { lat: 10.8019, lng: 106.7147 };

function ReportClickHandler({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng);
    },
  });
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

export default function PetMap({
  pets = [],
  fullscreen = false,
  reportMode = false,
  onSelectPosition,
}) {
  const [userPos, setUserPos] = useState(null);
  const [center, setCenter] = useState(defaultCenter);
  const [selectedPos, setSelectedPos] = useState(null);
  const [map, setMap] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(p);
        setCenter(p);
        if (map) {
          map.setView([p.lat, p.lng], 15);
        }
      },
      () => {},
      { enableHighAccuracy: true }
    );
  }, [map]);

  const handleSelectPos = (latlng) => {
    setSelectedPos(latlng);
    onSelectPosition && onSelectPosition(latlng);
  };

  const containerStyle = fullscreen
    ? { width: "100%", height: "calc(100vh - 120px)" }
    : { width: "100%", height: 180 };

  return (
    <div
      style={{
        width: "100%",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 20,
      }}
    >
      <MapContainer
        center={center}
        zoom={14}
        style={containerStyle}
        scrollWheelZoom={true}
        whenCreated={setMap}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userPos && (
          <Circle
            center={userPos}
            radius={500}
            pathOptions={{
              color: "#007bff",
              fillColor: "#007bff",
              fillOpacity: 0.2,
            }}
          />
        )}

        {pets.map((p) => {
          if (!p.lat || !p.lng) return null;

          const petId = p.id || p.pet_id;
          console.log("Map marker:", { name: p.name, id: p.id, pet_id: p.pet_id, petId });

          return (
            <Marker
              key={petId}
              position={[p.lat, p.lng]}
              icon={makeCatIcon(p.image_url)}
              eventHandlers={{
                click: () => navigate(`/pet/${petId}`),
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
}
