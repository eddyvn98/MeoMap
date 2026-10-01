export const TYPE_ORDER = ['rescue', 'lost', 'adopt'];
export const TYPE_LABEL = {
  adopt: 'Cho nhận',
  lost: 'Thất lạc',
  rescue: 'Giải cứu',
};

export const TYPE_ICON = {
  adopt: '🏡',
  lost: '📍',
  rescue: '🚑',
};

// Status options
export const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'available', label: 'Có sẵn' },
  { value: 'pending_coc', label: 'Chờ cọc' },
  { value: 'pending_qr', label: 'Chờ QR' },
  { value: 'closed', label: 'Đã đóng' },
  { value: 'urgent', label: 'Khẩn cấp' },
];

// Sort options
export const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
];

