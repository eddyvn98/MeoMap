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
import StorePageView from './views/StorePageView';

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

  return <StorePageView scope={{
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
  }} />;
}
