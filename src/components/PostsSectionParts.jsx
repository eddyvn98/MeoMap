import React from 'react';
import * as ReactWindow from 'react-window';
import PostCard from './PostCard';

const FixedSizeList = ReactWindow.FixedSizeList;

const TYPE_ORDER = ['rescue', 'lost', 'adopt'];
const TYPE_LABEL = {
  adopt: 'Cho nhận',
  lost: 'Thất lạc',
  rescue: 'Giải cứu',
};

const TYPE_ICON = {
  adopt: '🏡',
  lost: '📍',
  rescue: '🚑',
};

// Status options
const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'available', label: 'Có sẵn' },
  { value: 'pending_coc', label: 'Chờ cọc' },
  { value: 'pending_qr', label: 'Chờ QR' },
  { value: 'closed', label: 'Đã đóng' },
  { value: 'urgent', label: 'Khẩn cấp' },
];

// Sort options
const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
];

/**
 * Virtualized list component for large post lists (>30 items)
 */
function VirtualizedPostList({ posts, onEdit, onDelete, onShowQR, onEnterToken, onViewDetail }) {
  const ITEM_HEIGHT = 120; // Approximate height of PostCard
  const MAX_HEIGHT = 600; // Max container height
  const listHeight = Math.min(posts.length * ITEM_HEIGHT, MAX_HEIGHT);

  const Row = ({ index, style }) => {
    const post = posts[index];
    return (
      <div style={{ ...style, paddingBottom: 12 }}>
        <PostCard
          post={post}
          onEdit={onEdit}
          onDelete={onDelete}
          onShowQR={onShowQR}
          onEnterToken={onEnterToken}
          onViewDetail={onViewDetail}
        />
      </div>
    );
  };

  return (
    <FixedSizeList
      height={listHeight}
      itemCount={posts.length}
      itemSize={ITEM_HEIGHT}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

export function createPostsSectionRenderers(scope) {
  const {
    statusFilter,
    sortBy,
    setExpandedSections,
    postsByType,
    expandedSections,
    onEdit,
    onDelete,
    onShowQR,
    onEnterToken,
    onViewDetail,
    setActiveFilter,
    activeFilter,
    statusDropdownRef,
    setShowStatusDropdown,
    showStatusDropdown,
    setStatusFilter,
    sortDropdownRef,
    setShowSortDropdown,
    showSortDropdown,
    setSortBy,
  } = scope;

  // Apply filters and sorting
    const filterAndSortPosts = (typePostsArray) => {
      let filtered = [...typePostsArray];
  
      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter((p) => p.status?.toLowerCase() === statusFilter);
      }
  
      // Apply sorting
      if (sortBy === 'newest') {
        filtered.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
      } else {
        filtered.sort((a, b) => new Date(a.updated_at || a.created_at) - new Date(b.updated_at || b.created_at));
      }
  
      return filtered;
    };
  
    // Toggle section expansion
    const toggleSection = (type) => {
      setExpandedSections((prev) => ({
        ...prev,
        [type]: !prev[type],
      }));
    };
  
    // Render a collapsible section with sticky header
    const renderSection = (type) => {
      const allPosts = postsByType[type];
      const filteredPosts = filterAndSortPosts(allPosts);
      const count = filteredPosts.length;
      const isOpen = expandedSections[type];
      const icon = TYPE_ICON[type];
  
      return (
        <section key={type} className="mb-6">
          <header
            className="sticky top-[72px] z-20 flex items-center justify-between cursor-pointer p-3 bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection(type)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                toggleSection(type);
              }
            }}
          >
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-xl">{icon}</span>
              {TYPE_LABEL[type]}
              <span className="ml-1 text-sm text-gray-500">({count})</span>
            </h3>
            <button
              className="text-sm px-2 py-1 rounded-md border border-gray-300 bg-white hover:bg-gray-50 font-medium text-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                toggleSection(type);
              }}
            >
              {isOpen ? '▼' : '▶'}
            </button>
          </header>
  
          {isOpen && (
            <div className="mt-3 space-y-3">
              {count === 0 ? (
                <div className="py-6 text-sm text-gray-500 text-center">
                  Không có bài nào ở loại này.
                </div>
              ) : count > 30 ? (
                // Virtualized list for performance with >30 items
                <VirtualizedPostList
                  posts={filteredPosts}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onShowQR={onShowQR}
                  onEnterToken={onEnterToken}
                  onViewDetail={onViewDetail}
                />
              ) : (
                filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onShowQR={onShowQR}
                    onEnterToken={onEnterToken}
                    onViewDetail={onViewDetail}
                  />
                ))
              )}
            </div>
          )}
        </section>
      );
    };
  
    // Filter chips
    const FilterChips = () => {
      const chips = [
        { key: 'all', label: 'Tất cả' },
        { key: 'rescue', label: '🚑 Giải cứu' },
        { key: 'lost', label: '📍 Thất lạc' },
        { key: 'adopt', label: '🏡 Cho nhận' },
      ];
  
      return (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setActiveFilter(chip.key)}
              className={`flex-none px-3 py-1 rounded-full text-sm font-medium border transition-colors whitespace-nowrap ${
                activeFilter === chip.key
                  ? 'bg-sky-100 border-sky-300 text-sky-800'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      );
    };
  
    // Status & Sort Dropdowns
    const StatusDropdown = () => (
      <div ref={statusDropdownRef} className="relative inline-block">
        <button
          onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          className="flex-none px-3 py-1 rounded-md text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-1"
        >
          Trạng thái ▾
        </button>
        {showStatusDropdown && (
          <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-md shadow-lg z-30 min-w-[140px]">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setStatusFilter(option.value);
                  setShowStatusDropdown(false);
                }}
                className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                  statusFilter === option.value ? 'bg-sky-50 text-sky-700 font-medium' : 'text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  
    const SortDropdown = () => (
      <div ref={sortDropdownRef} className="relative inline-block">
        <button
          onClick={() => setShowSortDropdown(!showSortDropdown)}
          className="flex-none px-3 py-1 rounded-md text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-1"
        >
          Sắp xếp ▾
        </button>
        {showSortDropdown && (
          <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-md shadow-lg z-30 min-w-[120px]">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setSortBy(option.value);
                  setShowSortDropdown(false);
                }}
                className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                  sortBy === option.value ? 'bg-sky-50 text-sky-700 font-medium' : 'text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  
    // Loading skeleton component
    const LoadingSkeleton = () => (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );

  return {
    renderSection,
    FilterChips,
    StatusDropdown,
    SortDropdown,
    LoadingSkeleton,
  };
}
