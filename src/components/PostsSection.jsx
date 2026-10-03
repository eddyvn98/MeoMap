import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePostsByType } from "../hooks/usePosts";
import { getPostsQueryKey } from "../api/posts";
import PostsSectionView, {
  PostsLoading,
  TYPE_ORDER,
} from "./posts/PostsSectionView";

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
  const [activeFilter, setActiveFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [expandedSections, setExpandedSections] = useState({
    rescue: true,
    lost: true,
    adopt: true,
  });
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const statusDropdownRef = useRef(null);
  const sortDropdownRef = useRef(null);

  const rescueQuery = usePostsByType("rescue", {
    userId,
    bbox,
    status: statusFilter,
    enabled:
      expandedSections.rescue &&
      (activeFilter === "all" || activeFilter === "rescue"),
  });

  const lostQuery = usePostsByType("lost", {
    userId,
    bbox,
    status: statusFilter,
    enabled:
      expandedSections.lost &&
      (activeFilter === "all" || activeFilter === "lost"),
  });

  const adoptQuery = usePostsByType("adopt", {
    userId,
    bbox,
    status: statusFilter,
    enabled:
      expandedSections.adopt &&
      (activeFilter === "all" || activeFilter === "adopt"),
  });

  const isLoading =
    rescueQuery.isLoading || lostQuery.isLoading || adoptQuery.isLoading;
  const error =
    rescueQuery.error?.message ||
    lostQuery.error?.message ||
    adoptQuery.error?.message ||
    "";

  const postsByType = {
    rescue: rescueQuery.data || [],
    lost: lostQuery.data || [],
    adopt: adoptQuery.data || [],
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target)
      ) {
        setShowStatusDropdown(false);
      }
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target)
      ) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get("type");
    if (type && ["adopt", "lost", "rescue"].includes(type)) {
      setActiveFilter(type);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    if (activeFilter === "all") {
      if (params.has("type")) {
        params.delete("type");
        const nextUrl =
          location.pathname +
          (params.toString() ? "?" + params.toString() : "");
        window.history.replaceState(null, "", nextUrl);
      }
      return;
    }

    params.set("type", activeFilter);
    window.history.replaceState(
      null,
      "",
      location.pathname + "?" + params.toString(),
    );
  }, [activeFilter]);

  useEffect(() => {
    if (activeFilter === "all") return;
    setExpandedSections({
      rescue: activeFilter === "rescue",
      lost: activeFilter === "lost",
      adopt: activeFilter === "adopt",
    });
  }, [activeFilter]);

  useEffect(() => {
    if (!userId) return;

    const typesToPrefetch = TYPE_ORDER.filter((type) =>
      activeFilter === "all" ? true : type !== activeFilter,
    );

    typesToPrefetch.forEach((type) => {
      queryClient.prefetchQuery({
        queryKey: getPostsQueryKey({
          type,
          userId,
          bbox,
          status: statusFilter,
        }),
        queryFn: () =>
          import("../api/posts").then((module) =>
            module.fetchPosts({
              type,
              userId,
              bbox,
              status: statusFilter,
            }),
          ),
      });
    });
  }, [userId, bbox, statusFilter, activeFilter, queryClient]);

  const sortPosts = (posts) => {
    const next = [...posts];
    return next.sort((a, b) =>
      sortBy === "newest"
        ? new Date(b.updated_at || b.created_at) -
          new Date(a.updated_at || a.created_at)
        : new Date(a.updated_at || a.created_at) -
          new Date(b.updated_at || b.created_at),
    );
  };

  const visiblePosts = {
    rescue: sortPosts(postsByType.rescue),
    lost: sortPosts(postsByType.lost),
    adopt: sortPosts(postsByType.adopt),
  };

  const toggleSection = (type) => {
    setExpandedSections((current) => ({
      ...current,
      [type]: !current[type],
    }));
  };

  if (
    isLoading &&
    !rescueQuery.data &&
    !lostQuery.data &&
    !adoptQuery.data
  ) {
    return <PostsLoading />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6">
        <div className="text-sm text-red-800">{error}</div>
      </div>
    );
  }

  const totalPosts =
    postsByType.rescue.length +
    postsByType.lost.length +
    postsByType.adopt.length;

  if (totalPosts === 0 && !isLoading) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        Chưa có bài đăng nào.
      </div>
    );
  }

  return (
    <PostsSectionView
      activeFilter={activeFilter}
      setActiveFilter={setActiveFilter}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      sortBy={sortBy}
      setSortBy={setSortBy}
      expandedSections={expandedSections}
      toggleSection={toggleSection}
      collapseAll={() =>
        setExpandedSections({ rescue: false, lost: false, adopt: false })
      }
      expandAll={() =>
        setExpandedSections({ rescue: true, lost: true, adopt: true })
      }
      postsByType={visiblePosts}
      statusDropdown={{
        open: showStatusDropdown,
        setOpen: setShowStatusDropdown,
        dropdownRef: statusDropdownRef,
      }}
      sortDropdown={{
        open: showSortDropdown,
        setOpen: setShowSortDropdown,
        dropdownRef: sortDropdownRef,
      }}
      actions={{
        onEdit,
        onDelete,
        onShowQR,
        onEnterToken,
        onViewDetail,
      }}
    />
  );
}
