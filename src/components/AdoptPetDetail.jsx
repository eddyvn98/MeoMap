import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import AdoptionProgressBar from "./AdoptionProgressBar";
import ContextualHelpCard from "./ContextualHelpCard";

export default function AdoptPetDetail({ pet, user, isOwner }) {
  const navigate = useNavigate();
  const [owner, setOwner] = useState(null);
  const [currentDeposit, setCurrentDeposit] = useState(null);
  const [maxDeposit, setMaxDeposit] = useState(null);
  const [adoptionRequests, setAdoptionRequests] = useState([]);
  const [myRequest, setMyRequest] = useState(null);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositAmount, setDepositAmount] = useState(pet.required_deposit || 0);
  const [loadingDeposit, setLoadingDeposit] = useState(false);
  const [depositMessage, setDepositMessage] = useState("");

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

  const handleSubmitDeposit = async () => {
    if (!user || !depositAmount || depositAmount <= 0) {
      setDepositMessage("❌ Vui lòng nhập số tiền cọc hợp lệ");
      return;
    }

    setLoadingDeposit(true);
    try {
      // Create deposit record
      const { data, error } = await supabase
        .from("deposits")
        .insert({
          pet_id: pet.id,
          owner_id: pet.owner_id,
          receiver_id: user.id,
          amount: depositAmount,
          status: "locked",
        })
        .select()
        .single();

      if (error) {
        setDepositMessage(`❌ ${error.message}`);
        return;
      }

      setDepositMessage("✅ Đã gửi yêu cầu cọc thành công! Đang chờ chủ bài xác nhận...");
      setShowDepositForm(false);
      setCurrentDeposit(data);
      
      // Reload data after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setDepositMessage(`❌ Lỗi: ${err.message}`);
    } finally {
      setLoadingDeposit(false);
    }
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
          <p className="text-sm text-emerald-700 mt-1">
            Nhận nuôi miễn phí. Cọc chỉ để đảm bảo trách nhiệm, không phải mua bán.
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Đăng bởi: {owner?.display_name || "Người dùng"}
          </p>
        </div>
      </section>

      {/* Thông tin cơ bản */}
      <section className="p-4 border rounded-lg bg-white">
        {/* Progress Bar */}
        <AdoptionProgressBar 
          currentStep={
            !myRequest ? 0 :
            myRequest.status === "pending" ? 1 :
            myRequest.status === "ready_to_deliver" ? 3 :
            myRequest.status === "delivered" ? 4 : 1
          }
        />

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

          {pet.required_deposit && pet.required_deposit > 0 && (
            <div className="flex items-start gap-2">
              <span>🔐</span>
              <div>
                <p className="font-semibold">Tiền cọc</p>
                <p className="text-gray-700">{pet.required_deposit.toLocaleString()}đ</p>
                <details className="mt-2 text-xs text-gray-600 cursor-pointer">
                  <summary className="font-semibold text-gray-700 hover:text-gray-900">Tại sao cần cọc?</summary>
                  <div className="mt-2 p-2 bg-gray-50 rounded border-l-2 border-blue-400">
                    <p className="leading-relaxed">
                      <strong className="text-gray-900">Tiền cọc giúp hạn chế người xấu và đảm bảo người nhận mèo thật sự nghiêm túc.</strong>
                    </p>
                    <p className="mt-2 leading-relaxed">
                      Cọc được hoàn lại bằng <strong>voucher mua hàng trên web</strong> nhằm hỗ trợ duy trì hệ thống và giúp bạn có đồ tốt cho thú cưng.
                    </p>
                    <p className="mt-2 leading-relaxed">
                      Nếu người nhận bị đánh giá không tốt, chủ mèo sẽ nhận khoản cọc này (dạng voucher) để bù đắp, đảm bảo hệ thống không bị giao dịch trá hình.
                    </p>
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Thông tin liên hệ (nếu không yêu cầu cọc) */}
      {(!pet.required_deposit || pet.required_deposit === 0) && owner && (
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

      {/* Nút xem đầy đủ - chỉ hiển thị khi có cọc */}
      {(pet.required_deposit && pet.required_deposit > 0) && !currentDeposit && (
        <section className="sticky bottom-0 bg-white pt-3 border-t">
          <button
            onClick={() => setShowDepositForm(!showDepositForm)}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-bold text-sm shadow-lg hover:shadow-xl transition-all"
          >
            {showDepositForm ? "▼ Đóng form" : "📋 Đặt cọc ngay"}
          </button>
          
          {!isOwner && !myRequest && user && (
            <p className="text-xs text-center text-gray-500 mt-2">
              Nhấn để gửi yêu cầu cọc ngay trong panel này
            </p>
          )}

          {/* Form đặt cọc */}
          {showDepositForm && !isOwner && user && (
            <ContextualHelpCard
              cardId="adoption-deposit"
              icon="💳"
              title="Tiền Cọc Nhận Nuôi"
              content="Tiền cọc đảm bảo bạn chăm sóc tốt cho mèo. Tiền sẽ hoàn lại 100% khi hoàn thành quá trình nhận nuôi. Bạn sẽ gửi weekly check-ins ảnh/video để xác nhận mèo khỏe mạnh."
              position="top"
            >
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-bold text-blue-900 mb-3">💳 Đặt cọc ngay</h4>
              
              <div className="mb-3">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Số tiền cọc (đ)
                </label>
                <input
                  type="number"
                  min={pet.required_deposit || 0}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Tối thiểu: ${pet.required_deposit?.toLocaleString()}đ`}
                />
                <p className="text-xs text-gray-600 mt-1">
                  💡 Tối thiểu: {pet.required_deposit?.toLocaleString()}đ
                </p>
              </div>

              {depositMessage && (
                <div className={`mb-3 p-2 rounded text-sm ${depositMessage.includes("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {depositMessage}
                </div>
              )}

              <button
                onClick={handleSubmitDeposit}
                disabled={loadingDeposit}
                className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-sm disabled:opacity-50"
              >
                {loadingDeposit ? "⏳ Đang xử lý..." : "✅ Xác nhận cọc"}
              </button>
              </div>
            </ContextualHelpCard>
          )}
        </section>
      )}

      {/* Hiển thị khi đã cọc */}
      {currentDeposit && (
        <section className="sticky bottom-0 bg-green-50 pt-3 border-t border-green-200">
          <div className="p-3 bg-green-100 border-2 border-green-500 rounded-lg">
            <h4 className="font-bold text-green-900 mb-2">✅ Bạn đã cọc</h4>
            <p className="text-sm text-green-800 mb-2">
              Số tiền: <strong>{currentDeposit.amount.toLocaleString()}đ</strong>
            </p>
            <p className="text-xs text-green-700">
              Trạng thái: {currentDeposit.status === "confirmed" ? "✅ Đã xác nhận" : "⏳ Đang chờ xác nhận"}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
