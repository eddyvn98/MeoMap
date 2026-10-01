export default function AdoptionRequestSort({ adoptionRequests, sortBy, setSortBy }) {
  return (
    <>
      {/* Sort Buttons */}
      {adoptionRequests.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => setSortBy("newest")}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              borderRadius: 6,
              border: sortBy === "newest" ? "2px solid #3b82f6" : "1px solid #d1d5db",
              background: sortBy === "newest" ? "#dbeafe" : "#fff",
              color: sortBy === "newest" ? "#1e40af" : "#6b7280",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            🕐 Mới nhất
          </button>
          <button
            onClick={() => setSortBy("deposit")}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              borderRadius: 6,
              border: sortBy === "deposit" ? "2px solid #3b82f6" : "1px solid #d1d5db",
              background: sortBy === "deposit" ? "#dbeafe" : "#fff",
              color: sortBy === "deposit" ? "#1e40af" : "#6b7280",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            💰 Cọc cao
          </button>
          <button
            onClick={() => setSortBy("reputation")}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              borderRadius: 6,
              border: sortBy === "reputation" ? "2px solid #3b82f6" : "1px solid #d1d5db",
              background: sortBy === "reputation" ? "#dbeafe" : "#fff",
              color: sortBy === "reputation" ? "#1e40af" : "#6b7280",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            ⭐ Uy tín
          </button>
        </div>
      )}
    </>
  );
}
