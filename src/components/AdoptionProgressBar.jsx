import React from "react";

const AdoptionProgressBar = ({ currentStep = 0 }) => {
  // currentStep: 0=Xem, 1=Nhắn, 2=Duyệt, 3=Cọc, 4=Nhận, 5=Hoàn
  const steps = [
    { label: "Đặt cọc", icon: "💰" },
    { label: "Trao đổi", icon: "💬" },
    { label: "Nhận mèo", icon: "🐱" },
    { label: "Hoàn cọc", icon: "✨" },
  ];

  return (
    <div style={{ padding: "16px", background: "#f9fafb", borderRadius: "8px", marginBottom: "16px" }}>
      <h4 style={{ margin: "0 0 12px", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>
        Quy trình nhận nuôi
      </h4>

      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        {steps.map((step, idx) => {
          const isActive = idx <= currentStep;
          const isCompleted = idx < currentStep;

          return (
            <React.Fragment key={idx}>
              {/* Step Circle */}
              <div
                style={{
                  flex: "0 0 auto",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: isCompleted ? "#10b981" : isActive ? "#3b82f6" : "#e5e7eb",
                  color: isCompleted || isActive ? "#fff" : "#6b7280",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "600",
                  position: "relative",
                  zIndex: 2,
                }}
                title={step.label}
              >
                {isCompleted ? "✓" : step.icon}
              </div>

              {/* Connector Line */}
              {idx < steps.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: "2px",
                    background: isCompleted ? "#10b981" : isActive ? "#3b82f6" : "#e5e7eb",
                    position: "relative",
                    zIndex: 1,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ marginTop: "8px", fontSize: "11px", color: "#6b7280", display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {steps.map((step, idx) => (
          <span
            key={idx}
            style={{
              padding: "2px 6px",
              background: idx <= currentStep ? "#e0e7ff" : "#f3f4f6",
              color: idx <= currentStep ? "#4338ca" : "#6b7280",
              borderRadius: "4px",
              fontSize: "10px",
            }}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default AdoptionProgressBar;
