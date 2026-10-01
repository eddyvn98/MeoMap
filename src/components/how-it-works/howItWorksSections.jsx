export const sections = {
    overview: {
      title: 'Tổng Quan Về MeoMap',
      icon: '🗺️',
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h3 className="font-bold text-blue-900 mb-2">MeoMap là gì?</h3>
            <p className="text-gray-700">
              MeoMap là nền tảng kết nối những người yêu thích động vật, giúp:
            </p>
            <ul className="mt-3 space-y-2 text-gray-700 ml-4">
              <li>✅ <strong>Tìm mèo nhà bị lạc</strong> - Báo tin nhận thưởng</li>
              <li>✅ <strong>Tìm nuôi mèo</strong> - Nhận nuôi miễn phí với cọc an toàn</li>
              <li>✅ <strong>Cứu hộ mèo</strong> - Hỗ trợ ca khẩn cấp với tiền thưởng</li>
            </ul>
          </div>

          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <h3 className="font-bold text-green-900 mb-2">Ba Luồng Chính</h3>
            <div className="space-y-3 text-gray-700">
              <div>
                <strong className="text-green-700">🤝 Nhận Nuôi (Adopt)</strong>
                <p className="text-sm">Chủ mèo đăng bài, bạn gửi yêu cầu, nộp cọc, nhận mèo</p>
              </div>
              <div>
                <strong className="text-red-700">🔍 Mèo Đi Lạc (Lost)</strong>
                <p className="text-sm">Chủ mèo treo thưởng, bạn báo tin thấy mèo, nhận tiền thưởng</p>
              </div>
              <div>
                <strong className="text-orange-700">🚑 Cứu Hộ (Rescue)</strong>
                <p className="text-sm">Mèo cần giúp đỡ khẩn cấp, cộng đồng hỗ trợ, nhận tiền hỗ trợ</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
            <h3 className="font-bold text-purple-900 mb-2">Hệ Thống Tài Chính</h3>
            <div className="space-y-2 text-gray-700 text-sm">
              <p><strong>💰 Cọc (Deposit)</strong>: Tiền chống lừa đảo khi nhận nuôi, hoàn lại 100%</p>
              <p><strong>🎁 Thưởng (Bounty)</strong>: Tiền khuyến khích để người khác tìm kiếm/giúp đỡ</p>
              <p><strong>👜 Ví (Wallet)</strong>: Nơi quản lý tiền cọc, thưởng, và voucher</p>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
            <h3 className="font-bold text-yellow-900 mb-2">Tại Sao Có Cọc?</h3>
            <p className="text-gray-700 text-sm">
              Cọc là tiền bị khóa trên hệ thống ko phải đưa trực tiếp cho người đăng. Cọc đảm bảo người nhận nuôi chăm sóc mèo tốt.  Tiền sẽ hoàn lại sau khi chủ mèo xác nhận mèo được chăm sóc tốt.
            </p>
          </div>
        </div>
      ),
    },
    adopt: {
      title: 'Cách Nhận Nuôi Mèo',
      icon: '🤝',
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded border border-green-200">
            <h3 className="font-bold text-green-700 mb-3">Quy Trình 5 Bước</h3>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-600 text-white font-bold">1</div>
                </div>
                <div className="flex-grow">
                  <h4 className="font-semibold text-gray-900">Xem Bài Đăng</h4>
                  <p className="text-gray-600 text-sm">Tìm mèo bạn thích trên bản đồ hoặc danh sách</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-600 text-white font-bold">2</div>
                </div>
                <div className="flex-grow">
                  <h4 className="font-semibold text-gray-900">Đặt Cọc (Nếu Có)</h4>
                  <p className="text-gray-600 text-sm">Nộp tiền cọc (số tiền do chủ mèo đề xuất). Chủ mèo không nhận trực tiếp. Tiền được hệ thống khóa cho đến khi hoàn thành</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-600 text-white font-bold">3</div>
                </div>
                <div className="flex-grow">
                  <h4 className="font-semibold text-gray-900">Nhắn Tin Chủ Mèo</h4>
                  <p className="text-gray-600 text-sm">Nhận thông tin liên hệ, cả 2 sẽ trao đổi với nhau. Nếu ok thì tiến hành giao nhận</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-600 text-white font-bold">4</div>
                </div>
                <div className="flex-grow">
                  <h4 className="font-semibold text-gray-900">Nhận Mèo</h4>
                  <p className="text-gray-600 text-sm">Gặp chủ mèo nhận mèo. Chủ mèo sẽ quét mã QR hoặc nút xác nhận để xác nhận đã giao mèo thành công. Khi đó tiền cọc từ những người khác sẽ được mở khóa tự động rút về ví cá nhân, còn tiền cọc của người nhận mèo tiếp tục bị khóa</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-600 text-white font-bold">5</div>
                </div>
                <div className="flex-grow">
                  <h4 className="font-semibold text-gray-900">Hoàn Cọc</h4>
                  <p className="text-gray-600 text-sm">Sau 3 ngày khi chủ cũ xác nhận chủ mới là người tốt, tiền cọc được hoàn lại vào ví của chủ mới</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
            <h3 className="font-bold text-yellow-900 mb-2">Hủy Cọc Trước Khi Giao Mèo</h3>
            <div className="space-y-2 text-gray-700 text-sm">
              <p><strong>Người đặt cọc:</strong> Có thể hủy đơn trước khi chủ mèo quét QR/xác nhận giao mèo. Cọc được hoàn 100% về ví ngay sau khi hủy.</p>
              <p><strong>Người đăng bài:</strong> Có thể hủy đơn hoặc thu hồi đề nghị trước khi quét QR/xác nhận giao mèo. Cọc của tất cả ứng viên sẽ được mở khóa và hoàn lại 100%.</p>
              <p><strong>Nhiều người cùng cọc:</strong> Tất cả cọc được khóa cho đến khi chủ mèo chọn người nhận và quét QR/xác nhận giao mèo. Nếu chủ mèo hủy hoặc không giao, cọc được mở khóa và hoàn lại 100% cho mọi người.</p>
              <p className="text-xs text-gray-600">Lưu ý: Sau khi quét QR hoặc bấm xác nhận giao mèo, cọc của người được chọn sẽ tiếp tục bị khóa cho đến khi hoàn tất/hoàn cọc.</p>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h3 className="font-bold text-blue-900 mb-2">❓ Các Câu Hỏi Thường Gặp</h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li><strong>Cọc bao nhiêu tiền?</strong> Có thể có cọc hoặc không, do chủ mèo quyết định, thường từ 100k - 5M VND</li>
              <li><strong>Có bắt buộc phải nộp cọc không?</strong> Không, cọc là tùy chọn. Nếu chủ mèo không yêu cầu cọc, bạn có thể nhận nuôi ngay</li>
              <li><strong>Nếu đổi ý không nhận nữa?</strong> Bạn có thể hủy đơn, cọc được hoàn lại 100%</li>
              <li><strong>Có thể hủy cọc trước khi nhận mèo?</strong> Có. Cả người đặt cọc và người đăng bài đều có thể hủy trước khi quét QR/xác nhận giao mèo, và cọc được hoàn 100%</li>
              <li><strong>Nếu có nhiều người cùng cọc mà chủ mèo không giao cho tôi?</strong> Cọc vẫn bị khóa cho đến khi chủ mèo chọn người nhận và quét QR/xác nhận. Nếu chủ mèo hủy hoặc không giao, cọc sẽ được mở khóa và hoàn 100%</li>
              <li><strong>Cọc hoàn lại mất bao lâu?</strong> Thường 3 sau khi chủ cũ xác nhận</li>
            </ul>
          </div>
        </div>
      ),
    },
    lost: {
      title: 'Báo Mèo Đi Lạc & Nhận Thưởng',
      icon: '🔍',
      content: (
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded border border-red-200">
            <h3 className="font-bold text-red-700 mb-3">Hai Vai Trò: Chủ Mèo vs Báo Tin</h3>
            
            <div className="space-y-4">
              <div className="bg-white p-3 rounded border border-red-100">
                <h4 className="font-bold text-red-600 mb-2">👨‍👩‍👧 Nếu Bạn Là Chủ Mèo</h4>
                <ol className="space-y-2 text-gray-700 text-sm ml-4 list-decimal">
                  <li>Đăng bài báo mèo đi lạc với ảnh & mô tả chi tiết</li>
                  <li><strong>Treo thưởng</strong> (khuyến khích) để huyến dụ người khác tìm kiếm</li>
                  <li>Chờ người báo tin thấy mèo</li>
                  <li>Xác nhận người báo tin và trả thưởng</li>
                </ol>
              </div>

              <div className="bg-white p-3 rounded border border-orange-100">
                <h4 className="font-bold text-orange-600 mb-2">👤 Nếu Bạn Thấy Mèo Đi Lạc</h4>
                <ol className="space-y-2 text-gray-700 text-sm ml-4 list-decimal">
                  <li>Tìm bài báo mèo đi lạc trên MeoMap</li>
                  <li>Chụp ảnh/video làm bằng chứng</li>
                  <li>Báo tin cho chủ mèo (thông qua ứng dụng)</li>
                  <li>Chủ mèo xác nhận và gửi thưởng cho bạn</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
            <h3 className="font-bold text-yellow-900 mb-2">💡 Mẹo Tăng Cơ Hội Tìm Mèo</h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li>📸 <strong>Ảnh rõ nét:</strong> Chụp ảnh mèo khi còn nhà để giúp mọi người nhận ra</li>
              <li>📍 <strong>Mô tả chi tiết:</strong> Đặc điểm, tính cách, khu vực thường đi</li>
              <li>💰 <strong>Thưởng hợp lý:</strong> Thưởng càng cao, người càng tìm kiếm chăm</li>
              <li>📱 <strong>Liên lạc nhanh:</strong> Hãy sẵn sàng trả lời tin nhắn 24/7</li>
            </ul>
          </div>

          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <h3 className="font-bold text-green-900 mb-2">🎯 Quy Trình Chi Tiết</h3>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <strong className="text-red-600">Bước 1: Báo Mèo</strong>
                <p className="text-xs">Chủ mèo đăng bài với ảnh, mô tả, và địa chỉ thất lạc</p>
              </div>
              <div>
                <strong className="text-orange-600">Bước 2: Treo Thưởng</strong>
                <p className="text-xs">Chủ mèo đề xuất số tiền thưởng (khuyến khích treo thưởng)</p>
              </div>
              <div>
                <strong className="text-yellow-600">Bước 3: Tìm Kiếm Cộng Đồng</strong>
                <p className="text-xs">Mọi người trên MeoMap sẽ giúp tìm kiếm, đặc biệt những người gần vị trí</p>
              </div>
              <div>
                <strong className="text-blue-600">Bước 4: Báo Tin</strong>
                <p className="text-xs">Người thấy mèo gửi ảnh/video chứng minh cho chủ mèo</p>
              </div>
              <div>
                <strong className="text-green-600">Bước 5: Trả Thưởng</strong>
                <p className="text-xs">Chủ mèo xác nhận và gửi tiền thưởng vào ví của người báo tin</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h3 className="font-bold text-blue-900 mb-2">❓ Các Câu Hỏi Thường Gặp</h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li><strong>Phải nộp tiền để báo tin không?</strong> Không, hoàn toàn miễn phí</li>
              <li><strong>Ai quyết định thưởng?</strong> Chủ mèo quyết định sau khi xác nhận mèo</li>
              <li><strong>Thưởng bao nhiêu là hợp lý?</strong> Tùy tình huống, thường 50k - 5M VND</li>
              <li><strong>Nếu nhiều người báo tin?</strong> Chủ mèo chỉ trả cho người đúng/tìm được mèo trước</li>
            </ul>
          </div>
        </div>
      ),
    },
    rescue: {
      title: 'Báo Sighting & Cứu Hộ',
      icon: '🚑',
      content: (
        <div className="space-y-4">
          <div className="bg-orange-50 p-4 rounded border border-orange-200">
            <h3 className="font-bold text-orange-700 mb-3">Hai Tình Huống: Sighting vs Cứu Hộ</h3>
            
            <div className="space-y-4">
              <div className="bg-white p-3 rounded border border-yellow-100">
                <h4 className="font-bold text-yellow-600 mb-2">👀 Báo Sighting (Thấy Mèo)</h4>
                <p className="text-gray-700 text-sm mb-2">Mèo không có chủ hoặc cần giúp đỡ, bạn tìm thấy</p>
                <ol className="space-y-1 text-gray-700 text-sm ml-4 list-decimal">
                  <li>Tạo bài báo "Thấy mèo" trên MeoMap</li>
                  <li>Chụp ảnh & mô tả vị trí, đặc điểm mèo</li>
                  <li>Cộng đồng sẽ giúp tìm chủ hoặc tìm người cứu</li>
                </ol>
              </div>

              <div className="bg-white p-3 rounded border border-red-100">
                <h4 className="font-bold text-red-600 mb-2">🚨 Cứu Hộ (Khẩn Cấp)</h4>
                <p className="text-gray-700 text-sm mb-2">Mèo trong tình trạng nguy hiểm (bệnh, bị thương, bị mắc kẹt)</p>
                <ol className="space-y-1 text-gray-700 text-sm ml-4 list-decimal">
                  <li>Tạo bài báo "Cứu Hộ" (độ ưu tiên cao)</li>
                  <li>Mô tả tình trạng khẩn cấp rõ ràng</li>
                  <li>Cộng đồng sẽ giúp (gọi hotline, hỗ trợ thực tế)</li>
                  <li>Người cứu sẽ nhận tiền hỗ trợ từ thưởng</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <h3 className="font-bold text-red-900 mb-2">⚠️ Tình Huống Cứu Hộ</h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li>🤕 Mèo bị thương ngoài đường</li>
              <li>🏥 Mèo bệnh nặng, cần bác sỹ thú y gấp</li>
              <li>🪤 Mèo bị mắc kẹt (trong tường, ống, cây)</li>
              <li>❄️ Mèo ở nơi nguy hiểm (đường cao tốc, xây dựng)</li>
              <li>😢 Mèo sơ sinh bỏ rơi cần nuôi cấp cứu</li>
            </ul>
          </div>

          <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
            <h3 className="font-bold text-purple-900 mb-2">🤝 Cộng Đồng Hỗ Trợ</h3>
            <div className="space-y-2 text-gray-700 text-sm">
              <p><strong>MeoMap không phải chỉ một app</strong> - đó là cộng đồng!</p>
              <p>Khi báo cứu hộ:</p>
              <ul className="ml-4 space-y-1 text-xs">
                <li>✅ Người gần sẽ được thông báo</li>
                <li>✅ Cộng đồng sẽ hỗ trợ (tiền, nhân lực)</li>
                <li>✅ Bác sỹ thú y & người cứu sẽ tham gia</li>
                <li>✅ Người cứu hộ nhận tiền hỗ trợ/thưởng</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h3 className="font-bold text-blue-900 mb-2">❓ Các Câu Hỏi Thường Gặp</h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li><strong>Tôi có thể cứu hộ nếu không có kinh nghiệm?</strong> Có, cộng đồng sẽ hướng dẫn</li>
              <li><strong>Bác sỹ thú y sẽ giúp gì?</strong> Tư vấn qua app, có thể hỗ trợ khám miễn phí</li>
              <li><strong>Cứu hộ có tiền không?</strong> Có, người báo cứu hộ sẽ treo thưởng để hỗ trợ</li>
              <li><strong>Cứu được mèo thì sao?</strong> Tìm chủ mèo, hoặc giúp tìm gia đình nuôi mới</li>
            </ul>
          </div>
        </div>
      ),
    },
    financial: {
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
    },
  };
