# Phase 1 Refactoring - HOÀN TẤT ✅

## Đã tạo các file mới:

### 1. ✅ PostDetailModal.jsx  
**Vị trí**: `src/components/ProfileDrawer/PostDetailModal.jsx`
**Kích thước**: ~800 dòng
**Chức năng**: Hiển thị chi tiết bài đăng với adoption timeline, requests, và requester view

### 2. ✅ ScanDeliveryModal.jsx
**Vị trí**: `src/components/ProfileDrawer/ScanDeliveryModal.jsx`  
**Kích thước**: ~130 dòng
**Chức năng**: Modal quét/nhập mã QR xác nhận giao mèo

### 3. ✅ index.js đã cập nhật
Đã thêm exports cho 2 modal components mới

---

## HƯỚNG DẪN TÍCH HỢP VÀO PROFILEDRAWER.JSX

### Bước 1: Cập nhật imports (dòng 1-6)

**THAY THẾ:**
```javascript
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { QRCodeSVG } from "qrcode.react";
import PostsSection from "./PostsSection";
import { sendDeliveryNotification, sendOwnerReminderEmail } from "../services/emailService";
import AdoptionActivityTimeline from "./AdoptionActivityTimeline";
```

**BẰNG:**
```javascript
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { sendDeliveryNotification } from "../services/emailService";
import { 
  useProfileData, 
  useAdoptionRequests, 
  useKeyboardTrap, 
  usePendingTasks,
  useDepositCountdown 
} from "../hooks";
import {
  OverviewTab,
  PostsTab,
  MyAdoptionsTab,
  SettingsTab,
  PostDetailModal,
  ScanDeliveryModal
} from "./ProfileDrawer/index.js";
```

### Bước 2: Xóa states không cần thiết (sau dòng ~40)

**XÓA CÁC DÒNG:**
```javascript
const [scanInput, setScanInput] = useState('');
const [scanError, setScanError] = useState('');
```

**GIỮ LẠI:**
```javascript
const [showScanModal, setShowScanModal] = useState(false);
const [scanRequestId, setScanRequestId] = useState(null);
```

### Bước 3: Thêm handler mới cho modals (sau dòng ~100)

**THÊM SAU `useKeyboardTrap(...)`:**
```javascript
// Handler for owner canceling adoption request
const handleOwnerCancelRequest = async (requestId) => {
  if (!confirm('Hủy yêu cầu này? Token giao mèo sẽ bị thu hồi và chuyển sang người khác.')) return;
  
  try {
    const { error } = await supabase
      .from('adoption_requests')
      .update({ 
        status: 'pending',
        owner_confirmed_meet: false,
        owner_confirmed_at: null,
        delivery_token: null,
        token_generated_at: null,
      })
      .eq('id', requestId);
    
    if (error) throw error;
    alert('Đã hủy yêu cầu. Token được phát hành lại cho người khác.');
    
    // Reload adoption requests...
    if (selectedPost) {
      const { data } = await supabase
        .from('adoption_requests')
        .select(`*, requester:profiles!requester_id(*)`)
        .eq('pet_id', selectedPost.id)
        .order('created_at', { ascending: false });
      
      if (data) {
        // Load reputation...
        const requesterIds = data.map(r => r.requester_id);
        const { data: repData } = await supabase
          .from('user_reputation')
          .select('*')
          .in('user_id', requesterIds);
        
        const repMap = {};
        repData?.forEach(rep => { repMap[rep.user_id] = rep; });
        data.forEach(req => {
          req.requester_rep = repMap[req.requester_id] || { ok_trades: 0, bad_trades: 0, total_trades: 0 };
        });
        
        setAdoptionRequests(data);
      }
    }
  } catch (err) {
    alert('Lỗi: ' + err.message);
  }
};

// Handler for confirming delivery with scan
const handleConfirmDelivery = async (tokenInput, requestId) => {
  try {
    let token = tokenInput;
    try {
      const parsed = JSON.parse(tokenInput);
      token = parsed.delivery_token || tokenInput;
    } catch {}

    const { data: request, error: reqErr } = await supabase
      .from('adoption_requests')
      .select('*, requester:profiles!requester_id(*)')
      .eq('delivery_token', token)
      .eq('id', requestId)
      .single();

    if (reqErr || !request) {
      throw new Error('Mã không khớp với yêu cầu này');
    }

    const checkInDays = 30;
    const checkInDueDate = new Date();
    checkInDueDate.setDate(checkInDueDate.getDate() + checkInDays);
    
    const { error: updateErr } = await supabase
      .from('adoption_requests')
      .update({ 
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        checkin_required_at: checkInDueDate.toISOString(),
        checkin_days: checkInDays
      })
      .eq('id', requestId);

    if (updateErr) throw updateErr;

    // Send email notification...
    try {
      await sendDeliveryNotification({
        adoptionId: requestId,
        petName: selectedPost?.name || 'mèo',
        ownerName: profile?.display_name || 'Chủ bài',
        receiverName: request.requester?.display_name || 'Bạn',
        receiverEmail: request.requester?.email || ''
      });
    } catch (emailErr) {
      console.error('Email error:', emailErr);
    }

    alert('Đã xác nhận giao mèo thành công!');
    setShowScanModal(false);

    // Reload adoption requests...
    if (selectedPost) {
      const { data: updated } = await supabase
        .from('adoption_requests')
        .select(`*, requester:profiles!requester_id(*)`)
        .eq('pet_id', selectedPost.id)
        .order('created_at', { ascending: false });
      
      if (updated) {
        const withReputation = await Promise.all(
          updated.map(async (req) => {
            const { data: rep } = await supabase
              .from('user_reputation')
              .select('*')
              .eq('user_id', req.requester_id)
              .single();
            return { ...req, requester_rep: rep };
          })
        );
        setAdoptionRequests(withReputation);
      }
    }

    // Refresh myAdoptionRequest if needed
    if (request.requester_id === user?.id) {
      const { data: mine } = await supabase
        .from('adoption_requests')
        .select('*')
        .eq('id', requestId)
        .single();
      if (mine) setMyAdoptionRequest(mine);
    }
  } catch (err) {
    throw err;
  }
};

// Handler to open scan modal
const handleOpenScanModal = (requestId) => {
  setScanRequestId(requestId);
  setShowScanModal(true);
};
```

