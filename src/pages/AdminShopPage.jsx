import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { getProducts, formatVND } from '../services/walletService';
import AdminProductForm from '../components/AdminProductForm';

export default function AdminShopPage() {
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'orders'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Products state
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [formInitial, setFormInitial] = useState(null);

  // Orders state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    loadProducts();
    loadOrders();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await getProducts();
      if (result.success) {
        setProducts(result.products || []);
      } else {
        setError(result.error || 'Không thể tải sản phẩm');
      }
    } catch (err) {
      setError('Lỗi tải sản phẩm');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const upsertProduct = async (payload) => {
    try {
      setLoading(true);
      setError('');
      // Try RPC first (requires admin and server functions)
      const { data: rpcId, error: rpcError } = await supabase.rpc('admin_upsert_product', { p_product: payload });
      if (!rpcError) {
        await loadProducts();
        return { success: true, data: rpcId };
      }
      // Fallback to direct table upsert if allowed by RLS
      const { data, error } = await supabase.from('products').upsert(payload).select('*');
      if (error) throw error;
      await loadProducts();
      return { success: true, data };
    } catch (err) {
      console.error('Lỗi upsert sản phẩm:', err);
      setError(err.message || 'Lỗi upsert sản phẩm');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id) => {
    try {
      setLoading(true);
      setError('');
      // Try RPC delete first
      const { error: rpcError } = await supabase.rpc('admin_delete_product', { p_id: id });
      if (rpcError) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
      }
      await loadProducts();
      return { success: true };
    } catch (err) {
      console.error('Lỗi xóa sản phẩm:', err);
      setError(err.message || 'Lỗi xóa sản phẩm');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .order('purchased_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Lỗi tải đơn hàng:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status, adminNote = null) => {
    try {
      const { error } = await supabase
        .from('purchases')
        .update({ status, admin_note: adminNote })
        .eq('id', orderId);
      if (error) throw error;
      await loadOrders();
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái đơn:', err);
      alert('Không thể cập nhật trạng thái. Cần thêm cột/status hoặc RPC tương ứng.');
    }
  };

  return (
    <>
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🛠️ Quản Trị Cửa Hàng</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'products' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            🛍️ Sản phẩm
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'orders' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            📦 Đơn hàng
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded text-sm">⚠️ {error}</div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* New Product CTA */}
          <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">➕ Đăng sản phẩm mới</h2>
                <p className="text-sm text-gray-600">Rõ ràng các trường bắt buộc, hỗ trợ tải ảnh.</p>
              </div>
              <button
                onClick={() => { setFormMode('create'); setFormInitial(null); setShowForm(true); }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
              >
                Mở biểu mẫu
              </button>
            </div>
          </div>

          {/* Products List */}
          <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">Danh sách sản phẩm ({products.length})</h2>
              <button onClick={loadProducts} className="px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">🔄 Làm mới</button>
            </div>
            {loading ? (
              <div className="p-6 text-center text-gray-600">⏳ Đang tải...</div>
            ) : products.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Chưa có sản phẩm</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700">
                      <th className="p-2 text-left">Tên</th>
                      <th className="p-2 text-left">Giá</th>
                      <th className="p-2 text-left">Danh mục</th>
                      <th className="p-2 text-left">Tồn kho</th>
                      <th className="p-2 text-left">Cập nhật</th>
                      <th className="p-2">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const isEditing = editingId === p.id;
                      const [name, price, category, stock] = [p.name, p.price, p.category, p.stock];
                      return (
                        <tr key={p.id} className="border-t">
                          <td className="p-2">
                            <span className="font-semibold">{p.name}</span>
                          </td>
                          <td className="p-2">
                            <span className="text-indigo-700 font-bold">{formatVND(p.price)}</span>
                          </td>
                          <td className="p-2">
                            <span>{p.category}</span>
                          </td>
                          <td className="p-2">
                            <span>{p.stock}</span>
                          </td>
                          <td className="p-2 text-xs text-gray-600">{p.updated_at ? new Date(p.updated_at).toLocaleString('vi-VN') : '-'}</td>
                          <td className="p-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setFormMode('edit'); setFormInitial(p); setShowForm(true); }}
                                className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                              >
                                Sửa
                              </button>
                              <button onClick={() => deleteProduct(p.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">Xóa</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">Đơn hàng gần đây</h2>
              <button onClick={loadOrders} className="px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">🔄 Làm mới</button>
            </div>

            {ordersLoading ? (
              <div className="p-6 text-center text-gray-600">⏳ Đang tải...</div>
            ) : orders.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Chưa có đơn hàng</div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="p-3 border-2 border-gray-200 rounded-lg">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-bold text-gray-800">{o.product_name} x{o.quantity}</p>
                        <p className="text-xs text-gray-600">{new Date(o.purchased_at).toLocaleString('vi-VN')}</p>
                        <p className="text-xs text-gray-600">User: {o.user_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-indigo-700 font-bold">{formatVND(o.total_amount)}</p>
                        {o.voucher_amount > 0 && (
                          <p className="text-xs text-green-700">-{formatVND(o.voucher_amount)} voucher</p>
                        )}
                        <p className="text-xs text-gray-600">Trạng thái: {o.status || 'n/a'}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => updateOrderStatus(o.id, 'paid', 'Admin xác nhận thanh toán')} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Xác nhận thanh toán</button>
                      <button onClick={() => updateOrderStatus(o.id, 'cancelled', 'Admin hủy đơn')} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">Hủy đơn</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    {/* Product Form Modal */}
    <AdminProductForm
      isOpen={showForm}
      mode={formMode}
      initialProduct={formInitial}
      onSubmit={async (payload) => {
        const isEdit = formMode === 'edit' && formInitial && formInitial.id;
        const finalPayload = isEdit ? Object.assign({ id: formInitial.id }, payload) : payload;
        const res = await upsertProduct(finalPayload);
        if (res.success) setShowForm(false);
      }}
      onClose={() => setShowForm(false)}
    />
    </>
  );
}
