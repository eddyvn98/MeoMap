/**
 * Page: StorePage
 * Trang mua hàng trong hệ thống
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useCart } from '../contexts/CartContext';
import {
  getProducts,
  getUserVouchers,
  getUserWallet,
  formatVND,
  getPurchaseHistory,
} from '../services/walletService';
import ProductCard from '../components/ProductCard';
import ProductDetailModal from '../components/ProductDetailModal';
import PurchaseHistory from '../components/PurchaseHistory.jsx';
import CartButton from '../components/CartButton';
import CartDrawer from '../components/CartDrawer';
import MultiStepCheckoutModal from '../components/MultiStepCheckoutModal';
import OrderSuccessBanner from '../components/OrderSuccessBanner';

export default function StorePage() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [currentUser, setCurrentUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [wallet, setWallet] = useState({ balance_main: 0, balance_coc: 0, balance_thuong: 0 });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search and Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'price-asc', 'price-desc'

  // View toggle
  const [activeTab, setActiveTab] = useState('products'); // 'products' or 'history'

  // Cart & Checkout
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Check auth
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData.user) {
        setError('Bạn cần đăng nhập để mua hàng');
        setLoading(false);
        return;
      }

      setCurrentUser(authData.user);

      // Load products
      const productsResult = await getProducts();
      if (productsResult.success) {
        setProducts(productsResult.products || []);
      }

      // Load vouchers
      const vouchersResult = await getUserVouchers(authData.user.id);
      if (vouchersResult.success) {
        setVouchers(vouchersResult.vouchers || []);
      }

      // Load wallet
      const walletResult = await getUserWallet(authData.user.id);
      if (walletResult.success) {
        setWallet(walletResult.wallet);
      }
    } catch (err) {
      setError('Lỗi tải dữ liệu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCheckout = () => {
    setShowCart(false);
    setShowCheckout(true);
  };

  const handleCheckoutSuccess = () => {
    setShowCheckout(false);
    // Reload wallet and data
    if (currentUser) {
      loadData();
    }
    // Show order success banner and fetch latest order
    setShowOrderSuccess(true);
    fetchLatestOrder();
  };
  const fetchLatestOrder = async () => {
    const userId = currentUser?.id;
    if (!userId) return;
    try {
      const result = await getPurchaseHistory(userId, 1, 0);
      if (result.success && result.purchases && result.purchases.length > 0) {
        setLastOrder(result.purchases[0]);
      }
    } catch (err) {
      console.error('Lỗi lấy đơn hàng mới nhất', err);
    }
  };

  const openProductDetail = (product) => {
    setSelectedProduct(product);
    setShowProductDetail(true);
  };

  const handleAddToCartFromDetail = (product, quantity /*, variantId */) => {
    addToCart(product, quantity);
    setShowProductDetail(false);
    setShowCart(true);
  };

  const refreshWalletAndVouchers = async () => {
    const userId = currentUser?.id;
    if (!userId) return;
    try {
      const [vouchersResult, walletResult] = await Promise.all([
        getUserVouchers(userId),
        getUserWallet(userId),
      ]);

      if (vouchersResult.success) {
        setVouchers(vouchersResult.vouchers || []);
      }
      if (walletResult.success) {
        setWallet(walletResult.wallet);
      }
    } catch (err) {
      console.error('Lỗi cập nhật nhanh ví/voucher', err);
    }
  };

  // Filter and Sort products
  const categories = [...new Set(products.map(p => p.category))];
  
  let displayedProducts = products;
  
  // Apply category filter
  if (selectedCategory) {
    displayedProducts = displayedProducts.filter(p => p.category === selectedCategory);
  }
  
  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    displayedProducts = displayedProducts.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.description?.toLowerCase().includes(query)
    );
  }
  
  // Apply sorting
  displayedProducts = [...displayedProducts].sort((a, b) => {
    switch(sortBy) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'name':
      default:
        return a.name.localeCompare(b.name);
    }
  });

  if (loading) {
    return <div className="p-8 text-center">⏳ Đang tải cửa hàng...</div>;
  }

  if (error && !currentUser) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-red-600 font-semibold">{error}</p>
        <button
          onClick={() => navigate('/login')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold"
        >
          Đăng nhập
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Order Success Banner */}
      {showOrderSuccess && (
        <OrderSuccessBanner
          isOpen={showOrderSuccess}
          userId={currentUser?.id}
          lastOrder={lastOrder}
          onClose={() => setShowOrderSuccess(false)}
          onViewHistory={() => {
            setShowOrderSuccess(false);
            setActiveTab('history');
          }}
          onContinueShopping={() => setShowOrderSuccess(false)}
        />
      )}
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🛍️ Cửa Hàng MeoMap</h1>
        <button
          onClick={() => navigate('/account')}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          ← Quay lại
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
            activeTab === 'products'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          🛍️ Sản Phẩm ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📦 Lịch Sử Mua Hàng
        </button>
      </div>

      {/* Wallet Info */}
      {currentUser && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
            <p className="text-sm text-blue-700">💳 Ví Chính</p>
            <p className="text-xl font-bold text-blue-900">
              {formatVND(wallet.balance_main)}
            </p>
            <p className="text-xs text-blue-600 mt-1">Nạp/rút tự do</p>
          </div>
          <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
            <p className="text-sm text-orange-700">🔒 Ví Cọc</p>
            <p className="text-xl font-bold text-orange-900">
              {formatVND(wallet.balance_coc)}
            </p>
            <p className="text-xs text-orange-600 mt-1">Chỉ quy đổi voucher</p>
          </div>
          <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
            <p className="text-sm text-green-700">🎁 Ví Thưởng</p>
            <p className="text-xl font-bold text-green-900">
              {formatVND(wallet.balance_thuong)}
            </p>
            <p className="text-xs text-green-600 mt-1">Từ rescue/lost</p>
          </div>
        </div>
      )}

      {/* Active Vouchers Count */}
      {vouchers.length > 0 && activeTab === 'products' && (
        <div className="mb-6 p-3 bg-blue-50 border border-blue-300 rounded-lg">
          <p className="text-sm text-blue-800">
            💳 Bạn có <strong>{vouchers.length}</strong> voucher có thể dùng
          </p>
        </div>
      )}

      {/* Products Tab Content */}
      {activeTab === 'products' && (
        <>
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Tìm kiếm sản phẩm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2 text-sm text-gray-600">
                Tìm thấy <strong>{displayedProducts.length}</strong> sản phẩm
              </p>
            )}
          </div>

          {/* Sort Options */}
          <div className="mb-6 flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">Sắp xếp:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('name')}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                  sortBy === 'name'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                A-Z
              </button>
              <button
                onClick={() => setSortBy('price-asc')}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                  sortBy === 'price-asc'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Giá ↑
              </button>
              <button
                onClick={() => setSortBy('price-desc')}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                  sortBy === 'price-desc'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Giá ↓
              </button>
            </div>
          </div>

          {/* Category Filters */}
          {categories.length > 1 && (
            <div className="mb-6 flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full font-semibold transition ${
                  selectedCategory === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Tất cả ({products.length})
              </button>
              {categories.map((cat) => {
                const count = products.filter(p => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full font-semibold transition ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Products Grid */}
          {displayedProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">
                {searchQuery 
                  ? `Không tìm thấy sản phẩm "${searchQuery}"` 
                  : selectedCategory 
                  ? `Không có sản phẩm trong danh mục "${selectedCategory}"`
                  : 'Không có sản phẩm nào'}
              </p>
              {(searchQuery || selectedCategory) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory(null);
                  }}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpenDetail={openProductDetail}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Purchase History Tab Content */}
      {activeTab === 'history' && currentUser && (
        <div className="max-w-2xl mx-auto">
          <PurchaseHistory userId={currentUser.id} />
        </div>
      )}

      {/* Floating Cart Button */}
      <CartButton onClick={() => setShowCart(true)} />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        onCheckout={handleOpenCheckout}
      />

      {/* Multi-Step Checkout Modal */}
      <MultiStepCheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        userId={currentUser?.id}
        wallet={wallet}
        vouchers={vouchers}
        onSuccess={handleCheckoutSuccess}
        onRefresh={refreshWalletAndVouchers}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={showProductDetail}
        product={selectedProduct}
        onClose={() => setShowProductDetail(false)}
        onAddToCart={handleAddToCartFromDetail}
      />
      {/* Info Section */}
      {activeTab === 'products' && (
        <div className="mt-12 p-6 bg-gray-50 border rounded-lg space-y-4">
          <h2 className="text-xl font-bold text-gray-800">📝 Hướng dẫn mua hàng</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>✅ Bạn có thể thanh toán bằng Ví chính hoặc Ví thưởng</li>
            <li>✅ Dùng voucher để giảm giá mua hàng</li>
            <li>✅ Khi dùng voucher, nó sẽ được mark "used" và không thể dùng lại</li>
            <li>✅ Ưu tiên trừ từ Ví chính → Ví thưởng (không dùng Ví cọc)</li>
            <li>✅ Sử dụng thanh tìm kiếm và bộ lọc để tìm sản phẩm nhanh hơn</li>
            <li>❌ Không hỗ trợ hoàn lại tiền sau khi mua</li>
          </ul>
        </div>
      )}
    </div>
  );
}
