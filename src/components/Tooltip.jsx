import React, { useState } from 'react';

/**
 * Reusable Tooltip Component
 * Usage:
 * <Tooltip text="Thêm text here">
 *   <button>Hover me</button>
 * </Tooltip>
 */
const Tooltip = ({ text, children, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  const tooltipPositions = {
    top: {
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: '8px',
    },
    bottom: {
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: '8px',
    },
    left: {
      right: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginRight: '8px',
    },
    right: {
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginLeft: '8px',
    },
  };

  const arrowPositions = {
    top: {
      bottom: '-4px',
      left: '50%',
      transform: 'translateX(-50%)',
      borderTop: '4px solid #333',
      borderLeft: '4px solid transparent',
      borderRight: '4px solid transparent',
    },
    bottom: {
      top: '-4px',
      left: '50%',
      transform: 'translateX(-50%)',
      borderBottom: '4px solid #333',
      borderLeft: '4px solid transparent',
      borderRight: '4px solid transparent',
    },
    left: {
      right: '-4px',
      top: '50%',
      transform: 'translateY(-50%)',
      borderLeft: '4px solid #333',
      borderTop: '4px solid transparent',
      borderBottom: '4px solid transparent',
    },
    right: {
      left: '-4px',
      top: '50%',
      transform: 'translateY(-50%)',
      borderRight: '4px solid #333',
      borderTop: '4px solid transparent',
      borderBottom: '4px solid transparent',
    },
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onTouchStart={() => setIsVisible(!isVisible)}
        style={{ cursor: 'help' }}
      >
        {children}
      </div>

      {isVisible && (
        <div
          style={{
            position: 'absolute',
            ...tooltipPositions[position],
            background: '#333',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            lineHeight: '1.4',
            maxWidth: '200px',
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            zIndex: 1000,
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          {text}
          <div
            style={{
              position: 'absolute',
              ...arrowPositions[position],
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
