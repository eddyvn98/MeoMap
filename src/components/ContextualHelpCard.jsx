import React, { useState, useEffect } from 'react';

/**
 * ContextualHelpCard Component
 * Shows helpful info card on first interaction with a feature
 * 
 * Usage:
 * <ContextualHelpCard
 *   cardId="wallet-intro"
 *   title="💰 Ví của bạn"
 *   content="Ví quản lý tiền từ thưởng, cọc hoàn lại, và dịch vụ. Dùng để nộp cọc khi nhận nuôi hoặc mua voucher."
 *   icon="👜"
 *   position="top"
 * >
 *   <YourComponent />
 * </ContextualHelpCard>
 */
const ContextualHelpCard = ({ 
  cardId, 
  title, 
  content, 
  icon = '💡',
  position = 'bottom',
  children,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if this card has been dismissed before
    const dismissed = localStorage.getItem(`help-card-${cardId}`);
    if (!dismissed) {
      // Show after a short delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [cardId]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(`help-card-${cardId}`, '1');
    onDismiss?.();
  };

  const positionStyles = {
    top: {
      top: '-320px',
      left: '50%',
      transform: 'translateX(-50%)',
    },
    bottom: {
      bottom: '-320px',
      left: '50%',
      transform: 'translateX(-50%)',
    },
    left: {
      left: '-320px',
      top: '50%',
      transform: 'translateY(-50%)',
    },
    right: {
      right: '-320px',
      top: '50%',
      transform: 'translateY(-50%)',
    },
  };

  const arrowStyles = {
    top: {
      bottom: '-8px',
      left: '50%',
      transform: 'translateX(-50%)',
      borderTop: '8px solid #3b82f6',
      borderLeft: '8px solid transparent',
      borderRight: '8px solid transparent',
    },
    bottom: {
      top: '-8px',
      left: '50%',
      transform: 'translateX(-50%)',
      borderBottom: '8px solid #3b82f6',
      borderLeft: '8px solid transparent',
      borderRight: '8px solid transparent',
    },
    left: {
      right: '-8px',
      top: '50%',
      transform: 'translateY(-50%)',
      borderLeft: '8px solid #3b82f6',
      borderTop: '8px solid transparent',
      borderBottom: '8px solid transparent',
    },
    right: {
      left: '-8px',
      top: '50%',
      transform: 'translateY(-50%)',
      borderRight: '8px solid #3b82f6',
      borderTop: '8px solid transparent',
      borderBottom: '8px solid transparent',
    },
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {children}

      {isVisible && (
        <div
          style={{
            position: 'absolute',
            ...positionStyles[position],
            width: '280px',
            background: '#fff',
            border: '2px solid #3b82f6',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 10px 25px rgba(59, 130, 246, 0.2)',
            zIndex: 1000,
            animation: 'slideInCard 0.3s ease-out',
          }}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'transparent',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#9ca3af',
              hover: '#6b7280',
            }}
          >
            ×
          </button>

          {/* Icon + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '24px' }}>{icon}</span>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1f2937' }}>
              {title}
            </h3>
          </div>

          {/* Content */}
          <p style={{
            margin: 0,
            fontSize: '13px',
            lineHeight: '1.5',
            color: '#4b5563',
            marginBottom: '12px',
          }}>
            {content}
          </p>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => (e.target.style.background = '#2563eb')}
            onMouseOut={(e) => (e.target.style.background = '#3b82f6')}
          >
            Đã hiểu
          </button>

          {/* Arrow pointer */}
          <div style={{ position: 'absolute', ...arrowStyles[position] }} />
        </div>
      )}

      <style>{`
        @keyframes slideInCard {
          from {
            opacity: 0;
            transform: ${position === 'top' ? 'translateY(10px)' : position === 'bottom' ? 'translateY(-10px)' : 'translateX(10px)'};
          }
          to {
            opacity: 1;
            transform: ${position === 'top' ? 'translateY(0)' : position === 'bottom' ? 'translateY(0)' : 'translateX(0)'};
          }
        }
      `}</style>
    </div>
  );
};

export default ContextualHelpCard;
