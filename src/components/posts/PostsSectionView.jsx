import * as ReactWindow from "react-window";
import PostCard from "../PostCard";

const VirtualList = ReactWindow.List;

export const TYPE_ORDER = ["rescue", "lost", "adopt"];

const TYPE_LABEL = {
  adopt: "Cho nhận",
  lost: "Thất lạc",
  rescue: "Giải cứu",
};

const TYPE_ICON = {
  adopt: "🏡",
  lost: "📍",
  rescue: "🚑",
};

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "open", label: "Đang mở" },
  { value: "closed", label: "Đã đóng" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
];

function PostList({ posts, actions }) {
  if (posts.length > 30 && VirtualList) {
    const Row = ({ index, style, posts: rowPosts, actions: rowActions }) => (
      <div style={{ ...style, paddingBottom: 12 }}>
        <PostCard post={rowPosts[index]} {...rowActions} />
      </div>
    );

    return (
      <VirtualList
        rowComponent={Row}
        rowCount={posts.length}
        rowHeight={120}
        rowProps={{ posts, actions }}
        style={{
          height: Math.min(posts.length * 120, 600),
          width: "100%",
        }}
      />
    );
  }

  return posts.map((post) => (
    <PostCard key={post.id} post={post} {...actions} />
  ));
}

function FilterChips({ activeFilter, setActiveFilter }) {
  const chips = [
    ["all", "Tất cả"],
    ["rescue", "🚑 Giải cứu"],
    ["lost", "📍 Thất lạc"],
    ["adopt", "🏡 Cho nhận"],
  ];

  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
      {chips.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => setActiveFilter(key)}
          className={`flex-none whitespace-nowrap rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
            activeFilter === key
              ? "border-sky-300 bg-sky-100 text-sky-800"
              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Dropdown({
  label,
  options,
  value,
  onChange,
  open,
  setOpen,
  dropdownRef,
}) {
  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex flex-none items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {label} ▾
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[140px] rounded-md border border-gray-200 bg-white shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                value === option.value
                  ? "bg-sky-50 font-medium text-sky-700"
                  : "text-gray-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({
  type,
  posts,
  open,
  onToggle,
  actions,
}) {
  return (
    <section className="mb-6">
      <header
        className="sticky top-[72px] z-20 flex cursor-pointer items-center justify-between border-b border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50"
        onClick={() => onToggle(type)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onToggle(type);
        }}
      >
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <span className="text-xl">{TYPE_ICON[type]}</span>
          {TYPE_LABEL[type]}
          <span className="ml-1 text-sm text-gray-500">({posts.length})</span>
        </h3>
        <button
          type="button"
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
          onClick={(event) => {
            event.stopPropagation();
            onToggle(type);
          }}
        >
          {open ? "▼" : "▶"}
        </button>
      </header>

      {open && (
        <div className="mt-3 space-y-3">
          {posts.length ? (
            <PostList posts={posts} actions={actions} />
          ) : (
            <div className="py-6 text-center text-sm text-gray-500">
              Không có bài nào ở loại này.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function PostsLoading() {
  return (
    <div className="space-y-3 py-4">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="flex gap-3">
            <div className="h-20 w-20 shrink-0 rounded-lg bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="h-3 w-1/2 rounded bg-gray-200" />
              <div className="h-3 w-full rounded bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PostsSectionView({
  activeFilter,
  setActiveFilter,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  expandedSections,
  toggleSection,
  collapseAll,
  expandAll,
  postsByType,
  statusDropdown,
  sortDropdown,
  actions,
}) {
  return (
    <div>
      <FilterChips
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Dropdown
            label="Trạng thái"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
            {...statusDropdown}
          />
          <Dropdown
            label="Sắp xếp"
            options={SORT_OPTIONS}
            value={sortBy}
            onChange={setSortBy}
            {...sortDropdown}
          />
        </div>

        {activeFilter === "all" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={collapseAll}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Thu gọn tất cả
            </button>
            <button
              type="button"
              onClick={expandAll}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Mở tất cả
            </button>
          </div>
        )}
      </div>

      {TYPE_ORDER.map((type) => {
        if (activeFilter !== "all" && activeFilter !== type) return null;
        return (
          <Section
            key={type}
            type={type}
            posts={postsByType[type]}
            open={expandedSections[type]}
            onToggle={toggleSection}
            actions={actions}
          />
        );
      })}
    </div>
  );
}
