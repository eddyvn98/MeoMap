import { useQuery } from '@tanstack/react-query';
import { fetchPosts, getPostsQueryKey } from '../api/posts';

/**
 * Hook to fetch posts by type with React Query
 * @param {string} type - Post type: 'rescue', 'lost', 'adopt', 'all'
 * @param {Object} options - Query options
 * @param {string} options.userId - Filter by owner_id
 * @param {Array<number>} options.bbox - Bounding box [minLng, minLat, maxLng, maxLat]
 * @param {string} options.status - Filter by status
 * @param {boolean} options.enabled - Enable/disable query
 */
export function usePostsByType(type, options = {}) {
  const { userId, bbox, status, enabled = true } = options;

  return useQuery({
    queryKey: getPostsQueryKey({ type, userId, bbox, status }),
    queryFn: () => fetchPosts({ type, userId, bbox, status }),
    enabled: enabled && !!type,
    staleTime: 1000 * 60, // 1 minute
    cacheTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch all posts (for "all" filter)
 */
export function useAllPosts(options = {}) {
  const { userId, bbox, status, enabled = true } = options;

  return useQuery({
    queryKey: getPostsQueryKey({ type: 'all', userId, bbox, status }),
    queryFn: () => fetchPosts({ type: 'all', userId, bbox, status }),
    enabled: enabled,
    staleTime: 1000 * 60,
    cacheTime: 1000 * 60 * 5,
  });
}
