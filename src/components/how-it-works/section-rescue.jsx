export default {
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
}
