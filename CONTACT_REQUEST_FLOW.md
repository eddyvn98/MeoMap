# 🤝 CONTACT REQUEST FLOW - Quy trình liên hệ nhận mèo

## 📋 Tổng quan

Flow hoàn chỉnh từ người muốn nhận đến giao mèo thành công.

## 🔄 Flow chi tiết (7 bước)

### Bước 1: Người muốn nhận → Bấm "Liên hệ nhận mèo"
**Trang:** `/pet/:id` (Receiver view)

**UI:**
```
[Nút] 📞 Liên hệ nhận mèo này
```

**Action:**
- Hiện modal xác nhận: "Bạn muốn liên hệ với chủ để nhận mèo này?"
- Nếu đồng ý → Tạo record trong bảng `adoption_requests`:
  ```javascript
  {
    pet_id: 'xxx',
    requester_id: currentUser.id,
    owner_id: pet.owner_id,
    status: 'pending',  // Chờ owner chấp nhận
    created_at: now()
  }
  ```
- Alert: "Đã gửi yêu cầu! Chờ chủ bài chấp nhận."

---

### Bước 2: Người đăng → Xem danh sách yêu cầu
**Trang:** `/pet/:id` (Owner view)

**UI:**
```
👥 Người muốn nhận (3)
├── User A - ⏳ Chờ bạn phản hồi - [Chấp nhận] [Từ chối]
├── User B - ⏳ Chờ bạn phản hồi - [Chấp nhận] [Từ chối]  
└── User C - ⏳ Chờ bạn phản hồi - [Chấp nhận] [Từ chối]
```

**Action:**
- Load danh sách từ `adoption_requests WHERE pet_id = xxx AND status = 'pending'`
- Hiển thị uy tín mỗi người (nếu có)
- Owner bấm "Chấp nhận" User B

---

### Bước 3: Owner chấp nhận → Hiện contact 2 chiều
**Action khi bấm "Chấp nhận":**

```javascript
// 1. Update request của User B
UPDATE adoption_requests
SET status = 'accepted', accepted_at = NOW()
WHERE id = request_id;

// 2. Reject các request khác
UPDATE adoption_requests
SET status = 'rejected'
WHERE pet_id = xxx AND status = 'pending' AND id != request_id;

// 3. Update pet status
UPDATE pets SET status = 'in_contact' WHERE id = xxx;
```

**UI sau khi accept (Owner view):**
```
✅ Đã chấp nhận User B

📞 Thông tin liên hệ người nhận:
- Email: user-b@email.com
- SĐT: 0909123456
- Zalo: userB

⏳ Chờ cả 2 xác nhận đã hẹn gặp

[ ] Tôi đã hẹn gặp (Owner chưa tick)
[✓] Người nhận đã xác nhận (User B đã tick)
```

**UI người nhận (User B view):**
```
✅ Chủ bài đã chấp nhận bạn!

📞 Thông tin liên hệ chủ bài:
- Email: owner@email.com
- SĐT: 0901999999

⏳ Chờ cả 2 xác nhận đã hẹn gặp

[✓] Tôi đã hẹn gặp (User B đã tick)
[ ] Chủ bài chưa xác nhận (Owner chưa tick)
```

---

### Bước 4: Người nhận xác nhận "Đã hẹn gặp"
**Action:**
```javascript
UPDATE adoption_requests
SET receiver_confirmed_meet = true, receiver_confirmed_at = NOW()
WHERE id = request_id;
```

**UI update:**
```
[✓] Tôi đã hẹn gặp
[ ] Chờ chủ bài xác nhận...
```

---

### Bước 5: Người đăng xác nhận "Đã hẹn gặp"
**Action:**
```javascript
UPDATE adoption_requests
SET owner_confirmed_meet = true, owner_confirmed_at = NOW()
WHERE id = request_id;

// Check nếu cả 2 đều confirm
IF (receiver_confirmed_meet = true AND owner_confirmed_meet = true) THEN
  // Sinh mã delivery token
  delivery_token = random_string(8);
  
  UPDATE adoption_requests
  SET 
    delivery_token = delivery_token,
    status = 'ready_to_deliver',
    token_generated_at = NOW();
END IF;
```

