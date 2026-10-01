export default {
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
}
