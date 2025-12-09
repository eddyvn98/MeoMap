/**
 * Component: ReputationCard
 * Hiển thị thông tin danh tiếng và hành vi của user
 */

import React from 'react';
import { useReputationInfo } from '../hooks/useAdoptionNotifications';

export default function ReputationCard({ userId }) {
  const { reputation, loading } = useReputationInfo(userId);

  if (loading) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#999' }}>
        ⏳ Đang tải...
      </div>
    );
  }

  if (!reputation) {
    return null;
  }

  const getReputationColor = (score) => {
    if (score >= 90) return '#10b981'; // green
    if (score >= 70) return '#f59e0b'; // amber
    if (score >= 50) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const getReputationLabel = (score) => {
    if (score >= 90) return 'Xuất sắc';
    if (score >= 70) return 'Tốt';
    if (score >= 50) return 'Bình thường';
    return 'Cần cải thiện';
  };

  return (
    <div
      style={{
        padding: 16,
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        marginBottom: 16
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 12, color: '#1f2937' }}>
        📊 Danh tiếng
      </div>

      {/* Reputation Score */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: '#666' }}>Điểm danh tiếng</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: getReputationColor(reputation.reputation_score)
            }}
          >
            {reputation.reputation_score}/100
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: 8,
            background: '#e5e7eb',
            borderRadius: 4,
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: `${(reputation.reputation_score / 100) * 100}%`,
              height: '100%',
              background: getReputationColor(reputation.reputation_score),
              transition: 'width 0.3s'
            }}
          />
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#666',
            marginTop: 4
          }}
        >
          {getReputationLabel(reputation.reputation_score)}
        </div>
      </div>

      {/* No-show & Late Count */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div
          style={{
            padding: 8,
            background: '#fff',
            borderRadius: 6,
            border: '1px solid #e5e7eb'
          }}
        >
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
            ❌ Không tới
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: reputation.no_show_count > 0 ? '#ef4444' : '#10b981'
            }}
          >
            {reputation.no_show_count}
          </div>
        </div>
        <div
          style={{
            padding: 8,
            background: '#fff',
            borderRadius: 6,
            border: '1px solid #e5e7eb'
          }}
        >
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
            ⏱️ Đến muộn
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: reputation.late_count > 0 ? '#f59e0b' : '#10b981'
            }}
          >
            {reputation.late_count}
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div
        style={{
          fontSize: 11,
          color: '#999',
          marginTop: 8,
          textAlign: 'right'
        }}
      >
        Cập nhật: {new Date(reputation.reputation_updated_at).toLocaleDateString('vi-VN')}
      </div>

      {/* Warning */}
      {reputation.reputation_score < 50 && (
        <div
          style={{
            padding: 8,
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: 6,
            marginTop: 12,
            fontSize: 12,
            color: '#7f1d1d'
          }}
        >
          ⚠️ Danh tiếng của bạn có thể ảnh hưởng đến khả năng nhận/giao mèo. Hãy cải thiện hành vi của bạn.
        </div>
      )}
    </div>
  );
}
