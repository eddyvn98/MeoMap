export default {
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
}
