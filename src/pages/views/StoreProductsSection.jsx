

export default function StoreProductsSection({ scope }) {
  const {
    activeTab,
    searchQuery,
    setSearchQuery,
    displayedProducts,
    sortBy,
    setSortBy,
    categories,
    setSelectedCategory,
    selectedCategory,
    products,
    openProductDetail,
  } = scope;

  return (
    <>
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
      
    </>
  );
}
