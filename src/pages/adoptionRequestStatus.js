export function getAdoptionRequestStatusStyle(status) {
  switch (status) {
    case "pending":
      return { bg: "#fef3c7", text: "#92400e", label: "⏳ Chờ chấp nhận" };
    case "accepted":
      return { bg: "#dcfce7", text: "#166534", label: "✅ Đã chấp nhận" };
    case "ready_to_deliver":
      return { bg: "#dbeafe", text: "#1e40af", label: "📦 Sẵn sàng giao" };
    case "delivered":
      return { bg: "#e0e7ff", text: "#4338ca", label: "🎉 Đã giao" };
    case "rejected":
      return { bg: "#fee2e2", text: "#991b1b", label: "❌ Từ chối" };
    case "cancelled":
      return { bg: "#f3f4f6", text: "#6b7280", label: "⛔ Đã hủy" };
    default:
      return { bg: "#f9fafb", text: "#374151", label: status };
  }
}
