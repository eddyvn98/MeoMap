import React from 'react';
import PostsSection from '../PostsSection';

/**
 * PostsTab - Display user's posts with edit/delete/QR actions
 */
export function PostsTab({
  userId,
  mapBbox,
  onViewDetail,
}) {
  return (
    <PostsSection
      userId={userId}
      bbox={mapBbox}
      onEdit={(post) => {
        alert(`Chỉnh sửa bài: ${post.name}`);
      }}
      onDelete={(post) => {
        if (confirm(`Xóa bài ${post.name}?`)) {
          alert('Xóa bài thành công (TODO: implement API call)');
        }
      }}
      onShowQR={(post) => {
        alert(`Hiện QR cho bài: ${post.name}`);
      }}
      onEnterToken={(post) => {
        const token = prompt("Nhập token:");
        if (token) {
          alert(`Gửi token cho bài: ${post.name}`);
        }
      }}
      onViewDetail={(post) => {
        onViewDetail(post);
      }}
    />
  );
}

