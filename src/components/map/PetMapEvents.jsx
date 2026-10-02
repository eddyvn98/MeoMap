import { useEffect } from "react";
import { useMapEvents } from "react-leaflet";

export function ReportClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng);
    },
  });
  return null;
}

export function MapBoundsWatcher({ onBoundsChange }) {
  const map = useMapEvents({
    moveend() {
      const bounds = map.getBounds();
      onBoundsChange?.({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    },
  });

  useEffect(() => {
    if (!onBoundsChange) return;
    const bounds = map.getBounds();
    onBoundsChange({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
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
      (position) => {
        const userPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserPos(userPosition);
        map.setView([userPosition.lat, userPosition.lng], 15);
      },
      (error) => {
        console.warn("Geolocation error:", error.message);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [map, setMap, setUserPos]);

  return null;
}
