# Quick Start: Posts Section Feature

## 🎬 Getting Started

The unified posts section is now integrated into ProfileDrawer. Here's what changed:

### Before
```
ProfileDrawer Tabs:
├── Overview
├── Bài đăng (old list view)
├── Cọc & giao dịch
├── Đánh giá
└── Cài đặt
```

### After
```
ProfileDrawer Tabs:
├── Overview
├── Bài đăng (NEW: unified with sections)
└── Cài đặt
```

## 📦 New Files

```
src/components/
├── PostCard.jsx           ← Reusable post card
├── PostsSection.jsx       ← Main posts panel
└── ProfileDrawer.jsx      ← (Updated)
```

## 🔧 How It Works

1. User clicks "Bài đăng" tab in ProfileDrawer
2. `fetchPosts(user.id)` runs to fetch all user's posts
3. Posts are grouped by `category` field (rescue, lost, adopt)
4. User sees 3 collapsible sections with posts
5. Filter chips let them filter by type
6. Each post has inline action buttons

## 📋 Component Props

### PostCard
```jsx
<PostCard
  post={{id, name, category, status, image_url, district, description}}
  onEdit={(post) => {}}
  onDelete={(post) => {}}
  onShowQR={(post) => {}}         // adoption only
  onEnterToken={(post) => {}}     // rescue only
  onViewDetail={(post) => {}}
/>
```

### PostsSection
```jsx
<PostsSection
  posts={[]}                    // array of post objects
  isLoading={false}            // loading state
  error={''}                   // error message if any
  onEdit={handleEdit}
  onDelete={handleDelete}
  onShowQR={handleShowQR}
  onEnterToken={handleEnterToken}
  onViewDetail={handleViewDetail}
/>
```

## 🎨 Styling Classes Used

- `bg-sky-100 text-sky-800` - Filter chip active state
- `bg-orange-100 text-orange-800` - Rescue status badge
- `bg-red-100 text-red-800` - Lost status badge
- `bg-green-100 text-green-800` - Adopt status badge
- `bg-gray-50`, `bg-white` - Section and card backgrounds
- `shadow-sm`, `rounded-lg` - Card styling

## 🔗 URL Parameters

The posts section syncs with URL:
```
/path                    → Show all posts (no filter)
/path?type=rescue       → Show only rescue posts
/path?type=lost         → Show only lost posts
/path?type=adopt        → Show only adoption posts
```

Browser back button will restore the filter state.

## 🚀 Running the App

```bash
cd c:\Projects\meo-map
npm run dev
```

Then:
1. Log in
2. Click profile icon to open drawer
3. Click "Bài đăng" tab
4. See your posts organized by type!

## ⚙️ Backend Integration Needed

Replace these placeholder implementations:

### In PostsSection callbacks in ProfileDrawer:
```javascript
// Current: alert() placeholders
// TODO: Replace with actual implementations

onEdit: (post) => {
  // Show edit modal
  // PATCH /api/pets/{id}
  // Refresh posts list
}

onDelete: (post) => {
  // DELETE /api/pets/{id}
  // Remove from list
}

onShowQR: (post) => {
  // GET /api/posts/{id}/qr-code
  // Display QR in modal
}

onEnterToken: (post) => {
  // POST /api/rescue/{id}/verify-token
  // Validate token
}
```

## 📱 Responsive Behavior

- **Mobile** (< 1024px): Full-height drawer
- **Desktop** (≥ 1024px): Side drawer with adjustable width
- **All**: Cards stack vertically, actions wrap if needed

## 🧪 Testing

Try these scenarios:
1. ✓ Open profile → click Bài đăng → see all posts
2. ✓ Click rescue filter → see only rescue posts
3. ✓ Click back button → filter persists
4. ✓ Click section header → collapse/expand
5. ✓ Refresh page with ?type=lost in URL → correct filter shown
6. ✓ Click action buttons → see callbacks fire (currently alerts)

## 🐛 Common Issues

**Q: Posts not showing?**
A: Check that user is logged in and has posts. Check browser console for fetch errors.

**Q: Categories not grouping correctly?**
A: Verify the `category` field in your `pets` table has values: 'rescue', 'lost', or 'adopt'.

**Q: URL not updating?**
A: Check browser console, should see `history.replaceState` calls.

## 📚 Related Files

- Implementation details: `POSTS_SECTION_IMPLEMENTATION.md`
- Visual guide: `POSTS_SECTION_GUIDE.md`
- Full summary: `IMPLEMENTATION_SUMMARY.md`

## 💡 Tips

- Use the filter chips to quickly jump between post types
- Collapse sections you don't need to see (saves space)
- The URL parameter lets you share filtered post views
- All styling is Tailwind CSS for easy future customization

---

**Ready to integrate!** The frontend is complete. Connect the action callbacks to your backend APIs and you're done! 🎉
