import { useEffect, useRef } from 'react';

/**
 * Hook để implement focus trap và keyboard shortcuts
 * @param {boolean} isOpen - Drawer open state
 * @param {React.RefObject} drawerRef - Reference to drawer element
 * @param {Function} onClose - Callback khi đóng drawer
 * @param {React.RefObject} headerRef - Reference to header element
 */
export const useKeyboardTrap = (isOpen, drawerRef, onClose, headerRef) => {
  const lastFocusedElement = useRef(null);

  // Focus trap logic
  useEffect(() => {
    if (!isOpen) return;

    // Save focused element before opening
    lastFocusedElement.current = document.activeElement;

    // Focus header
    const timer = setTimeout(() => {
      headerRef.current?.focus?.();
    }, 50);

    // Tab key handler
    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      const drawer = drawerRef.current;
      if (!drawer) return;

      const focusableElements = drawer.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: move to previous element
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: move to next element
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // ESC key handler
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };

    const drawer = drawerRef?.current;
    drawer?.addEventListener('keydown', handleTabKey);
    window.addEventListener('keydown', handleEscKey);

    return () => {
      clearTimeout(timer);
      drawer?.removeEventListener('keydown', handleTabKey);
      window.removeEventListener('keydown', handleEscKey);
      
      // Restore focus
      if (lastFocusedElement.current?.focus) {
        lastFocusedElement.current.focus();
      }
    };
  }, [isOpen, drawerRef, onClose, headerRef]);
};
