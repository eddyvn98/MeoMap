/**
 * Component: ProductCard
 * Hiển thị sản phẩm trong cửa hàng
 */

import { useState } from 'react';
import { formatVND } from '../services/walletService';
import { useCart } from '../contexts/CartContext';

export default function ProductCard({ product, hasVouchers, onOpenDetail }) {
  const { addToCart, cartItems, updateQuantity, removeFromCart } = useCart();
  const [showNotification, setShowNotification] = useState(false);
  const cartItem = cartItems.find((item) => item.product.id === product.id);
  const quantityInCart = cartItem?.quantity || 0;
  const isInCart = quantityInCart > 0;
  const getStockStatus = () => {
    if (product.stock === -1) return '📦 Có sẵn';
    if (product.stock === 0) return '❌ Hết hàng';
    if (product.stock < 5) return `⚠️ Chỉ còn ${product.stock}`;
    return '✅ Có sẵn';
  };

  const isOutOfStock = product.stock === 0;
  const canIncrease = !isOutOfStock && (product.stock === -1 || quantityInCart < product.stock);

  const handleAddToCart = () => {
    addToCart(product, 1);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2000);
  };

  return (
    <div
      className={`bg-white border-2 rounded-lg overflow-hidden transition relative ${
        isInCart
          ? 'border-amber-400 shadow-[0_8px_24px_rgba(255,193,7,0.25)]'
          : 'border-gray-200 hover:shadow-lg'
      }`}
    >
      {isInCart && (
        <div className="absolute top-3 left-3 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
          Trong giỏ
        </div>
      )}
      {/* Image/Icon */}
      <div
        className="bg-gradient-to-br from-blue-100 to-indigo-100 h-40 flex items-center justify-center cursor-pointer"
        onClick={() => onOpenDetail && onOpenDetail(product)}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-24 h-24 object-cover"
          />
        ) : (
          <div className="text-5xl">🎁</div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Category Badge */}
        <div className="text-xs">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">
            {product.category}
          </span>
        </div>

        {/* Name */}
        <h3
          className="font-bold text-lg text-gray-800 line-clamp-2 cursor-pointer"
          onClick={() => onOpenDetail && onOpenDetail(product)}
        >
          {product.name}
        </h3>

        {/* Description */}
        {product.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Price */}
        <div className="text-2xl font-bold text-indigo-600">
          {formatVND(product.price)}
        </div>

        {/* Stock Status */}
        <div className={`text-sm font-semibold ${
          isOutOfStock ? 'text-red-600' : 'text-green-600'
        }`}>
          {getStockStatus()}
        </div>

        {/* Voucher hint */}
        {hasVouchers && !isOutOfStock && (
          <div className="text-xs text-purple-700 bg-purple-50 p-2 rounded">
            💳 Có thể dùng voucher để giảm giá
          </div>
        )}

        {/* Cart Controls */}
        {isInCart ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-amber-50 text-amber-800 text-sm font-semibold px-3 py-2 rounded">
              <span>Đã trong giỏ</span>
              <span>x{quantityInCart}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(product.id, quantityInCart - 1)}
                className="w-10 h-10 flex items-center justify-center rounded bg-gray-200 text-gray-800 font-bold hover:bg-gray-300"
              >
                -
              </button>
              <div className="flex-1 text-center py-2 border border-gray-200 rounded font-semibold">
                {quantityInCart}
              </div>
              <button
                onClick={() => updateQuantity(product.id, quantityInCart + 1)}
                disabled={!canIncrease}
                className={`w-10 h-10 flex items-center justify-center rounded font-bold ${
                  canIncrease
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                +
              </button>
              <button
                onClick={() => removeFromCart(product.id)}
                className="px-3 py-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100"
              >
                Xóa
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`w-full py-2 px-4 rounded-lg font-semibold transition ${
              isOutOfStock
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isOutOfStock ? '❌ Hết hàng' : '🛒 Thêm Vào Giỏ'}
          </button>
        )}
      </div>

      {/* Add to Cart Notification */}
      {showNotification && (
        <div className="absolute top-2 left-2 right-2 bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-semibold text-center animate-bounce">
          ✅ Đã thêm vào giỏ hàng!
        </div>
      )}
    </div>
  );
}
