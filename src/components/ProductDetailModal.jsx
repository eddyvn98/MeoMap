import { useEffect, useState } from 'react';
import { formatVND } from '../services/walletService';

export default function ProductDetailModal({ isOpen, product, onClose, onAddToCart }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      const variants = product?.variants || [];
      setSelectedVariantId(variants.length > 0 ? variants[0].id ?? variants[0].name ?? 0 : null);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const isOutOfStock = product.stock === 0;
  const maxStock = product.stock === -1 ? Infinity : product.stock;
  const canIncrease = !isOutOfStock && (maxStock === Infinity || quantity < maxStock);

  const handleConfirm = () => {
    if (typeof onAddToCart === 'function') {
      onAddToCart(product, quantity, selectedVariantId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-indigo-50">
          <h2 className="text-xl font-bold">📦 Chi Tiết Sản Phẩm</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800 text-2xl">✕</button>
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image */}
          <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg h-56 flex items-center justify-center">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="max-h-48 object-contain" />
            ) : (
              <div className="text-6xl">🎁</div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-3">
            <div className="text-xs">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">
                {product.category}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{product.name}</h3>
            {product.description && (
              <p className="text-sm text-gray-700">{product.description}</p>
            )}

            <div className="text-2xl font-bold text-indigo-600">{formatVND(product.price)}</div>
            <div className={`text-sm font-semibold ${isOutOfStock ? 'text-red-600' : 'text-green-600'}`}>
              {product.stock === -1 ? '📦 Có sẵn' : product.stock === 0 ? '❌ Hết hàng' : `✅ Còn ${product.stock}`}
            </div>

            {/* Variant selection if available */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Chọn chủng loại (nếu có)</label>
              {product.variants && product.variants.length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {product.variants.map((v) => (
                    <label key={v.id ?? v.name} className="flex items-center gap-2 p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="variant"
                        checked={selectedVariantId === (v.id ?? v.name)}
                        onChange={() => setSelectedVariantId(v.id ?? v.name)}
                      />
                      <span className="text-sm">
                        {v.name || 'Chủng loại'}{v.description ? ` - ${v.description}` : ''}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">Sản phẩm này không có chủng loại.</p>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Số lượng</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 flex items-center justify-center rounded bg-gray-200 text-gray-800 font-bold hover:bg-gray-300"
                >
                  -
                </button>
                <div className="flex-1 text-center py-2 border border-gray-200 rounded font-semibold">{quantity}</div>
                <button
                  onClick={() => canIncrease && setQuantity((q) => q + 1)}
                  disabled={!canIncrease}
                  className={`w-10 h-10 flex items-center justify-center rounded font-bold ${canIncrease ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300">Hủy</button>
          <button
            onClick={handleConfirm}
            disabled={isOutOfStock}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold ${isOutOfStock ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
          >
            {isOutOfStock ? '❌ Hết hàng' : '🛒 Thêm vào giỏ'}
          </button>
        </div>
      </div>
    </div>
  );
}
