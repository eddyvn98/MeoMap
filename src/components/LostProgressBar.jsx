import React from "react";

/*
  LostProgressBar
  - Variant of AdoptionProgressBar for the lost flow
  - Steps: Báo tin → Trao đổi → Gặp mặt → Xác nhận → Trả thưởng
  - Props:
    currentStep: number (0..4)
*/
export default function LostProgressBar({ currentStep = 0 }) {
  const steps = [
    "Báo tin",
    "Trao đổi",
    "Gặp mặt",
    "Xác nhận",
    "Trả thưởng",
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {steps.map((label, idx) => (
        <React.Fragment key={idx}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                background: idx <= currentStep ? "#6366f1" : "#e5e7eb",
                color: idx <= currentStep ? "white" : "#374151",
              }}
            >
              {idx + 1}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: idx <= currentStep ? "#111827" : "#6b7280" }}>
              {label}
            </div>
          </div>
          {idx < steps.length - 1 && (
            <div style={{ height: 2, width: 28, background: idx < currentStep ? "#6366f1" : "#e5e7eb" }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