### Bước 4: XÓA phần modal cũ (dòng ~1285-2555)

**TÌM VÀ XÓA TOÀN BỘ:**
```javascript
{/* Post Detail Modal - Overlay on top of posts tab */}
{selectedPost && activeTab === "posts" && (
  <div style={{ ... }}>
    {/* ... ~1200 dòng code ... */}
  </div>
)}
```

**TỪ DÒNG ~1285 ĐẾN DÒNG ~2555**

### Bước 5: THÊM modal components mới (vị trí sau `renderTabContent()`)

**THÊM SAU DÒNG `{renderTabContent()}`:**
```javascript
{renderTabContent()}

{/* Post Detail Modal */}
{selectedPost && activeTab === "posts" && (
  <PostDetailModal
    post={selectedPost}
    onClose={() => setSelectedPost(null)}
    adoptionRequests={adoptionRequests}
    myAdoptionRequest={myAdoptionRequest}
    user={user}
    profile={profile}
    loadingRequests={loadingRequests}
    deposits={deposits}
    sortBy={sortBy}
    onSortChange={setSortBy}
    onAcceptRequest={handleAcceptRequest}
    onRejectRequest={handleRejectRequest}
    onConfirmMeeting={handleConfirmMeeting}
    onOwnerCancelRequest={handleOwnerCancelRequest}
    onScanDelivery={handleOpenScanModal}
    onAdoptionRequestsChange={setAdoptionRequests}
    onMyAdoptionRequestChange={setMyAdoptionRequest}
  />
)}

{/* Scan Delivery Modal */}
<ScanDeliveryModal
  isOpen={showScanModal}
  onClose={() => setShowScanModal(false)}
  onConfirm={handleConfirmDelivery}
  requestId={scanRequestId}
/>
```

### Bước 6: XÓA phần Scan QR Modal cũ (dòng ~2557-2620)

**TÌM VÀ XÓA:**
```javascript
{/* Scan Delivery QR Modal */}
{showScanModal && (
  <div style={{ ... }}>
    {/* ... modal code ... */}
  </div>
)}
```

---

## KẾT QUẢ DỰ KIẾN

- **Giảm ~1300 dòng** từ ProfileDrawer.jsx  
- File ProfileDrawer.jsx còn **~1370 dòng** (từ 2670 → 1370)
- 2 modal components độc lập, dễ maintain
- Props được truyền rõ ràng, dễ debug

---

## LƯU Ý QUAN TRỌNG ⚠️

1. **Cẩn thận với setAdoptionRequests và setMyAdoptionRequest**  
   - Phải đảm bảo custom hook `useAdoptionRequests` export các setters này
   - Nếu không có, cần thêm vào hook

2. **Test các tính năng sau khi refactor:**
   - Xem chi tiết bài đăng
   - Accept/reject adoption request
   - Quét mã QR delivery
   - Xác nhận check-in sau giao mèo
   - Sort adoption requests

3. **Nếu có lỗi compilation:**
   - Kiểm tra lại imports
   - Kiểm tra props được truyền vào modals
   - Đảm bảo useAdoptionRequests hook trả về đầy đủ setters

---

## NEXT STEPS (Phase 2-4)

Sau khi hoàn thành Phase 1 và test OK, có thể tiếp tục:

- **Phase 2**: Tách UI components (DrawerHeader, TabNavigation)  
- **Phase 3**: Tách business logic (useAdoptionActions hook, helpers)
- **Phase 4**: Tách adoption components (Timeline, RequestCard)

---

✅ **Phase 1 components đã sẵn sàng để tích hợp!**
