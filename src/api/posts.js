import { localApi } from "../localClient";
import { CLOSED_STATUSES, OPEN_STATUSES } from "../utils/petStatus";

export async function fetchPosts({ type, userId, bbox, status }) {
  let query = localApi.from("pets").select("*");

  if (type && type !== "all") query = query.eq("category", type);
  if (userId) query = query.eq("owner_id", userId);

  if (status === "open") {
    query = query.in("status", OPEN_STATUSES);
  } else if (status === "closed") {
    query = query.in("status", CLOSED_STATUSES);
  } else if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (bbox && bbox.length === 4) {
    const [minLng, minLat, maxLng, maxLat] = bbox.map(Number);
    if ([minLng, minLat, maxLng, maxLat].every(Number.isFinite)) {
      query = query
        .gte("lng", minLng)
        .lte("lng", maxLng)
        .gte("lat", minLat)
        .lte("lat", maxLat);
    }
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) throw new Error(error.message);
  return data || [];
}

export function getPostsQueryKey({ type, userId, bbox, status }) {
  return ["posts", type, userId, bbox?.join(","), status];
}