**UI update (cả 2 người):**
```
✅ Cả 2 đã xác nhận hẹn gặp!

📱 Mã giao mèo đã được tạo
```

---

### Bước 6: Hiện QR cho người nhận
**UI người nhận:**
```
📱 MÃ XÁC NHẬN NHẬN MÈO

[QR Code]
https://map-meo.web.app/deliver/ABC12345

Mã dự phòng: ABC12345

Hướng dẫn:
1. Khi gặp chủ bài, mở màn hình này
2. Để chủ bài quét mã QR
3. Hoàn tất giao mèo!
```

**UI owner:**
```
📱 Khi gặp người nhận:

[Nút] 📷 Quét mã QR người nhận
hoặc
[Input] Nhập mã: _________ [Xác nhận]

Sau khi quét/nhập mã → Xác nhận giao mèo thành công
```

---

### Bước 7: Owner quét QR → Xác nhận giao mèo
**Action:**

1. Owner mở `/deliver/:token` (quét QR hoặc nhập tay)
2. System verify:
   - Token đúng
   - Owner đúng người
   - Chưa delivered
3. Hiện form xác nhận cuối:
   ```
   Bạn đã giao mèo cho User B?
   [Có, đã giao] [Hủy]
   ```
4. Khi confirm:
   ```javascript
   UPDATE adoption_requests
   SET 
     status = 'delivered',
     delivered_at = NOW(),
     delivery_confirmed_by = owner_id;
   
   UPDATE pets SET status = 'delivered';
   ```
5. Hiện form đánh giá (owner đánh giá người nhận)

---

## 🗂️ Database Schema

### Bảng mới: `adoption_requests`

```sql
CREATE TABLE public.adoption_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES public.pets(id),
  requester_id UUID NOT NULL REFERENCES public.profiles(id),
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  
  -- Status workflow
  status TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' → Chờ owner chấp nhận
  -- 'accepted' → Owner đã chấp nhận
  -- 'rejected' → Owner từ chối
  -- 'ready_to_deliver' → Cả 2 confirm gặp, đã có token
  -- 'delivered' → Đã giao mèo
  -- 'cancelled' → Hủy giữa chừng
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  
  -- Xác nhận gặp mặt
  receiver_confirmed_meet BOOLEAN DEFAULT false,
  receiver_confirmed_at TIMESTAMPTZ,
  owner_confirmed_meet BOOLEAN DEFAULT false,
  owner_confirmed_at TIMESTAMPTZ,
  
  -- Delivery token (sinh sau khi cả 2 confirm)
  delivery_token TEXT,
  token_generated_at TIMESTAMPTZ,
  
  -- Delivery
  delivered_at TIMESTAMPTZ,
  delivery_confirmed_by UUID REFERENCES public.profiles(id),
  
  -- Constraints
  UNIQUE(pet_id, requester_id) -- 1 người chỉ request 1 lần / pet
);

-- Indexes
CREATE INDEX idx_adoption_requests_pet ON adoption_requests(pet_id);
CREATE INDEX idx_adoption_requests_requester ON adoption_requests(requester_id);
CREATE INDEX idx_adoption_requests_owner ON adoption_requests(owner_id);
CREATE INDEX idx_adoption_requests_status ON adoption_requests(status);
CREATE INDEX idx_adoption_requests_token ON adoption_requests(delivery_token);

-- RLS
ALTER TABLE adoption_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests"
  ON adoption_requests FOR SELECT
  USING (requester_id = auth.uid() OR owner_id = auth.uid());

CREATE POLICY "Users can create requests"
  ON adoption_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Owners can update requests"
  ON adoption_requests FOR UPDATE
  USING (owner_id = auth.uid() OR requester_id = auth.uid());
```

---

## 💻 Implementation

### 1. File: `src/pages/PetDetailPage.jsx`

#### A. Receiver view - Nút "Liên hệ nhận mèo"

