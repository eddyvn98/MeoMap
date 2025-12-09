# Posts Section - Visual & Implementation Guide

## Component Structure

```
ProfileDrawer.jsx
├── Tab: Overview
│   └── Quick actions buttons
│       ├── Đăng mèo
│       ├── Báo cáo
│       ├── Bài đăng (→ Opens posts tab)
│       └── Cài đặt (→ Opens settings tab)
│
├── Tab: Bài đăng (NEW UNIFIED)
│   └── PostsSection.jsx
│       ├── FilterChips
│       │   ├── Tất cả
│       │   ├── Giải cứu
│       │   ├── Thất lạc
│       │   └── Cho nhận
│       │
│       ├── CollapsibleSection: Giải cứu (rescue)
│       │   └── PostCard[] (filtered)
│       │
│       ├── CollapsibleSection: Thất lạc (lost)
│       │   └── PostCard[] (filtered)
│       │
│       └── CollapsibleSection: Cho nhận (adopt)
│           └── PostCard[] (filtered)
│
└── Tab: Cài đặt
    └── Settings form
```

## Data Flow

### 1. Data Fetching (in ProfileDrawer.jsx)
```javascript
// When "Bài đăng" tab is clicked
activeTab === "posts" → fetchPosts(user.id)
                    ↓
            Query: SELECT * FROM pets 
                   WHERE owner_id = user.id
                   ORDER BY updated_at DESC
                    ↓
            setPosts(data)
```

### 2. PostsSection Rendering
```javascript
posts[] → GroupByType → {
  rescue: [post1, post2],
  lost: [post3, post4],
  adopt: [post5, post6]
}
         ↓
    FilterByActive
         ↓
    RenderCollapsibleSections
         ↓
    RenderPostCards
```

### 3. URL Sync
```
Filter: all     → URL: /path
Filter: rescue  → URL: /path?type=rescue
Filter: lost    → URL: /path?type=lost
Filter: adopt   → URL: /path?type=adopt
```

## Styling Details

### PostCard Colors
| Type | Background | Text | Badge Color |
|------|-----------|------|-------------|
| rescue | White | Gray | Orange (bg-orange-100 text-orange-800) |
| lost | White | Gray | Red (bg-red-100 text-red-800) |
| adopt | White | Gray | Green (bg-green-100 text-green-800) |

### Card Layout
```
┌─────────────────────────────────────┐
│  ┌────┐                             │
│  │Img │  Title         [STATUS]     │
│  │    │  Type Badge                 │
│  └────┘  Detail info (district/etc) │
│                                     │
│  [Xem chi tiết] [Chỉnh] [Xóa]      │
│  [Hiện QR*] [Nhập token*]          │
│                                     │
│  * conditional based on type        │
└─────────────────────────────────────┘
```

## Filter Chip States
```
Active Filter: all
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ Tất  │ │ Giải │ │ Thất │ │ Cho  │
│ cả  │ │ cứu  │ │ lạc  │ │ nhận │
└──────┘ └──────┘ └──────┘ └──────┘
^active  ^shows all sections

Active Filter: rescue
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ Tất  │ │ Giải │ │ Thất │ │ Cho  │
│ cả  │ │ cứu  │ │ lạc  │ │ nhận │
└──────┘ └──────┘ └──────┘ └──────┘
         ^active  ^shows only rescue section
```

## Collapsible Section Behavior

```
Closed Section:
┌─ Giải cứu (3) ┐ [Mở]
└────────────────┘

Open Section:
┌─ Giải cứu (3) ┐ [Thu gọn]
├─────────────────┤
│ [PostCard 1]    │
│                 │
│ [PostCard 2]    │
│                 │
│ [PostCard 3]    │
└─────────────────┘
```

## Action Callbacks

### From PostsSection → ProfileDrawer
```javascript
onEdit(post)        → alert('Edit: ' + post.name)
                      TODO: Open edit modal

onDelete(post)      → confirm() → remove from state
                      TODO: Call DELETE API
                      
onShowQR(post)      → alert('Show QR: ' + post.name)
                      TODO: Open QR modal (adopt only)
                      
onEnterToken(post)  → prompt('Token?') → submit
                      TODO: Send token to API (rescue only)
                      
onViewDetail(post)  → setSelectedPost(post)
                      Can implement detail modal later
```

## Performance Optimizations

1. **Lazy Loading**: PostsSection doesn't fetch data directly
   - ProfileDrawer handles fetching when tab becomes active
   
2. **URL Sync**: History API instead of page reload
   - `window.history.replaceState()` keeps page state
   
3. **Grouped Rendering**: Posts grouped by category
   - Faster filtering by type
   - Easier to collapse/expand sections
   
4. **Conditional Rendering**: Actions only show if needed
   - `{postType === 'adopt' && <ShowQRButton>}`
   - `{postType === 'rescue' && <TokenButton>}`

## Future Enhancement: Detail Modal

When `onViewDetail` is called:
```javascript
// Could add this modal to ProfileDrawer:
{selectedPost && (
  <PostDetailModal 
    post={selectedPost}
    onClose={() => setSelectedPost(null)}
    onEdit={handleEdit}
    onDelete={handleDelete}
  />
)}
```

## Testing Checklist

- [ ] Filter chips change URL params
- [ ] Sections collapse/expand on click
- [ ] Type colors display correctly for each post type
- [ ] Inline actions trigger callbacks
- [ ] Empty states show correct messages
- [ ] Loading state displays during fetch
- [ ] Error state displays if fetch fails
- [ ] Responsive on mobile/desktop
- [ ] Keyboard navigation works (Tab, Enter, Esc)
- [ ] URL reload preserves filter state
