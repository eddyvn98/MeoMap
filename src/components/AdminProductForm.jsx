import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminProductForm({
  isOpen,
  mode = 'create', // 'create' | 'edit'
  initialProduct,
  onSubmit,
  onClose,
}) {
  const [form, setForm] = useState({
    name: '',
    price: 0,
    category: 'item',
    description: '',
    stock: -1,
    image_url: '',
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (initialProduct) {
        setForm({
          name: initialProduct.name || '',
          price: initialProduct.price ?? 0,
          category: initialProduct.category || 'item',
          description: initialProduct.description || '',
          stock: initialProduct.stock ?? -1,
          image_url: initialProduct.image_url || '',
        });
      }
    }
  }, [isOpen, initialProduct]);

  if (!isOpen) return null;

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleUploadImage = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      setError('');
      const bucket = 'product-images';
      const path = `${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error('Không lấy được URL ảnh');
      update('image_url', publicUrl);
    } catch (err) {
      console.error('Upload image error:', err);
      setError(err.message || 'Không thể tải ảnh. Kiểm tra bucket storage.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    setError('');
    if (!form.name.trim()) return setError('Tên sản phẩm là bắt buộc');
    if (form.price === null || form.price === undefined || Number(form.price) < 0) return setError('Giá phải >= 0');
    if (!form.category.trim()) return setError('Danh mục là bắt buộc');
    if (typeof onSubmit === 'function') onSubmit(form);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-indigo-50">
          <h2 className="text-xl font-bold">{mode === 'create' ? '➕ Đăng sản phẩm mới' : '✏️ Sửa sản phẩm'}</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800 text-2xl">✕</button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded text-sm">⚠️ {error}</div>}

          {/* Required fields note */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            Trường bắt buộc: <strong>Tên</strong>, <strong>Giá</strong>, <strong>Danh mục</strong>. <br />
            Tồn kho: -1 nghĩa là không giới hạn.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold">Tên sản phẩm <span className="text-red-600">*</span></label>
              <input className="w-full px-3 py-2 border rounded" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Ví dụ: Áo thun MeoMap" />
            </div>
            <div>
              <label className="block text-sm font-semibold">Giá <span className="text-red-600">*</span></label>
              <input type="number" className="w-full px-3 py-2 border rounded" value={form.price} onChange={(e) => update('price', Number(e.target.value))} placeholder="Ví dụ: 150000" />
            </div>
            <div>
              <label className="block text-sm font-semibold">Danh mục <span className="text-red-600">*</span></label>
              <input className="w-full px-3 py-2 border rounded" value={form.category} onChange={(e) => update('category', e.target.value)} placeholder="item | service | voucher" />
            </div>
            <div>
              <label className="block text-sm font-semibold">Tồn kho</label>
              <input type="number" className="w-full px-3 py-2 border rounded" value={form.stock} onChange={(e) => update('stock', Number(e.target.value))} placeholder="-1 = vô hạn" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold">Mô tả</label>
              <textarea className="w-full px-3 py-2 border rounded" rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Thông tin chi tiết, chất liệu, kích thước, ..." />
            </div>
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold">Ảnh sản phẩm</label>
            {form.image_url ? (
              <div className="flex items-center gap-3">
                <img src={form.image_url} alt="product" className="w-24 h-24 object-cover rounded border" />
                <button onClick={() => update('image_url', '')} className="px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Xóa ảnh</button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <input type="file" accept="image/*" onChange={(e) => handleUploadImage(e.target.files?.[0])} />
                <span className="text-xs text-gray-600">Chọn ảnh để tải lên hoặc nhập URL trực tiếp bên dưới</span>
              </div>
            )}
            <input className="w-full px-3 py-2 border rounded" placeholder="URL ảnh (tùy chọn)" value={form.image_url} onChange={(e) => update('image_url', e.target.value)} />
            {uploading && <p className="text-xs text-gray-600">⏳ Đang tải ảnh...</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300">Hủy</button>
          <button onClick={handleSubmit} className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700">{mode === 'create' ? 'Đăng sản phẩm' : 'Lưu chỉnh sửa'}</button>
        </div>
      </div>
    </div>
  );
}
