import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const HowItWorks = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');

  const sections = {
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
              Cọc đảm bảo người nhận nuôi chăm sóc mèo tốt. Chủ mèo có quyền kiểm tra, và tiền sẽ hoàn lại sau khi chủ mèo xác nhận mèo được chăm sóc tốt. Đây là cách tạo lòng tin trong cộng đồng.
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
            <h3 className="font-bold text-green-700 mb-3">Quy Trình 7 Bước</h3>
            
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
                  <h4 className="font-semibold text-gray-900">Nhắn Tin Chủ Mèo</h4>
                  <p className="text-gray-600 text-sm">Gửi tin nhắn khẩu vị trước, nói về bạn & tại sao muốn nhận nuôi</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-600 text-white font-bold">3</div>
                </div>
                <div className="flex-grow">
                  <h4 className="font-semibold text-gray-900">Chủ Mèo Duyệt Đơn</h4>
                  <p className="text-gray-600 text-sm">Chủ sẽ xem xét hồ sơ của bạn và phê duyệt (hoặc từ chối)</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-600 text-white font-bold">4</div>
                </div>
                <div className="flex-grow">
                  <h4 className="font-semibold text-gray-900">Nộp Cọc</h4>
                  <p className="text-gray-600 text-sm">Nộp tiền cọc (số tiền do chủ mèo đề xuất). Tiền được khóa cho đến khi hoàn thành</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-600 text-white font-bold">5</div>
                </div>
                <div className="flex-grow">
                  <h4 className="font-semibold text-gray-900">Nhận Mèo</h4>
                  <p className="text-gray-600 text-sm">Gặp chủ mèo và nhận mèo. Chia sẻ số điện thoại/địa chỉ nếu cần</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-600 text-white font-bold">6</div>
                </div>
                <div className="flex-grow">
                  <h4 className="font-semibold text-gray-900">Checkin Định Kỳ</h4>
                  <p className="text-gray-600 text-sm">Chủ mèo có thể yêu cầu checkin để xác nhận mèo khỏe mạnh</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-600 text-white font-bold">7</div>
                </div>
                <div className="flex-grow">
                  <h4 className="font-semibold text-gray-900">Hoàn Cọc</h4>
                  <p className="text-gray-600 text-sm">Sau khi chủ xác nhận tốt, tiền cọc được hoàn lại vào ví của bạn</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h3 className="font-bold text-blue-900 mb-2">❓ Các Câu Hỏi Thường Gặp</h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li><strong>Cọc bao nhiêu tiền?</strong> Do chủ mèo quyết định, thường từ 100k - 5M VND</li>
              <li><strong>Có thể không nộp cọc không?</strong> Không, cọc là bắt buộc để đảm bảo lòng tin</li>
              <li><strong>Nếu đổi ý không nhận nữa?</strong> Bạn có thể hủy đơn, cọc được hoàn lại 100%</li>
              <li><strong>Cọc hoàn lại mất bao lâu?</strong> Thường 3-7 ngày sau khi hoàn thành</li>
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
            <h3 className="font-bold text-indigo-700 mb-3">Ví (Wallet) Của Bạn</h3>
            <div className="space-y-3 text-gray-700 text-sm">
              <p>👜 <strong>Ví là nơi quản lý tiền của bạn trên MeoMap</strong></p>
              <div className="bg-white p-3 rounded border border-indigo-100 space-y-2">
                <div>
                  <strong className="text-indigo-600">Tiền Vào Ví Từ Đâu?</strong>
                  <ul className="ml-4 text-xs space-y-1 mt-1">
                    <li>💸 Nhận thưởng từ báo mèo đi lạc</li>
                    <li>💵 Hỗ trợ từ cứu hộ</li>
                    <li>🎁 Voucher & khuyến mãi</li>
                    <li>💰 Hoàn cọc (khi hoàn thành nhận nuôi)</li>
                  </ul>
                </div>
              </div>
              <div className="bg-white p-3 rounded border border-indigo-100 space-y-2">
                <div>
                  <strong className="text-indigo-600">Dùng Tiền Trong Ví Để?</strong>
                  <ul className="ml-4 text-xs space-y-1 mt-1">
                    <li>💳 Nộp cọc khi nhận nuôi</li>
                    <li>📦 Mua voucher & dịch vụ</li>
                    <li>🎁 Treo thưởng tìm mèo đi lạc (tùy chọn)</li>
                    <li>📱 Doanh vụ khác của MeoMap</li>
                  </ul>
                </div>
              </div>
              <div className="bg-white p-3 rounded border border-indigo-100">
                <strong className="text-indigo-600">Rút Tiền Từ Ví?</strong>
                <p className="text-xs mt-1">Tiền trong ví là để dùng trên hệ thống MeoMap. Hiện tại chưa hỗ trợ rút tiền ra ngoài, nhưng bạn có thể sử dụng cho các giao dịch khác hoặc giúp đỡ cộng đồng.</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <h3 className="font-bold text-green-900 mb-2">💳 Cọc (Deposit)</h3>
            <div className="space-y-2 text-gray-700 text-sm">
              <p><strong>Cọc là gì?</strong> Tiền đảm bảo khi nhận nuôi. Tiền được giữ tạm thời để chủ mèo yên tâm.</p>
              <ul className="ml-4 space-y-1">
                <li>📌 <strong>Tiền bao nhiêu:</strong> Do chủ mèo quyết định (100k - 5M VND)</li>
                <li>🔒 <strong>Được khóa:</strong> Từ khi nộp đến khi hoàn thành (3-30 ngày)</li>
                <li>✅ <strong>Hoàn lại:</strong> 100% khi chủ mèo xác nhận bạn chăm sóc tốt</li>
                <li>⚠️ <strong>Không hoàn lại nếu:</strong> Mèo mất tích, bị bỏ, hoặc có tranh chấp</li>
              </ul>
              <div className="bg-yellow-100 border-l-4 border-yellow-600 p-2 rounded mt-2">
                <strong className="text-yellow-900 text-xs">💡 Mẹo:</strong>
                <p className="text-xs mt-1">Cọc không phải là "mua mèo". Nó chỉ là bảo đảm, hoàn lại 100% nếu bạn chăm sóc tốt.</p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
            <h3 className="font-bold text-orange-900 mb-2">🎁 Thưởng (Bounty)</h3>
            <div className="space-y-2 text-gray-700 text-sm">
              <p><strong>Thưởng là gì?</strong> Tiền khuyến khích người khác tìm kiếm hoặc giúp đỡ.</p>
              <ul className="ml-4 space-y-1">
                <li>💰 <strong>Trong Adopt:</strong> Người treo thưởng để bạn nhận nuôi (tùy chọn)</li>
                <li>🔍 <strong>Trong Lost:</strong> Chủ mèo treo thưởng để người báo tin tìm kiếm</li>
                <li>🚑 <strong>Trong Rescue:</strong> Cộng đồng treo thưởng để người cứu hộ</li>
                <li>💸 <strong>Hoàn lại:</strong> Nếu không ai nhận, thưởng hoàn lại vào ví</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h3 className="font-bold text-blue-900 mb-2">🎫 Voucher</h3>
            <div className="space-y-2 text-gray-700 text-sm">
              <p><strong>Voucher là gì?</strong> Mã giảm giá cho các dịch vụ của MeoMap.</p>
              <ul className="ml-4 space-y-1">
                <li>🎯 <strong>Từ đâu:</strong> Tặng từ cộng đồng, sự kiện, hoặc mua</li>
                <li>💳 <strong>Dùng vào:</strong> Giảm giá cho các dịch vụ (nâng cao bài, quảng cáo)</li>
                <li>📱 <strong>Xem voucher:</strong> Tại trang Ví - tab Voucher</li>
              </ul>
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
                <strong className="text-purple-600">Ví dụ 1: Nhận Nuôi</strong>
                <p className="text-xs mt-1">Bạn thích mèo, chủ mèo yêu cầu cọc 500k. Bạn nộp 500k từ ví → Tiền bị khóa → Sau 1 tháng, mèo khỏe, chủ hoàn cọc → 500k quay lại ví</p>
              </div>
              <div className="bg-white p-2 rounded border border-purple-100">
                <strong className="text-purple-600">Ví dụ 2: Báo Mèo Đi Lạc</strong>
                <p className="text-xs mt-1">Bạn thấy mèo Mimi, báo tin cho chủ → Chủ xác nhận & tặng 1M thưởng → 1M vào ví bạn → Bạn dùng tiền này để nộp cọc mèo khác</p>
              </div>
              <div className="bg-white p-2 rounded border border-purple-100">
                <strong className="text-purple-600">Ví dụ 3: Cứu Hộ</strong>
                <p className="text-xs mt-1">Bạn cứu mèo mắc kẹt trong tường → Cộng đồng treo thưởng 2M → 2M vào ví bạn → Bạn dùng mua voucher quảng cáo bài viết</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span className="text-xl">←</span>
            <span className="font-semibold">Quay lại</span>
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">📚 Cách Sử Dụng MeoMap</h1>
            <p className="text-sm text-gray-600">Hướng dẫn chi tiết từng bước</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {Object.entries(sections).map(([key, section]) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`p-4 rounded-lg font-semibold transition-all border-2 ${
                activeSection === key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-900 border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="text-2xl mb-1">{section.icon}</div>
              <div className="text-sm">{section.title}</div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-3xl font-bold mb-6">
            {sections[activeSection].icon} {sections[activeSection].title}
          </h2>
          {sections[activeSection].content}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>❓ Vẫn có câu hỏi? <a href="/faq" className="text-blue-600 hover:underline">Xem FAQ</a> • <a href="/glossary" className="text-blue-600 hover:underline">Từ điển</a> hoặc liên hệ hỗ trợ</p>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
