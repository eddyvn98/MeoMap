export default {
      title: 'Hệ Thống Tài Chính',
      icon: '💰',
      content: (
        <div className="space-y-4">
          <div className="bg-indigo-50 p-4 rounded border border-indigo-200">
            <h3 className="font-bold text-indigo-700 mb-3">💼 Chính Sách Ví - 2 Loại Số Dư</h3>
            <div className="space-y-4 text-gray-700 text-sm">
              <p><strong>Ví của bạn trên MeoMap được chia thành 2 loại số dư khác nhau:</strong></p>
              
              <div className="bg-white p-3 rounded border border-indigo-100">
                <div>
                  <h4 className="font-bold text-indigo-600 mb-2">1️⃣ Số Dư Cọc (Balance_COC)</h4>
                  <p className="text-xs mb-2"><strong>Là gì:</strong> Tiền ký quỹ khi nhận nuôi, không phải thu nhập.</p>
                  <div className="ml-3 space-y-1 text-xs">
                    <p><strong>Nguồn vào:</strong> Tiền cọc bạn nộp, tiền cọc hoàn lại từ các giao dịch.</p>
                    <p><strong>Quy tắc sử dụng:</strong></p>
                    <ul className="ml-4 space-y-1">
                      <li>✅ Nộp cọc mới, đổi voucher, mua dịch vụ trong hệ thống</li>
                      <li>❌ <strong>KHÔNG được rút về ngân hàng</strong></li>
                      <li>❌ Không chuyển cho người khác</li>
                    </ul>
                    <p><strong>Lý do:</strong> Tránh giao dịch trá hình, rửa tiền, đảm bảo an toàn nhận nuôi.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded border border-orange-100">
                <div>
                  <h4 className="font-bold text-orange-600 mb-2">2️⃣ Số Dư Thưởng (Balance_THUONG)</h4>
                  <p className="text-xs mb-2"><strong>Là gì:</strong> Tiền bạn nhận được từ việc giúp đỡ (Lost, Rescue).</p>
                  <div className="ml-3 space-y-1 text-xs">
                    <p><strong>Nguồn vào:</strong> Thưởng tìm mèo đi lạc, cứu hộ, sự kiện cộng đồng.</p>
                    <p><strong>Quy tắc sử dụng:</strong></p>
                    <ul className="ml-4 space-y-1">
                      <li>✅ <strong>CÓ THỂ RÚT VỀ NGÂN HÀNG</strong></li>
                      <li>✅ Đổi voucher hoặc mua dịch vụ trong hệ thống</li>
                    </ul>
                    <p><strong>Lý do:</strong> Đây là "tiền công" chính đáng cho người đóng góp, không được chặn rút.</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-2 rounded">
                <p className="text-xs"><strong>📊 Tóm tắt:</strong> Cọc = không rút (chỉ dùng trong hệ thống) | Thưởng = được rút + dùng trong hệ thống.</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <h3 className="font-bold text-green-900 mb-2">💳 Cọc (Deposit) - Balance_COC</h3>
            <div className="space-y-2 text-gray-700 text-sm">
              <p><strong>Cọc là gì?</strong> Tiền ký quỹ đảm bảo nhận nuôi an toàn, không phải phí hay tiền mua mèo.</p>
              <ul className="ml-4 space-y-1">
                <li>📌 <strong>Tiền bao nhiêu:</strong> Do chủ mèo quyết định (100k - 5M VND)</li>
                <li>🔒 <strong>Được khóa:</strong> Từ khi nộp đến khi hoàn thành (3-30 ngày)</li>
                <li>✅ <strong>Hoàn lại:</strong> 100% dưới dạng voucher khi chủ mèo xác nhận bạn chăm sóc tốt</li>
                <li>⚠️ <strong>Không hoàn lại nếu:</strong> Mèo mất tích, bị bỏ, hoặc có tranh chấp</li>
              </ul>
            </div>
          </div>

          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
            <h3 className="font-bold text-orange-900 mb-2">🎁 Thưởng (Bounty) - Balance_THUONG</h3>
            <div className="space-y-2 text-gray-700 text-sm">
              <p><strong>Thưởng là gì?</strong> Tiền bạn nhận được từ việc giúp đỡ cộng đồng.</p>
              <ul className="ml-4 space-y-1">
                <li>🔍 <strong>Báo mèo đi lạc (Lost):</strong> Chủ mèo treo thưởng, bạn báo tin → nhận tiền</li>
                <li>🚑 <strong>Cứu hộ (Rescue):</strong> Cộng đồng treo thưởng, bạn cứu → nhận tiền</li>
                <li>🤝 <strong>Thưởng nhận nuôi:</strong> Nếu bạn kích hoạt, bạn có thể nhận tiền</li>
                <li>💰 <strong>Có thể rút ngân hàng:</strong> Hoàn toàn là tiền công của bạn</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h3 className="font-bold text-blue-900 mb-2">💸 Rút Tiền Thưởng (Chỉ Balance_THUONG)</h3>
            <div className="space-y-2 text-gray-700 text-sm">
              <p><strong>Chỉ tiền thưởng mới có thể rút</strong> (từ Lost/Rescue). Cọc không rút được.</p>
              <div className="space-y-2">
                <div className="bg-white p-2 rounded border border-blue-100">
                  <p className="font-semibold text-blue-600 text-xs">📋 Quy Trình Rút Tiền Thủ Công:</p>
                  <ol className="ml-4 text-xs space-y-1 mt-1 list-decimal">
                    <li>Vào trang Ví → Tab "Rút Tiền"</li>
                    <li>Nhập số tiền muốn rút (tối thiểu 10.000 VND)</li>
                    <li>Nhập thông tin tài khoản ngân hàng nhận tiền</li>
                    <li>Gửi yêu cầu → Chờ admin duyệt (24-48 giờ)</li>
                    <li>Admin duyệt → Tiền được trừ từ ví, chuyển ngân hàng</li>
                  </ol>
                </div>
                <div className="bg-green-100 border-l-4 border-green-600 p-2 rounded">
                  <p className="font-semibold text-green-700 text-xs">✅ Cách Rút:</p>
                  <p className="text-xs mt-1">Chuyển khoản thủ công từ tài khoản ngân hàng MeoMap → Tài khoản bạn (admin xử lý, không tự động)</p>
                </div>
              </div>
              <ul className="ml-4 space-y-1 text-xs">
                <li>🎯 <strong>Phí rút:</strong> Miễn phí (MeoMap chi phí chuyển khoản)</li>
                <li>⏱️ <strong>Thời gian:</strong> 24-48 giờ sau khi admin duyệt</li>
                <li>🏦 <strong>Tài khoản nhận:</strong> Bất kỳ ngân hàng nào (Vietcombank, Agribank, etc.)</li>
                <li>⚠️ <strong>Lưu ý:</strong> Chỉ có thể rút tiền thưởng, không rút tiền cọc</li>
              </ul>
            </div>
          </div>

          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <h3 className="font-bold text-green-900 mb-2">🎫 Voucher & Quy Đổi (Cọc + Thưởng)</h3>
            <div className="space-y-2 text-gray-700 text-sm">
              <p><strong>Voucher là gì?</strong> Mã có giá trị để mua sản phẩm & dịch vụ trên MeoMap.</p>
              <ul className="ml-4 space-y-1 text-xs">
                <li>🎯 <strong>Từ đâu:</strong> Quy đổi từ Cọc hoặc Thưởng (1:1), tặng từ sự kiện</li>
                <li>💳 <strong>Dùng vào:</strong> Mua sản phẩm phục vụ thú cưng, dịch vụ (nâng cao bài, quảng cáo)</li>
                <li>✅ <strong>Lợi ích:</strong> Thay vì rút tiền, bạn có thể quy đổi voucher dùng luôn trong hệ thống</li>
                <li>📱 <strong>Xem & dùng:</strong> Tại trang Ví - tab Voucher</li>
              </ul>
              <div className="bg-green-100 border-l-4 border-green-600 p-2 rounded mt-2">
                <strong className="text-green-700 text-xs">💡 Gợi ý:</strong>
                <p className="text-xs mt-1">Nếu cần tiền mặt: rút tiền thưởng. Nếu muốn tiện dùng trong app: quy đổi voucher.</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <h3 className="font-bold text-red-900 mb-2">🔒 An Toàn & Lưu Ý</h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li>✅ Tất cả giao dịch qua MeoMap, không bao giờ chuyển tiền ngoài ứng dụng</li>
              <li>✅ Tiền được bảo mật bằng Stripe (thanh toán quốc tế)</li>
              <li>⚠️ Không chia sẻ mã PIN hoặc thông tin tài khoản</li>
              <li>⚠️ Nếu bị lừa, báo ngay cho hỗ trợ MeoMap</li>
            </ul>
          </div>

          <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
            <h3 className="font-bold text-purple-900 mb-2">📊 Ví Dụ Cụ Thể</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div className="bg-white p-2 rounded border border-purple-100">
                <strong className="text-purple-600">Ví dụ 1: Nhận Nuôi (Dùng Cọc)</strong>
                <p className="text-xs mt-1">💰 <strong>Balance_COC:</strong> 500k → Nộp cọc 500k → Giao nhận mèo thành công → Người cho mèo xác nhận người nhận ko phải người xấu → Hoàn cọc 500k vào Balance_COC</p>
              </div>
              <div className="bg-white p-2 rounded border border-purple-100">
                <strong className="text-purple-600">Ví dụ 2: Báo Mèo Đi Lạc (Nhận Thưởng)</strong>
                <p className="text-xs mt-1">💸 <strong>Balance_THUONG:</strong> 0 → Báo tin thấy mèo → Nhận thưởng 1M → Balance_THUONG = 1M → Rút 1M về ngân hàng (hoặc quy đổi voucher)</p>
              </div>
              <div className="bg-white p-2 rounded border border-purple-100">
                <strong className="text-purple-600">Ví dụ 3: Cứu Hộ (Nhận Thưởng)</strong>
                <p className="text-xs mt-1">💚 <strong>Balance_THUONG:</strong> 1M → Cứu mèo → Nhận thưởng 2M → Balance_THUONG = 3M → Quy đổi 2M voucher, rút 1M về ngân hàng</p>
              </div>
            </div>
          </div>
        </div>
      ),
};
