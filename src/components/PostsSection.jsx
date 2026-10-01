import React, { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as ReactWindow from 'react-window';
import { usePostsByType, useAllPosts } from '../hooks/usePosts';
import { getPostsQueryKey } from '../api/posts';
import PostCard from './PostCard';
import { TYPE_ORDER, createPostsSectionRenderers } from './PostsSectionParts';

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

  const {
    renderSection,
    FilterChips,
    StatusDropdown,
    SortDropdown,
    LoadingSkeleton,
  } = createPostsSectionRenderers({
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
  });
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
