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
  const data = await response.json();

  if (!data?.length) return null;

  return {
    lat: Math.round(Number(data[0].lat) * 100) / 100,
    lng: Math.round(Number(data[0].lon) * 100) / 100,
  };
}
