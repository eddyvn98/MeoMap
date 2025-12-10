import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function AdoptPetDetail({ pet, user, isOwner }) {
  const navigate = useNavigate();
  const [owner, setOwner] = useState(null);
  const [currentDeposit, setCurrentDeposit] = useState(null);
  const [maxDeposit, setMaxDeposit] = useState(null);
  const [adoptionRequests, setAdoptionRequests] = useState([]);
  const [myRequest, setMyRequest] = useState(null);

  // Load owner info
  useEffect(() => {
    const loadOwner = async () => {
      if (pet.owner_id) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", pet.owner_id)
          .single();
        setOwner(data || null);
      }
    };
    loadOwner();
  }, [pet.owner_id]);

  // Load deposits và adoption requests
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      // Load max deposit
      const { data: deposits } = await supabase
        .from("deposits")
        .select("amount")
        .eq("pet_id", pet.id)
        .eq("status", "locked");

      if (deposits && deposits.length > 0) {
        const max = deposits.reduce((m, d) => (d.amount > m ? d.amount : m), 0);
        setMaxDeposit(max);
      }

      // Load current user's deposit
      const { data: myDeposit } = await supabase
        .from("deposits")
        .select("*")
        .eq("pet_id", pet.id)
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setCurrentDeposit(myDeposit);

      // Load adoption requests
      if (isOwner) {
        const { data: requests } = await supabase
          .from("adoption_requests")
          .select(`
            *,
            profiles:requester_id(id, display_name, email, phone)
          `)
          .eq("pet_id", pet.id)
          .order("created_at", { ascending: false });

        setAdoptionRequests(requests || []);
      } else {
        const { data: myReq } = await supabase
          .from("adoption_requests")
          .select("*")
          .eq("pet_id", pet.id)
          .eq("requester_id", user.id)
          .maybeSingle();

        setMyRequest(myReq);
      }
    };

    loadData();
  }, [pet.id, user, isOwner]);

  const handleViewFullPage = () => {
    navigate(`/pet/${pet.id}`);
  };

  return (
    <div className="space-y-4">
      {/* Header với ảnh */}
      <section className="relative bg-gray-100 rounded-lg overflow-hidden">
        <div className="relative w-full h-48 bg-gray-200">
          {pet.image_url ? (
            <img
              src={pet.image_url}
              alt={pet.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
              Không có ảnh
            </div>
          )}

          {/* Badge status */}
          <div className="absolute top-3 right-3">
            <div className="px-3 py-1 rounded-full bg-green-500 text-white text-xs font-semibold">
              🏡 Nhận nuôi
            </div>
          </div>
        </div>

        <div className="p-4 bg-white">
          <h3 className="text-xl font-bold text-gray-900">{pet.name}</h3>
          <p className="text-sm text-gray-600 mt-1">
            Đăng bởi: {owner?.display_name || "Người dùng"}
          </p>
        </div>
      </section>

      {/* Thông tin cơ bản */}
      <section className="p-4 border rounded-lg bg-white">
        <h3 className="font-bold text-gray-900 mb-3">📝 Thông tin</h3>
        
        <div className="space-y-2 text-sm">
          {pet.district && (
            <div className="flex items-start gap-2">
              <span>📍</span>
              <div>
                <p className="font-semibold">Khu vực</p>
                <p className="text-gray-700">{pet.district}</p>
              </div>
            </div>
          )}

          {pet.description && (
            <div className="flex items-start gap-2">
              <span>💬</span>
              <div>
                <p className="font-semibold">Mô tả</p>
                <p className="text-gray-700">{pet.description}</p>
              </div>
            </div>
          )}

          {pet.deposit_amount && (
            <div className="flex items-start gap-2">
              <span>💰</span>
              <div>
                <p className="font-semibold">Tiền cọc đề xuất</p>
                <p className="text-gray-700">{pet.deposit_amount.toLocaleString()}đ</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Thông tin liên hệ (nếu không yêu cầu cọc) */}
      {(!pet.max_deposit || pet.max_deposit === 0) && owner && (
        <section className="p-4 border rounded-lg bg-blue-50">
          <h3 className="font-bold text-blue-900 mb-3">📞 Liên hệ trực tiếp</h3>
          <p className="text-sm text-blue-800 mb-3">
            Chủ bài không yêu cầu tiền cọc. Bạn có thể liên hệ trực tiếp:
          </p>
          <div className="space-y-2">
            {owner.email && (
              <a
                href={`mailto:${owner.email}`}
                className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded text-center text-sm"
              >
                ✉️ Email: {owner.email}
              </a>
            )}
            {owner.phone && (
              <a
                href={`tel:${owner.phone}`}
                className="block w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded text-center text-sm"
              >
                📱 Gọi: {owner.phone}
              </a>
            )}
          </div>
        </section>
      )}

      {/* Trạng thái đặt cọc (nếu user đã đặt cọc) */}
      {!isOwner && currentDeposit && (
        <section className="p-4 border-2 border-blue-500 rounded-lg bg-blue-50">
          <h3 className="font-bold text-blue-900 mb-2">✅ Bạn đã đặt cọc</h3>
          <p className="text-sm text-blue-800">
            Số tiền: <strong>{currentDeposit.amount.toLocaleString()}đ</strong>
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Trạng thái: {currentDeposit.status === "confirmed" ? "Đã xác nhận" : "Đang chờ xác nhận"}
          </p>
        </section>
      )}

      {/* Adoption request status (nếu user đã gửi request) */}
      {!isOwner && myRequest && (
        <section className="p-4 border rounded-lg bg-yellow-50">
          <h3 className="font-bold text-yellow-900 mb-2">📨 Yêu cầu của bạn</h3>
          <p className="text-sm text-yellow-800">
            Trạng thái: <strong>
              {myRequest.status === "pending" && "Đang chờ phản hồi"}
              {myRequest.status === "accepted" && "Đã chấp nhận"}
              {myRequest.status === "rejected" && "Từ chối"}
              {myRequest.status === "ready_to_deliver" && "Sẵn sàng nhận"}
            </strong>
          </p>
        </section>
      )}

      {/* Owner view - danh sách người đăng ký */}
      {isOwner && adoptionRequests.length > 0 && (
        <section className="p-4 border rounded-lg">
          <h3 className="font-bold text-gray-900 mb-3">
            👥 Người đăng ký nhận ({adoptionRequests.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {adoptionRequests.map((req) => (
              <div key={req.id} className="p-3 bg-gray-50 rounded border text-sm">
                <p className="font-semibold">
                  {req.profiles?.display_name || req.profiles?.email || "Người nhận"}
                </p>
                <p className="text-xs text-gray-600">
                  Trạng thái: {req.status === "pending" ? "⏳ Chờ" : req.status === "accepted" ? "✅ Chấp nhận" : req.status}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cọc cao nhất hiện tại */}
      {maxDeposit !== null && (
        <section className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded text-sm">
          <p className="font-semibold text-yellow-900">
            💰 Cọc cao nhất: {maxDeposit.toLocaleString()}đ
          </p>
        </section>
      )}

      {/* Nút xem đầy đủ */}
      <section className="sticky bottom-0 bg-white pt-3 border-t">
        <button
          onClick={handleViewFullPage}
          className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-bold text-sm shadow-lg hover:shadow-xl transition-all"
        >
          📋 Xem đầy đủ & Đặt cọc →
        </button>
        
        {!isOwner && !currentDeposit && !myRequest && user && (
          <p className="text-xs text-center text-gray-500 mt-2">
            Nhấn để xem chi tiết và gửi yêu cầu nhận nuôi
          </p>
        )}
      </section>
    </div>
  );
}
