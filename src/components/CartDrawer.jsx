/**
 * CartDrawer - Sliding cart panel
 */

import { useCart } from '../contexts/CartContext';
import { formatVND } from '../services/walletService';

export default function CartDrawer({ isOpen, onClose, onCheckout }) {
  const { cartItems, updateQuantity, removeFromCart, getTotalPrice } = useCart();

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-indigo-50">
          <h2 className="text-xl font-bold text-gray-800">
            🛒 Giỏ Hàng ({cartItems.length})
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cartItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Giỏ hàng trống</p>
              <p className="text-sm mt-2">Thêm sản phẩm để tiếp tục</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.product.id}
                className="flex gap-3 p-3 border border-gray-200 rounded-lg"
              >
                {/* Image */}
                <div className="w-20 h-20 bg-gray-100 rounded flex-shrink-0">
                  {item.product.image_url ? (
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      🎁
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-gray-800 line-clamp-2">
                    {item.product.name}
                  </h3>
                  <p className="text-sm text-indigo-600 font-bold mt-1">
                    {formatVND(item.product.price)}
                  </p>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() =>
                        updateQuantity(item.product.id, item.quantity - 1)
                      }
                      className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center hover:bg-gray-300"
                    >
                      −
                    </button>
                    <span className="text-sm font-semibold w-8 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.product.id, item.quantity + 1)
                      }
                      className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center hover:bg-gray-300"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="ml-auto text-red-500 hover:text-red-700 text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Tổng cộng:</span>
              <span className="text-2xl font-bold text-indigo-600">
                {formatVND(getTotalPrice())}
              </span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              Tiến Hành Thanh Toán
            </button>
          </div>
        )}
      </div>
    </>
  );
}
