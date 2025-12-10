# ProfileDrawer Refactoring Plan - Tách Nhỏ Thành Các Component Riêng

## 📊 Tình Trạng Hiện Tại
- **File:** `src/components/ProfileDrawer.jsx`
- **Dòng code:** 2,551 dòng
- **States:** 20+ states
- **Handlers:** 10+ functions
- **Tabs:** 4 tabs (overview, posts, my-adoptions, settings)
- **Vấn đề:** Quá dài, khó maintain, khó test

---

## 🎯 Kế Hoạch Tách Nhỏ (Phase 1-3)

### **PHASE 1: Tách Custom Hooks (Tuần 1)**

#### Hook 1: `useProfileData` (120 dòng)
**Chức năng:** Load user & profile data
```jsx
// src/hooks/useProfileData.ts
const useProfileData = (isOpen) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  useEffect(() => {
    if (!isOpen) return;
    // Load user + profile from supabase
  }, [isOpen]);
  
  return { user, profile, isLoading, error };
};
```

#### Hook 2: `useAdoptionRequests` (150 dòng)
**Chức năng:** Load & manage adoption requests
```jsx
// src/hooks/useAdoptionRequests.ts
const useAdoptionRequests = (selectedPost, user) => {
  const [adoptionRequests, setAdoptionRequests] = useState([]);
  const [myAdoptionRequest, setMyAdoptionRequest] = useState(null);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [deposits, setDeposits] = useState({});
  
  useEffect(() => {
    if (!selectedPost) return;
    // Load adoption requests + deposits
  }, [selectedPost, user]);
  
  return {
    adoptionRequests,
    myAdoptionRequest,
    deposits,
    loadingRequests,
    handleAcceptRequest,
    handleRejectRequest,
    handleConfirmMeeting
  };
};
```

#### Hook 3: `useKeyboardTrap` (60 dòng)
**Chức năng:** Focus trap & keyboard shortcuts
```jsx
// src/hooks/useKeyboardTrap.ts
const useKeyboardTrap = (isOpen, drawerRef, onClose) => {
  // Focus trap, ESC to close, Tab navigation
  useEffect(() => {
    if (!isOpen) return;
    // Implement trap logic
  }, [isOpen, drawerRef, onClose]);
};
```

#### Hook 4: `usePendingTasks` (80 dòng)
**Chức năng:** Compute pending tasks
```jsx
// src/hooks/usePendingTasks.ts
const usePendingTasks = (adoptionRequests, myAdoptionRequest) => {
  const [pendingTasks, setPendingTasks] = useState([]);
  
  useEffect(() => {
    // Compute tasks based on state
  }, [adoptionRequests, myAdoptionRequest]);
  
  return pendingTasks;
};
```

---

### **PHASE 2: Tách Tab Components (Tuần 2)**

#### Component 1: `OverviewTab.jsx` (200 dòng)
**File:** `src/components/ProfileTabs/OverviewTab.jsx`
```jsx
export default function OverviewTab({
  profile,
  pendingTasks,
  adoptionRequests,
  selectedPost,
  setSelectedPost
}) {
  return (
    <div>
      {/* Profile info section */}
      {/* Pending tasks section */}
      {/* Quick actions section */}
    </div>
  );
}
```

#### Component 2: `PostsTab.jsx` (400 dòng)
**File:** `src/components/ProfileTabs/PostsTab.jsx`
```jsx
export default function PostsTab({
  profile,
  user,
  selectedPost,
  setSelectedPost
}) {
  return (
    <div>
      {/* Posts list OR Post detail modal */}
    </div>
  );
}
```

#### Component 3: `MyAdoptionsTab.jsx` (600 dòng)
**File:** `src/components/ProfileTabs/MyAdoptionsTab.jsx`
```jsx
export default function MyAdoptionsTab({
  myAdoptionRequest,
  profile,
  user,
  adoptionRequests,
  handleConfirmDelivery,
  // ... all handlers
}) {
  return (
    <div>
      {/* My adoption request detail */}
      {/* Adoption requests list with cards */}
    </div>
  );
}
```

#### Component 4: `SettingsTab.jsx` (50 dòng)
**File:** `src/components/ProfileTabs/SettingsTab.jsx`
```jsx
export default function SettingsTab({ profile }) {
  return (
    <div>
      {/* Settings placeholder */}
    </div>
  );
}
```

---

### **PHASE 3: Tách Sub-Components (Tuần 3)**

#### Sub-Component 1: `AdoptionRequestCard.jsx` (300 dòng)
**File:** `src/components/AdoptionRequest/AdoptionRequestCard.jsx`
```jsx
export default function AdoptionRequestCard({
  request,
  depositInfo,
  requesterRep,
  onAccept,
  onReject,
  onConfirmMeeting,
  onScanQR,
  // ...
}) {
  // Requester info + stats
  // Status badges
  // Contact info (conditional)
  // Meeting confirmation
  // Action buttons
}
```