```javascript
const [myRequest, setMyRequest] = useState(null);

// Load request của user hiện tại
useEffect(() => {
  if (!currentUser || !pet || isOwner) return;
  
  const loadMyRequest = async () => {
    const { data } = await supabase
      .from("adoption_requests")
      .select("*")
      .eq("pet_id", pet.id)
      .eq("requester_id", currentUser.id)
      .maybeSingle();
    
    setMyRequest(data);
  };
  
  loadMyRequest();
}, [currentUser, pet, isOwner]);

const handleSendContactRequest = async () => {
  if (!confirm("Bạn muốn liên hệ với chủ để nhận mèo này?")) return;
  
  try {
    const { error } = await supabase
      .from("adoption_requests")
      .insert({
        pet_id: pet.id,
        requester_id: currentUser.id,
        owner_id: pet.owner_id,
        status: 'pending'
      });
    
    if (error) throw error;
    
    alert("Đã gửi yêu cầu! Chờ chủ bài chấp nhận.");
    window.location.reload();
  } catch (err) {
    alert("Lỗi: " + err.message);
  }
};

// UI
{!isOwner && !myRequest && (
  <button onClick={handleSendContactRequest}>
    📞 Liên hệ nhận mèo này
  </button>
)}

{!isOwner && myRequest && myRequest.status === 'pending' && (
  <div style={{ background: "#fef3c7", padding: 12 }}>
    ⏳ Đã gửi yêu cầu. Chờ chủ bài phản hồi...
  </div>
)}

{!isOwner && myRequest && myRequest.status === 'accepted' && (
  <div style={{ background: "#dcfce7", padding: 12 }}>
    <h4>✅ Chủ bài đã chấp nhận bạn!</h4>
    
    {/* Hiện thông tin liên hệ owner */}
    {ownerProfile && (
      <div style={{ background: "#eff6ff", padding: 10, marginTop: 8 }}>
        <strong>📞 Thông tin liên hệ chủ bài:</strong>
        <div>Email: {ownerProfile.email}</div>
        {ownerProfile.phone && <div>SĐT: {ownerProfile.phone}</div>}
      </div>
    )}
    
    {/* Xác nhận gặp mặt */}
    <div style={{ marginTop: 12 }}>
      <strong>⏳ Xác nhận hẹn gặp:</strong>
      <div>
        <label>
          <input 
            type="checkbox" 
            checked={myRequest.receiver_confirmed_meet}
            onChange={handleReceiverConfirmMeet}
          />
          Tôi đã hẹn gặp với chủ bài
        </label>
      </div>
      <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
        {myRequest.owner_confirmed_meet 
          ? "✅ Chủ bài đã xác nhận" 
          : "⏳ Chờ chủ bài xác nhận..."}
      </div>
    </div>
    
    {/* Hiện QR khi cả 2 đã confirm */}
    {myRequest.delivery_token && (
      <div style={{ marginTop: 12, background: "#f0fdf4", padding: 10 }}>
        <strong>📱 MÃ XÁC NHẬN NHẬN MÈO</strong>
        <div style={{ marginTop: 8 }}>
          <QRCodeCanvas value={`https://map-meo.web.app/deliver/${myRequest.delivery_token}`} size={200} />
        </div>
        <div style={{ fontSize: 12, marginTop: 8 }}>
          Mã dự phòng: <strong>{myRequest.delivery_token}</strong>
        </div>
        <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
          Khi gặp chủ bài, mở màn hình này để họ quét mã.
        </p>
      </div>
    )}
  </div>
)}
```

#### B. Owner view - Danh sách requests

```javascript
const [requests, setRequests] = useState([]);

useEffect(() => {
  if (!isOwner || !pet) return;
  
  const loadRequests = async () => {
    const { data } = await supabase
      .from("adoption_requests")
      .select(`
        *,
        profiles:requester_id(id, email, phone, full_name)
      `)
      .eq("pet_id", pet.id)
      .in("status", ["pending", "accepted", "ready_to_deliver"])
      .order("created_at", { ascending: false });
    
    setRequests(data || []);
  };
  
  loadRequests();
}, [isOwner, pet]);

