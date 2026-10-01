import StoreProductsSection from "./StoreProductsSection";
/* eslint-disable no-unused-vars */


export default function StorePageView({ scope }) {
  const {
    navigate,
    addToCart,
    currentUser,
    setCurrentUser,
    products,
    setProducts,
    vouchers,
    setVouchers,
    wallet,
    setWallet,
    selectedCategory,
    setSelectedCategory,
    loading,
    setLoading,
    error,
    setError,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    activeTab,
    setActiveTab,
    showCart,
    setShowCart,
    showCheckout,
    setShowCheckout,
    showProductDetail,
    setShowProductDetail,
    selectedProduct,
    setSelectedProduct,
    showOrderSuccess,
    setShowOrderSuccess,
    lastOrder,
    setLastOrder,
    loadData,
    handleOpenCheckout,
    handleCheckoutSuccess,
    fetchLatestOrder,
    openProductDetail,
    handleAddToCartFromDetail,
    refreshWalletAndVouchers,
    categories,
    displayedProducts,
  } = scope;

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

      <StoreProductsSection scope={scope} />
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
