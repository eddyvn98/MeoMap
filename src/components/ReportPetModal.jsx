import React, { useState, useRef, useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import Tooltip from "./Tooltip";

const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onLocationSelect([lat, lng]);
    },
  });
  return null;
};

const ReportPetModal = ({ isOpen, mapRef, onClose, onSubmit }) => {
  const [locationMode, setLocationMode] = useState("auto"); // "auto" | "map" | "manual" | "pin-map"
  const [isPinningMode, setIsPinningMode] = useState(false); // true when pinning on main map
  const [wasOpenBeforePinning, setWasOpenBeforePinning] = useState(false); // Save isOpen state
  const [formData, setFormData] = useState({
    name: "",
    category: "lost",
    description: "",
    photo: null,
    requiredDeposit: "",
    allowCustomDeposit: true,
    bountyAmount: "",
    lat: null,
    lng: null,
    ward: "",
    street: "",
    houseNumber: "",
    contact: "", // SĐT hoặc Facebook/Google
    contactType: "phone", // "phone" | "facebook" | "google"
  });
  const [markerPos, setMarkerPos] = useState(null);
  const markerRef = useRef(null);
  const photoInputRef = useRef(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [mapContainer, setMapContainer] = useState(null);
  const mapInModalRef = useRef(null);

  // Auto-load user location khi mở modal
  useEffect(() => {
    if (!isOpen && !isPinningMode) return;

    if (isOpen && !isPinningMode) {
      setLoadingLocation(true);
      setLocationError("");

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setFormData(prev => ({ ...prev, lat: latitude, lng: longitude }));
            setMarkerPos([latitude, longitude]);
            setLoadingLocation(false);
          },
          (error) => {
            console.error("Lỗi lấy vị trí:", error);
            setLocationError("Không thể lấy vị trí. Vui lòng cấp quyền định vị.");
            setLoadingLocation(false);
          }
        );
      }
    }
  }, [isOpen, isPinningMode]);

  // Handle pinning on main map - setup click listener
  useEffect(() => {
    if (!isPinningMode) {
      console.log("🔴 Pinning mode OFF");
      return;
    }

    console.log("🟡 Pinning mode ON - waiting for map click");
    
    if (!mapRef?.current) {
      console.error("❌ No mapRef.current available for pinning");
      return;
    }

    const map = mapRef.current;
    console.log("Map object:", map);
    console.log("Map._container:", map._container);
    
    const handleMapClick = (e) => {
      console.log("✅✅✅ MAP CLICKED! Event:", e);
      
      let lat, lng;
      
      if (e.latlng) {
        lat = e.latlng.lat;
        lng = e.latlng.lng;
        console.log("✅ Got from e.latlng");
      } else {
        console.error("❌ No latlng in event");
        return;
      }
      
      console.log(`📍 Setting coordinates: Lat: ${lat}, Lng: ${lng}`);
      
      setMarkerPos([lat, lng]);
      setFormData(prev => ({ 
        ...prev, 
        lat: Math.round(lat * 100) / 100,
        lng: Math.round(lng * 100) / 100
      }));
      
      console.log("✅ Exiting pinning mode");
      setIsPinningMode(false);
      map.off("click", handleMapClick);
    };

    try {
      console.log("📌 Adding click listener via map.on()");
      map.on("click", handleMapClick);
      
      // Also try adding to the container as fallback
      const container = map._container;
      if (container) {
        console.log("📌 Adding click listener to container as fallback");
        const containerClickHandler = (e) => {
          console.log("🎯 Container clicked:", e);
          const clickPoint = L.point(e.clientX, e.clientY);
          const latLng = map.containerPointToLatLng(clickPoint);
          handleMapClick({ latlng: latLng });
        };
        L.DomEvent.on(container, "click", containerClickHandler);
        
        return () => {
          map.off("click", handleMapClick);
          L.DomEvent.off(container, "click", containerClickHandler);
        };
      }
    } catch (err) {
      console.error("❌ Error setting up click listener:", err);
    }

    return () => {
      try {
        map.off("click", handleMapClick);
      } catch (err) {
        console.error("Error removing listener:", err);
      }
    };
  }, [isPinningMode]);

  const handleZoomToUserLocation = () => {
    if (!mapRef.current || !formData.lat || !formData.lng) return;

    const map = mapRef.current;
    map.setView([formData.lat, formData.lng], 16);

    if (markerRef.current) {
      markerRef.current.setLatLng([formData.lat, formData.lng]);
    } else {
      markerRef.current = L.marker([formData.lat, formData.lng], {
        icon: L.icon({
          iconUrl: "https://cdn-icons-png.flaticon.com/512/566/566126.png",
          iconSize: [40, 40],
          iconAnchor: [20, 40],
        }),
        draggable: true,
      }).addTo(map);

      markerRef.current.on("dragend", () => {
        const pos = markerRef.current.getLatLng();
        setMarkerPos([pos.lat, pos.lng]);
        setFormData(prev => ({ ...prev, lat: pos.lat, lng: pos.lng }));
      });
    }
  };

  const handlePinOnMap = () => {
    setWasOpenBeforePinning(true); // Save that modal was open
    setIsPinningMode(true);
    onClose(); // Close modal
  };

  const handleLocationSelect = (location) => {
    setMarkerPos(location);
    setFormData(prev => ({ ...prev, lat: location[0], lng: location[1] }));
  };

  const geocodeAddress = async (ward, street, houseNumber) => {
    try {
      let query = "";
      if (houseNumber) query += houseNumber + " ";
      if (street) query += street + " ";
      if (ward) query += ward + " ";
      query += "Ho Chi Minh City, Vietnam";

      console.log("Geocoding:", query);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const lat_num = parseFloat(lat);
        const lon_num = parseFloat(lon);

        const rounded_lat = Math.round(lat_num * 100) / 100;
        const rounded_lon = Math.round(lon_num * 100) / 100;

        setMarkerPos([rounded_lat, rounded_lon]);
        setFormData(prev => ({
          ...prev,
          lat: rounded_lat,
          lng: rounded_lon,
        }));
        setLocationError("");
        console.log("Geocoded successfully:", [rounded_lat, rounded_lon]);
      } else {
        setLocationError("Không tìm thấy địa chỉ này. Vui lòng kiểm tra lại.");
      }
    } catch (error) {
      console.error("Lỗi geocode:", error);
      setLocationError("Lỗi tìm kiếm địa chỉ. Vui lòng thử lại.");
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, photo: file }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.lat || !formData.lng) {
      alert("Vui lòng chọn vị trí");
      return;
    }
    if (!formData.name.trim()) {
      alert("Vui lòng nhập tên thú cưng");
      return;
    }
    if (!formData.contact.trim()) {
      alert("Vui lòng nhập thông tin liên hệ");
      return;
    }
    await onSubmit(formData);
    resetForm();
  };

  const resetForm = () => {
    setLocationMode("auto");
    setIsPinningMode(false);
    setWasOpenBeforePinning(false);
    setFormData({
      name: "",
      category: "lost",
      description: "",
      photo: null,
      requiredDeposit: "",
      allowCustomDeposit: true,
      bountyAmount: "",
      lat: null,
      lng: null,
      ward: "",
      street: "",
      houseNumber: "",
      contact: "",
      contactType: "phone",
    });
    setMarkerPos(null);
    if (markerRef.current && mapRef.current) {
      try {
        mapRef.current.removeLayer(markerRef.current);
      } catch (e) {
        // ignore
      }
      markerRef.current = null;
    }
  };

  // Return null only if modal should be completely hidden
  const shouldShow = isOpen || isPinningMode || wasOpenBeforePinning;
  if (!shouldShow) return null;

  // Pinning mode overlay
  if (isPinningMode) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.7)",
          zIndex: 49999,
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={(e) => {
          // Capture clicks on the map area
          const map = mapRef?.current;
          if (map && e.target === e.currentTarget) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const clickPoint = L.point(x, y);
            const latLng = map.containerPointToLatLng(clickPoint);
            
            console.log("✅ Overlay clicked at:", latLng);
            setMarkerPos([latLng.lat, latLng.lng]);
            setFormData(prev => ({ 
              ...prev, 
              lat: Math.round(latLng.lat * 100) / 100,
              lng: Math.round(latLng.lng * 100) / 100
            }));
            setIsPinningMode(false);
            // Keep wasOpenBeforePinning true so modal stays visible after exiting pinning
          }
        }}
      >
        <div
          style={{
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "8px",
            pointerEvents: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            maxWidth: "400px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#374151" }}>
            📍 Nhấp vào bản đồ để ghim vị trí báo cáo
          </h3>
          <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#6b7280" }}>
            Hoặc bấm Escape / Hủy để quay lại
          </p>
          <button
            onClick={() => {
              setIsPinningMode(false);
            }}
            style={{
              padding: "8px 16px",
              backgroundColor: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "500",
            }}
          >
            Hủy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50000,
      }}
      onClick={() => {
        onClose();
        resetForm();
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          padding: "24px",
          maxWidth: "700px",
          width: "95%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>
            Báo cáo thú cưng
          </h2>
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              padding: "0",
              color: "#6b7280",
            }}
          >
            ✕
          </button>
        </div>

        {/* Security Notice */}
        <div
          style={{
            padding: "12px",
            backgroundColor: "#fef3c7",
            borderLeft: "4px solid #f59e0b",
            borderRadius: "6px",
            marginBottom: "20px",
            fontSize: "13px",
            color: "#92400e",
            lineHeight: "1.5",
          }}
        >
          <strong>⚠️ Lưu ý bảo mật:</strong> Thông tin liên hệ của bạn sẽ được ẩn. Vị trí được làm tròn để hạn chế người xấu.
        </div>

        <form onSubmit={handleSubmit}>
          {/* Thông tin cơ bản */}
          <div style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "#374151" }}>
              Thông tin thú cưng
            </h3>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "500", color: "#374151", fontSize: "14px" }}>
                Tên thú cưng
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ví dụ: Miu, Bé mèo xám..."
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "500", color: "#374151", fontSize: "14px" }}>
                Loại báo cáo
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              >
                <option value="lost">🔴 Thú cưng bị mất</option>
                <option value="adopt">🟢 Tìm chủ nhân</option>
                <option value="rescue">🟠 Cần cứu hộ</option>
              </select>
            </div>

            {/* Deposit for adoption */}
            {formData.category === "adopt" && (
              <div style={{ marginBottom: "16px", padding: "12px", background: "#fff7ed", border: "2px solid #fb923c", borderRadius: "8px" }}>
                <div style={{ fontWeight: 700, fontSize: "14px", color: "#c2410c", marginBottom: 6 }}>
                  💰 Thiết lập tiền cọc (Khuyến khích)
                </div>
                <p style={{ fontSize: "12px", color: "#c2410c", marginBottom: 8 }}>
                  Cọc giúp chắc chắn người nhận nuôi nghiêm túc và tránh giao dịch trá hình.
                </p>

                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, fontWeight: 600, fontSize: "12px", color: "#374151" }}>
                    Mức cọc tối thiểu (đ)
                    <Tooltip text="Số tiền tối thiểu mà người nhận phải nộp. Tiền sẽ hoàn lại 100% khi hoàn thành. Từ 50k-200k là hợp lý.">
                      <span style={{ fontSize: 14, cursor: 'help' }}>❓</span>
                    </Tooltip>
                  </label>
                  <input
                    type="number"
                    value={formData.requiredDeposit}
                    onChange={(e) => setFormData(prev => ({ ...prev, requiredDeposit: e.target.value }))}
                    placeholder="Ví dụ: 50000 (để trống nếu không cọc)"
                    min="0"
                    style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6, fontSize: "14px" }}
                  />
                  <div style={{ fontSize: "11px", color: "#6b7280", marginTop: 4 }}>
                    💡 Gợi ý: 50k-200k là mức tối ưu.
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    id="allowCustomDeposit"
                    type="checkbox"
                    checked={formData.allowCustomDeposit}
                    onChange={(e) => setFormData(prev => ({ ...prev, allowCustomDeposit: e.target.checked }))}
                  />
                  <label htmlFor="allowCustomDeposit" style={{ fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    Cho phép người nhận tự nhập mức cọc khác
                    <Tooltip text="Nếu bật: Người nhận có thể đề xuất mức cọc khác thay vì đúng số bạn yêu cầu. Nếu tắt: Bắt buộc đúng số bạn đặt.">
                      <span style={{ fontSize: 12, cursor: 'help' }}>❓</span>
                    </Tooltip>
                  </label>
                </div>
                <div style={{ fontSize: "11px", color: "#6b7280", marginTop: 4, marginLeft: 28 }}>
                  Nếu tắt: Người nhận chỉ đặt đúng số tiền bạn đặt ra.
                </div>
              </div>
            )}

            {/* Bounty for lost / rescue */}
            {(formData.category === "lost" || formData.category === "rescue") && (
              <div style={{ marginBottom: "16px", padding: "12px", background: "#fef3c7", border: "2px solid #fcd34d", borderRadius: "8px" }}>
                <div style={{ fontWeight: 700, fontSize: "14px", color: "#b45309", marginBottom: 6 }}>
                  {formData.category === "lost" ? "🎁 Treo thưởng tìm kiếm (Khuyến khích)" : "🔥 Hỗ trợ cứu hộ (Quan trọng)"}
                </div>
                <p style={{ fontSize: "12px", color: "#b45309", marginBottom: 8 }}>
                  {formData.category === "lost"
                    ? "Thưởng khuyến khích cộng đồng tìm kiếm và báo tin."
                    : "Hỗ trợ chi phí và động lực cho người cứu hộ khi nguy cấp."}
                </p>

                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, fontWeight: 600, fontSize: "12px", color: "#374151" }}>
                    {formData.category === "lost" ? "Tiền thưởng (đ)" : "Số tiền hỗ trợ (đ)"}
                    <Tooltip text={formData.category === "lost" ? "Thưởng khuyến khích người khác tìm kiếm và báo tin cho bạn. Càng cao = càng nhiều người tìm." : "Hỗ trợ chi phí cho người cứu hộ. Người cứu sẽ nhận tiền này khi hoàn thành."}>
                      <span style={{ fontSize: 14, cursor: 'help' }}>❓</span>
                    </Tooltip>
                  </label>
                  <input
                    type="number"
                    value={formData.bountyAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, bountyAmount: e.target.value }))}
                    placeholder={formData.category === "lost" ? "Ví dụ: 500000" : "Ví dụ: 300000"}
                    min="0"
                    style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6, fontSize: "14px" }}
                  />
                  <div style={{ fontSize: "11px", color: "#6b7280", marginTop: 4 }}>
                    💡 {formData.category === "lost" ? "Gợi ý: 100k-1M" : "Gợi ý: 200k-1M"}
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "500", color: "#374151", fontSize: "14px" }}>
                Mô tả chi tiết
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Nhập mô tả chi tiết về thú cưng: đặc điểm, nơi thất lạc, v.v..."
                rows="3"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "500", color: "#374151", fontSize: "14px" }}>
                Tải ảnh
              </label>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              />
              {formData.photo && (
                <p style={{ fontSize: "12px", color: "#10b981", marginTop: "4px" }}>
                  ✓ {formData.photo.name}
                </p>
              )}
            </div>
          </div>

          {/* Thông tin liên hệ */}
          <div style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "#374151" }}>
              📞 Thông tin liên hệ
            </h3>
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>
              Sẽ được sử dụng làm thông tin đăng nhập nếu bạn chưa có tài khoản.
            </p>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "500", color: "#374151", fontSize: "13px" }}>
                Loại thông tin liên hệ
              </label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, contactType: "phone" }))}
                  style={{
                    flex: 1,
                    minWidth: "100px",
                    padding: "8px",
                    backgroundColor: formData.contactType === "phone" ? "#3b82f6" : "#e5e7eb",
                    color: formData.contactType === "phone" ? "#fff" : "#374151",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "500",
                  }}
                >
                  📱 Số điện thoại
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, contactType: "facebook" }))}
                  style={{
                    flex: 1,
                    minWidth: "100px",
                    padding: "8px",
                    backgroundColor: formData.contactType === "facebook" ? "#3b82f6" : "#e5e7eb",
                    color: formData.contactType === "facebook" ? "#fff" : "#374151",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "500",
                  }}
                >
                  f Facebook
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, contactType: "google" }))}
                  style={{
                    flex: 1,
                    minWidth: "100px",
                    padding: "8px",
                    backgroundColor: formData.contactType === "google" ? "#3b82f6" : "#e5e7eb",
                    color: formData.contactType === "google" ? "#fff" : "#374151",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "500",
                  }}
                >
                  G Google
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: "500", color: "#374151", fontSize: "13px" }}>
                {formData.contactType === "phone"
                  ? "Số điện thoại"
                  : formData.contactType === "facebook"
                  ? "Facebook URL hoặc ID"
                  : "Google Email"}
              </label>
              <input
                type={formData.contactType === "phone" ? "tel" : "text"}
                value={formData.contact}
                onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                placeholder={
                  formData.contactType === "phone"
                    ? "Ví dụ: 0987654321"
                    : formData.contactType === "facebook"
                    ? "Ví dụ: facebook.com/username hoặc @username"
                    : "Ví dụ: your@gmail.com"
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Vị trí */}
          <div style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "#374151" }}>
              📍 Vị trí báo cáo
            </h3>

            {loadingLocation && (
              <div style={{ padding: "12px", backgroundColor: "#e0e7ff", borderRadius: "6px", marginBottom: "12px", fontSize: "13px", color: "#4338ca" }}>
                ⏳ Đang lấy vị trí của bạn...
              </div>
            )}

            {locationError && (
              <div style={{ padding: "12px", backgroundColor: "#fee2e2", borderRadius: "6px", marginBottom: "12px", fontSize: "13px", color: "#dc2626" }}>
                ❌ {locationError}
              </div>
            )}

            {formData.lat && formData.lng && (
              <div style={{ padding: "12px", backgroundColor: "#dcfce7", borderRadius: "6px", marginBottom: "12px", fontSize: "13px", color: "#16a34a" }}>
                ✓ Vị trí: {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
              </div>
            )}

            {/* Location Mode Tabs */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setLocationMode("auto")}
                style={{
                  flex: 1,
                  minWidth: "120px",
                  padding: "10px",
                  backgroundColor: locationMode === "auto" ? "#3b82f6" : "#e5e7eb",
                  color: locationMode === "auto" ? "#fff" : "#374151",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                  transition: "all 0.2s",
                }}
              >
                🎯 Vị trí hiện tại
              </button>
              <button
                type="button"
                onClick={() => setLocationMode("pin-map")}
                style={{
                  flex: 1,
                  minWidth: "120px",
                  padding: "10px",
                  backgroundColor: locationMode === "pin-map" ? "#3b82f6" : "#e5e7eb",
                  color: locationMode === "pin-map" ? "#fff" : "#374151",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                  transition: "all 0.2s",
                }}
              >
                📌 Ghim trên bản đồ
              </button>
              <button
                type="button"
                onClick={() => setLocationMode("map")}
                style={{
                  flex: 1,
                  minWidth: "120px",
                  padding: "10px",
                  backgroundColor: locationMode === "map" ? "#3b82f6" : "#e5e7eb",
                  color: locationMode === "map" ? "#fff" : "#374151",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                  transition: "all 0.2s",
                }}
              >
                🗺️ Chọn trên modal
              </button>
              <button
                type="button"
                onClick={() => setLocationMode("manual")}
                style={{
                  flex: 1,
                  minWidth: "120px",
                  padding: "10px",
                  backgroundColor: locationMode === "manual" ? "#3b82f6" : "#e5e7eb",
                  color: locationMode === "manual" ? "#fff" : "#374151",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                  transition: "all 0.2s",
                }}
              >
                ✍️ Nhập địa chỉ
              </button>
            </div>

            {/* Auto - Current Location */}
            {locationMode === "auto" && (
              <div>
                <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>
                  Vị trí của bạn sẽ được sử dụng để báo cáo thú cưng.
                </p>
                <button
                  type="button"
                  onClick={handleZoomToUserLocation}
                  disabled={!formData.lat || !formData.lng || loadingLocation}
                  style={{
                    width: "100%",
                    padding: "12px",
                    backgroundColor: formData.lat && formData.lng && !loadingLocation ? "#3b82f6" : "#d1d5db",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: formData.lat && formData.lng && !loadingLocation ? "pointer" : "not-allowed",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  {loadingLocation ? "Đang lấy vị trí..." : "📍 Xem vị trí trên bản đồ"}
                </button>
              </div>
            )}

            {/* Pin on Main Map */}
            {locationMode === "pin-map" && (
              <div>
                <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>
                  Tắt modal này và nhấp vào bản đồ chính để ghim vị trí báo cáo.
                </p>
                <button
                  type="button"
                  onClick={handlePinOnMap}
                  style={{
                    width: "100%",
                    padding: "12px",
                    backgroundColor: "#f59e0b",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  📌 Ghim trên bản đồ
                </button>
                {markerPos && (
                  <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "8px" }}>
                    💡 Vị trí hiện tại: {markerPos[0].toFixed(4)}, {markerPos[1].toFixed(4)}
                  </p>
                )}
              </div>
            )}

            {/* Map - Select Location (Inline map) */}
            {locationMode === "map" && (
              <div>
                <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>
                  Nhấp vào bản đồ để chọn vị trí báo cáo. Bạn có thể kéo ghim để điều chỉnh.
                </p>
                <div
                  style={{
                    width: "100%",
                    height: "300px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "1px solid #d1d5db",
                    marginBottom: "12px",
                  }}
                  ref={setMapContainer}
                >
                  {mapContainer && (
                    <MapContainer
                      center={formData.lat && formData.lng ? [formData.lat, formData.lng] : [10.8019, 106.7147]}
                      zoom={16}
                      style={{ width: "100%", height: "100%" }}
                      ref={mapInModalRef}
                    >
                      <TileLayer
                        url="https://tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                      />
                      <MapClickHandler onLocationSelect={handleLocationSelect} />
                      {markerPos && (
                        <Marker
                          position={markerPos}
                          icon={L.icon({
                            iconUrl: "https://cdn-icons-png.flaticon.com/512/566/566126.png",
                            iconSize: [40, 40],
                            iconAnchor: [20, 40],
                          })}
                          draggable={true}
                          eventHandlers={{
                            dragend: (e) => {
                              const pos = e.target.getLatLng();
                              handleLocationSelect([pos.lat, pos.lng]);
                            },
                          }}
                        />
                      )}
                    </MapContainer>
                  )}
                </div>
                <div
                  style={{
                    padding: "12px",
                    backgroundColor: "#f3f4f6",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#6b7280",
                    lineHeight: "1.5",
                  }}
                >
                  <strong>💡 Mẹo:</strong> Bạn có thể kéo ghim để điều chỉnh vị trí chính xác hơn.
                </div>
              </div>
            )}

            {/* Manual - Input Address */}
            {locationMode === "manual" && (
              <div>
                <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>
                  Nhập địa chỉ thủ công. Hệ thống sẽ tự động chuyển đổi sang tọa độ.
                </p>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "500", color: "#374151", fontSize: "13px" }}>
                    Phường/Xã
                  </label>
                  <input
                    type="text"
                    value={formData.ward}
                    onChange={(e) => setFormData(prev => ({ ...prev, ward: e.target.value }))}
                    placeholder="Ví dụ: Phường 1"
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "500", color: "#374151", fontSize: "13px" }}>
                    Đường/Phố
                  </label>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                    placeholder="Ví dụ: Nguyễn Huệ"
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "500", color: "#374151", fontSize: "13px" }}>
                    Số nhà (không bắt buộc)
                  </label>
                  <input
                    type="text"
                    value={formData.houseNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, houseNumber: e.target.value }))}
                    placeholder="Ví dụ: 123"
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (formData.ward || formData.street) {
                      geocodeAddress(formData.ward, formData.street, formData.houseNumber);
                    } else {
                      setLocationError("Vui lòng nhập ít nhất phường hoặc đường");
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "10px",
                    backgroundColor: "#10b981",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "500",
                    marginBottom: "12px",
                  }}
                >
                  🔍 Tìm địa chỉ
                </button>

                <div
                  style={{
                    padding: "12px",
                    backgroundColor: "#f3f4f6",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#6b7280",
                    lineHeight: "1.5",
                  }}
                >
                  <strong>📍 Lưu ý:</strong> Địa chỉ sẽ được làm tròn cho bảo mật. Bạn cũng có thể dùng "Ghim trên bản đồ" để chính xác hơn.
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: "12px",
                backgroundColor: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "500",
                transition: "background-color 0.2s",
              }}
            >
              ✓ Gửi báo cáo
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              style={{
                flex: 1,
                padding: "12px",
                backgroundColor: "#e5e7eb",
                color: "#374151",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "500",
              }}
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportPetModal;