#### Sub-Component 2: `CheckinStatus.jsx` (200 dòng)
**File:** `src/components/AdoptionRequest/CheckinStatus.jsx`
```jsx
export default function CheckinStatus({
  request,
  isOwner,
  onRemind,
  onConfirm
}) {
  // Countdown timer
  // Progress checklist
  // Remind button
  // Confirm button
}
```

#### Sub-Component 3: `DepositWidget.jsx` (100 dòng)
**File:** `src/components/Deposits/DepositWidget.jsx`
```jsx
export default function DepositWidget({
  amount,
  status,
  locked_until,
  rating_type
}) {
  // Display deposit info with status badge
}
```

#### Sub-Component 4: `PostDetailModal.jsx` (250 dòng)
**File:** `src/components/Posts/PostDetailModal.jsx`
```jsx
export default function PostDetailModal({
  post,
  user,
  onClose,
  adoptionRequests
}) {
  // Post image + info
  // Adoption requests section
  // Action buttons
}
```

#### Sub-Component 5: `ScanQRModal.jsx` (100 dòng)
**File:** `src/components/Modals/ScanQRModal.jsx`
```jsx
export default function ScanQRModal({
  isOpen,
  onConfirm,
  onClose,
  requestId
}) {
  // QR code scanner input
  // Confirm/Cancel buttons
}
```

---

## 📁 New Folder Structure

```
src/components/
├── ProfileDrawer.jsx                 // Main component (600 dòng)
├── ProfileTabs/
│   ├── OverviewTab.jsx              (200 dòng)
│   ├── PostsTab.jsx                 (250 dòng)
│   ├── MyAdoptionsTab.jsx           (400 dòng)
│   └── SettingsTab.jsx              (50 dòng)
├── AdoptionRequest/
│   ├── AdoptionRequestCard.jsx      (300 dòng)
│   ├── CheckinStatus.jsx            (200 dòng)
│   └── AdoptionRequestList.jsx      (200 dòng)
├── Deposits/
│   ├── DepositWidget.jsx            (100 dòng)
│   └── DepositList.jsx              (100 dòng)
├── Posts/
│   ├── PostDetailModal.jsx          (250 dòng)
│   ├── PostCard.jsx                 (150 dòng)
│   └── PostsList.jsx                (150 dòng)
├── Modals/
│   ├── ScanQRModal.jsx              (100 dòng)
│   └── ConfirmModal.jsx             (80 dòng)
└── hooks/
    ├── useProfileData.ts            (120 dòng)
    ├── useAdoptionRequests.ts       (150 dòng)
    ├── useKeyboardTrap.ts           (60 dòng)
    ├── usePendingTasks.ts           (80 dòng)
    └── useDepositCountdown.ts       (70 dòng)
```

---

## 📈 Lợi Ích

| Khía Cạnh | Trước | Sau |
|-----------|-------|-----|
| Dòng code main file | 2,551 | 600 |
| Số files | 1 | 18 |
| Testability | Khó | Dễ |
| Reusability | Thấp | Cao |
| Maintenance | Khó | Dễ |
| Performance | Bình thường | Tốt hơn (lazy load) |

---

## 🚀 Thực Hiện

### **Week 1: Hooks & Infrastructure**
- [ ] Tạo `useProfileData` hook
- [ ] Tạo `useAdoptionRequests` hook
- [ ] Tạo `useKeyboardTrap` hook
- [ ] Tạo `usePendingTasks` hook
- [ ] Test hooks độc lập

### **Week 2: Tab Components**
- [ ] Tạo `OverviewTab` component
- [ ] Tạo `PostsTab` component
- [ ] Tạo `MyAdoptionsTab` component
- [ ] Tạo `SettingsTab` component
- [ ] Integrate vào main component

### **Week 3: Sub-Components & Polish**
- [ ] Tạo `AdoptionRequestCard` component
- [ ] Tạo `CheckinStatus` component
- [ ] Tạo `DepositWidget` component
- [ ] Tạo `PostDetailModal` component
- [ ] Tạo `ScanQRModal` component
- [ ] Unit tests cho tất cả

---

## ✅ Checklist Khi Hoàn Thành

- [ ] ProfileDrawer chỉ còn 600 dòng
- [ ] Tất cả logic được abstract thành hooks
- [ ] Tất cả UI components được tách nhỏ
- [ ] Không có breaking changes
- [ ] Build & tests pass
- [ ] Performance ≥ current
- [ ] Code review ✅

---

## 💡 Priority
1. **High:** `useAdoptionRequests`, `MyAdoptionsTab`, `AdoptionRequestCard` (core flow)
2. **Medium:** `OverviewTab`, `PostsTab`, `useProfileData`
3. **Low:** `SettingsTab`, `ScanQRModal`, `ConfirmModal`
