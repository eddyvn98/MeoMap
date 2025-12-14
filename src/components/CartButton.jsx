/**
 * CartButton - Floating cart button with badge
 */

import { useCart } from '../contexts/CartContext';

export default function CartButton({ onClick }) {
  const { getTotalItems } = useCart();
  const count = getTotalItems();

  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-2xl hover:bg-indigo-700 transition-all hover:scale-110"
      style={{ boxShadow: '0 10px 40px rgba(99, 102, 241, 0.4)' }}
    >
      <div className="relative">
        <span className="text-2xl">🛒</span>
        {count > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </div>
    </button>
  );
}
