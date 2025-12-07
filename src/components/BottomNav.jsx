import { useNavigate } from "react-router-dom";

export default function BottomNav() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        borderTop: "1px solid #ddd",
        background: "#fff",
        display: "flex",
        justifyContent: "space-around",
        padding: 8,
      }}
    >
      <button onClick={() => navigate("/")}>Home</button>
      <button onClick={() => navigate("/map")}>Map</button>
      <button onClick={() => navigate("/report")}>Report</button>
    </div>
  );
}
