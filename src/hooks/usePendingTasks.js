import { useEffect, useState } from 'react';

/**
 * Hook để compute pending tasks dựa trên adoption requests status
 * @param {Array} adoptionRequests - Danh sách adoption requests
 * @param {Object} myAdoptionRequest - My adoption request
 * @returns {Array} Array of pending tasks
 */
export const usePendingTasks = (adoptionRequests, myAdoptionRequest) => {
  const [pendingTasks, setPendingTasks] = useState([]);

  useEffect(() => {
    const tasks = [];

    // Check my adoption request status
    if (myAdoptionRequest) {
      if (myAdoptionRequest.status === 'pending') {
        tasks.push({
          id: 'my-pending',
          title: 'Đợi chủ bài phản hồi',
          priority: 'high',
          icon: '⏳'
        });
      }
      if (myAdoptionRequest.status === 'accepted') {
        tasks.push({
          id: 'my-accepted',
          title: 'Đã được chấp nhận - chuẩn bị gặp',
          priority: 'high',
          icon: '✅'
        });
      }
      if (myAdoptionRequest.status === 'delivered') {
        if (!myAdoptionRequest.receiver_confirmed_checkin) {
          tasks.push({
            id: 'my-checkin',
            title: 'Xác nhận mèo đã nhận',
            priority: 'high',
            icon: '📋'
          });
        }
      }
    }

    // Check owner's pending deliveries (for owner view)
    const needsDeliveryConfirm = adoptionRequests?.some(
      r => r.status === 'delivered' && !r.receiver_confirmed_checkin
    );
    if (needsDeliveryConfirm) {
      tasks.push({
        id: 'delivery-confirm',
        title: 'Chờ người nhận xác nhận',
        priority: 'medium',
        icon: '📦'
      });
    }

    setPendingTasks(tasks);
  }, [adoptionRequests, myAdoptionRequest]);

  return pendingTasks;
};
