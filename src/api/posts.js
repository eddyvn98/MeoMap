import { localApi } from '../localClient';

/**
 * Fetch posts from local server with filters
 * @param {Object} options - Query options
 * @param {string} options.type - Post type: 'rescue', 'lost', 'adopt'
 * @param {string} options.userId - Filter by owner_id
 * @param {Array<number>} options.bbox - Bounding box [minLng, minLat, maxLng, maxLat]
 * @param {string} options.status - Filter by status
 * @returns {Promise<Array>} Array of posts
 */
export async function fetchPosts({ type, userId, bbox, status }) {
  let query = localApi.from('pets').select('*');

  // Filter by type (category)
  if (type && type !== 'all') {
    query = query.eq('category', type);
  }

  // Filter by owner (for user's own posts)
  if (userId) {
    query = query.eq('owner_id', userId);
  }

  // Filter by status
  if (status && status !== 'all') {
    if (status === 'open') {
      query = query.in('status', ['available', 'Lost', 'Found', 'Abandoned']);
    } else {
      query = query.eq('status', status);
    }
  }

  // Filter by bounding box (map viewport)
  if (bbox && bbox.length === 4) {
    const [minLng, minLat, maxLng, maxLat] = bbox;
    query = query
      .gte('lng', minLng)
      .lte('lng', maxLng)
      .gte('lat', minLat)
      .lte('lat', maxLat);
  }

  // Order by created_at descending
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching posts:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Get query key for React Query
 */
export function getPostsQueryKey({ type, userId, bbox, status }) {
  return ['posts', type, userId, bbox?.join(','), status];
}
