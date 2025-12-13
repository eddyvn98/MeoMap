# Adoption Activities Migration Summary

## ✅ Đã thực hiện

### 1. Database Changes
File: `database/REMOVE_ADOPTION_ACTIVITIES_FK.sql`

**Các thay đổi:**
- ✅ Xóa foreign key constraint `adoption_activities_adoption_request_fkey`
- ✅ `adoption_request_id` → nullable (cho phép NULL)
- ✅ Thêm cột `pet_id UUID REFERENCES pets(id)` 
- ✅ Thêm activity type `'sighting'` vào constraint
- ✅ Thêm constraint check: phải có 1 trong 2 (adoption_request_id HOẶC pet_id)

### 2. Code Updates

#### ✅ `LostPetDetail.jsx`
- Load sightings: `eq("pet_id", pet.id)` + `eq("activity_type", "sighting")`
- Insert sighting: dùng `pet_id` thay vì `adoption_request_id`
- Verify sighting: update bằng `pet_id`

#### ✅ `MyReportsPage.jsx`
- Query sightings: `eq("actor_id", userData.user.id)` (thay vì `reporter_id`)

#### ✅ `adoptionNotifications.js`
- Thêm function `getPetSightings(petId)` để load sightings của lost pets

#### ℹ️ Không cần sửa (đúng rồi):
- `AdoptionActivityTimeline.jsx` - dùng `adoption_request_id` cho adoption flow
- `adoptionAdminHelper.js` - dùng `adoption_request_id` cho adoption flow

## 📊 Structure mới của `adoption_activities`

```sql
adoption_activities (
  id UUID PRIMARY KEY,
  
  -- ONE OF THESE MUST BE SET (constraint check)
  adoption_request_id UUID (nullable) REFERENCES adoption_requests(id),
  pet_id UUID (nullable) REFERENCES pets(id),
  
  activity_type TEXT CHECK (..., 'sighting'),  -- NEW
  actor_id UUID NOT NULL REFERENCES profiles(id),
  actor_type TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
```

## 🔄 Use Cases

### Adoption Flow (có adoption_request)
```javascript
// Query activities của adoption request
.from('adoption_activities')
.eq('adoption_request_id', requestId)
```

### Lost Pet Sightings (không có adoption_request)
```javascript
// Query sightings của lost pet
.from('adoption_activities')
.eq('pet_id', petId)
.eq('activity_type', 'sighting')
```

## 🚀 Deployment Steps

1. **Chạy migration SQL:**
   ```bash
   # Copy nội dung database/REMOVE_ADOPTION_ACTIVITIES_FK.sql
   # Paste vào Supabase SQL Editor và Execute
   ```

2. **Verify migration:**
   ```sql
   -- Check constraint
   SELECT constraint_name, constraint_type 
   FROM information_schema.table_constraints 
   WHERE table_name = 'adoption_activities';
   
   -- Check columns
   SELECT column_name, is_nullable, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'adoption_activities';
   ```

3. **Deploy frontend code** - đã update các files cần thiết

## ⚠️ Breaking Changes
- Column `reporter_id` không tồn tại → dùng `actor_id`
- `adoption_request_id` giờ nullable
- Phải filter `activity_type = 'sighting'` khi query lost pet sightings
