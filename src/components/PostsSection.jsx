import React, { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as ReactWindow from 'react-window';
import { usePostsByType, useAllPosts } from '../hooks/usePosts';
import { getPostsQueryKey } from '../api/posts';
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

/**
 * PostsSection - Unified posts panel for ProfileDrawer
 * Features:
 * - Single unified "Bài đăng" section with 3 collapsible types
 * - Filter chips for type + status & sort dropdowns
 * - Sticky headers for each type section
 * - Type icons for quick recognition
 * - Colored left borders on cards
 * - URL sync with ?type= parameter
 * - Inline actions with icons
 * - React Query for data fetching with caching
 * - Virtualization for lists >30 items
 * - Prefetching for instant navigation
 */
export default function PostsSection({
  userId,
  bbox = null,
  onEdit,
  onDelete,
  onShowQR,
  onEnterToken,
  onViewDetail,
}) {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [expandedSections, setExpandedSections] = useState({
    rescue: true,
    lost: true,
    adopt: true,
  });
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const statusDropdownRef = useRef(null);
  const sortDropdownRef = useRef(null);

  // React Query hooks for each type
  const rescueQuery = usePostsByType('rescue', {
    userId,
    bbox,
    status: statusFilter,
    enabled: expandedSections.rescue && (activeFilter === 'all' || activeFilter === 'rescue'),
  });

  const lostQuery = usePostsByType('lost', {
    userId,
    bbox,
    status: statusFilter,
    enabled: expandedSections.lost && (activeFilter === 'all' || activeFilter === 'lost'),
  });

  const adoptQuery = usePostsByType('adopt', {
    userId,
    bbox,
    status: statusFilter,
    enabled: expandedSections.adopt && (activeFilter === 'all' || activeFilter === 'adopt'),
  });

  // Combined loading and error states
  const isLoading = rescueQuery.isLoading || lostQuery.isLoading || adoptQuery.isLoading;
  const error = rescueQuery.error?.message || lostQuery.error?.message || adoptQuery.error?.message || '';

  // Combine posts from all queries
  const postsByType = {
    rescue: rescueQuery.data || [],
    lost: lostQuery.data || [],
    adopt: adoptQuery.data || [],
  };

  // Collapse/Expand all sections
  const collapseAll = () => {
    setExpandedSections({ rescue: false, lost: false, adopt: false });
  };

  const expandAll = () => {
    setExpandedSections({ rescue: true, lost: true, adopt: true });
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) {
        setShowStatusDropdown(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
        setShowSortDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync URL with current filter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const t = params.get('type');
    if (t && ['adopt', 'lost', 'rescue'].includes(t)) {
      setActiveFilter(t);
    }
  }, []);

  // Update URL when filter changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (activeFilter === 'all') {
      if (params.has('type')) {
        params.delete('type');
        const newUrl = location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.replaceState(null, '', newUrl);
      }
    } else {
      params.set('type', activeFilter);
      window.history.replaceState(null, '', location.pathname + '?' + params.toString());
    }
  }, [activeFilter]);

  // Smart section expansion when filter changes
  useEffect(() => {
    if (activeFilter !== 'all') {
      // When filtering by type, only expand that section
      setExpandedSections({
        rescue: activeFilter === 'rescue',
        lost: activeFilter === 'lost',
        adopt: activeFilter === 'adopt',
      });
    }
  }, [activeFilter]);

  // Prefetch logic: prefetch other types when panel opens
  useEffect(() => {
    if (!userId) return;
    
    const typesToPrefetch = TYPE_ORDER.filter(t => {
      if (activeFilter === 'all') return true;
      return t !== activeFilter;
    });

    typesToPrefetch.forEach(type => {
      queryClient.prefetchQuery({
        queryKey: getPostsQueryKey({ type, userId, bbox, status: statusFilter }),
        queryFn: () => import('../api/posts').then(m => m.fetchPosts({ type, userId, bbox, status: statusFilter })),
      });
    });
  }, [userId, bbox, statusFilter, activeFilter, queryClient]);

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

  // Loading state
  if (isLoading && !rescueQuery.data && !lostQuery.data && !adoptQuery.data) {
    return (
      <div className="py-4">
        <div className="mb-4 h-8 bg-gray-200 rounded animate-pulse w-full"></div>
        <LoadingSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-6 px-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-sm text-red-800">{error}</div>
      </div>
    );
  }

  // Check if all sections are empty
  const totalPosts = postsByType.rescue.length + postsByType.lost.length + postsByType.adopt.length;
  if (totalPosts === 0 && !isLoading) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        Chưa có bài đăng nào.
      </div>
    );
  }

  return (
    <div>
      {/* Filter Chips */}
      <FilterChips />

      {/* Status & Sort Controls + Collapse/Expand All */}
      <div className="flex gap-2 mb-4 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <StatusDropdown />
          <SortDropdown />
        </div>
        {activeFilter === 'all' && (
          <div className="flex gap-2">
            <button
              onClick={collapseAll}
              className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-600"
            >
              Thu gọn tất cả
            </button>
            <button
              onClick={expandAll}
              className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-600"
            >
              Mở tất cả
            </button>
          </div>
        )}
      </div>

      {/* Sections */}
      <div>
        {TYPE_ORDER.map((type) => {
          // If filter is set and doesn't match, skip rendering
          if (activeFilter !== 'all' && activeFilter !== type) {
            return null;
          }
          return renderSection(type);
        })}
      </div>
    </div>
  );
}