const handleAcceptRequest = async (requestId) => {
  if (!confirm("Chấp nhận người này?")) return;
  
  try {
    // Accept request này
    await supabase
      .from("adoption_requests")
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq("id", requestId);
    
    // Reject các request khác
    await supabase
      .from("adoption_requests")
      .update({ status: 'rejected', rejected_at: new Date().toISOString() })
      .eq("pet_id", pet.id)
      .eq("status", "pending")
      .neq("id", requestId);
    
    // Update pet status
    await supabase
      .from("pets")
      .update({ status: 'in_contact' })
      .eq("id", pet.id);
    
    alert("Đã chấp nhận!");
    window.location.reload();
  } catch (err) {
    alert("Lỗi: " + err.message);
  }
};

const handleOwnerConfirmMeet = async (request) => {
  try {
    const payload = {
      owner_confirmed_meet: true,
      owner_confirmed_at: new Date().toISOString()
    };
    
    // Nếu receiver cũng đã confirm → sinh token
    if (request.receiver_confirmed_meet) {
      const token = Math.random().toString(36).substring(2, 10).toUpperCase();
      payload.delivery_token = token;
      payload.status = 'ready_to_deliver';
      payload.token_generated_at = new Date().toISOString();
    }
    
    await supabase
      .from("adoption_requests")
      .update(payload)
      .eq("id", request.id);
    
    alert(request.receiver_confirmed_meet 
      ? "✅ Đã sinh mã giao mèo!" 
      : "Đã xác nhận. Chờ người nhận xác nhận...");
    
    window.location.reload();
  } catch (err) {
    alert("Lỗi: " + err.message);
  }
};

// UI
<div>
  <h4>👥 Người muốn nhận ({requests.length})</h4>
  {requests.map(req => (
    <div key={req.id} style={{ border: "1px solid #e5e7eb", padding: 12, marginBottom: 8 }}>
      <div><strong>{req.profiles?.full_name || req.profiles?.email}</strong></div>
      
      {req.status === 'pending' && (
        <div>
          <button onClick={() => handleAcceptRequest(req.id)}>✅ Chấp nhận</button>
          <button onClick={() => handleRejectRequest(req.id)}>❌ Từ chối</button>
        </div>
      )}
      
      {req.status === 'accepted' && (
        <div>
          <div style={{ background: "#dcfce7", padding: 8, marginTop: 8 }}>
            ✅ Đã chấp nhận
          </div>
          
          {/* Hiện contact người nhận */}
          <div style={{ background: "#eff6ff", padding: 8, marginTop: 8 }}>
            <strong>📞 Liên hệ:</strong>
            <div>Email: {req.profiles?.email}</div>
            {req.profiles?.phone && <div>SĐT: {req.profiles?.phone}</div>}
          </div>
          
          {/* Confirm gặp */}
          <div style={{ marginTop: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={req.owner_confirmed_meet}
                onChange={() => handleOwnerConfirmMeet(req)}
              />
              Tôi đã hẹn gặp
            </label>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              {req.receiver_confirmed_meet 
                ? "✅ Người nhận đã xác nhận" 
                : "⏳ Chờ người nhận xác nhận..."}
            </div>
          </div>
        </div>
      )}
      
      {req.status === 'ready_to_deliver' && req.delivery_token && (
        <div style={{ background: "#f0fdf4", padding: 8, marginTop: 8 }}>
          <strong>✅ Sẵn sàng giao mèo</strong>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => navigate(`/deliver/${req.delivery_token}`)}>
              📷 Quét mã QR người nhận
            </button>
          </div>
          <div style={{ fontSize: 11, marginTop: 4 }}>
            Hoặc nhập mã: {req.delivery_token}
          </div>
        </div>
      )}
    </div>
  ))}
</div>
```

---

## 🧪 Testing Checklist

- [ ] User A bấm "Liên hệ nhận mèo" → Tạo request pending
- [ ] Owner thấy request của User A trong danh sách
- [ ] Owner bấm "Chấp nhận" User A
- [ ] User A thấy thông tin liên hệ owner
- [ ] Owner thấy thông tin liên hệ User A
- [ ] User A tick "Tôi đã hẹn gặp"
- [ ] Owner tick "Tôi đã hẹn gặp"
- [ ] Sau cả 2 tick → Sinh mã QR tự động
- [ ] User A thấy QR trên màn hình
- [ ] Owner quét QR → `/deliver/:token` → Confirm giao mèo
- [ ] Status update thành `delivered`

---

**Last Updated:** December 8, 2025
