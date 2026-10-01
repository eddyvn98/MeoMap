export default {
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
}
