export const EMPTY_REPORT_FORM = {
  name: "",
  category: "lost",
  description: "",
  photo: null,
  lat: null,
  lng: null,
  ward: "",
  street: "",
  houseNumber: "",
  contact: "",
  contactType: "phone",
};

export function roundReportCoordinate(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(number * 1000) / 1000;
}

export async function geocodeReportAddress(formData) {
  const query = [
    formData.houseNumber,
    formData.street,
    formData.ward,
    "Ho Chi Minh City, Vietnam",
  ]
    .filter(Boolean)
    .join(" ");

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
  );
  if (!response.ok) {
    throw new Error(`Geocoding failed with HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data?.length) return null;

  return {
    lat: roundReportCoordinate(data[0].lat),
    lng: roundReportCoordinate(data[0].lon),
  };
}
