import { useState } from "react";

/**
 * ScanDeliveryModal - Modal để quét/nhập mã xác nhận giao mèo
 */
export default function ScanDeliveryModal({
  isOpen,
  onClose,
  onConfirm,
  requestId,
}) {
  const [scanInput, setScanInput] = useState('');
  const [scanError, setScanError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!scanInput.trim()) {
      setScanError('Vui lòng nhập hoặc quét mã');
      return;
    }

    setIsProcessing(true);
    setScanError('');

    try {
      await onConfirm(scanInput.trim(), requestId);
      // Reset form on success
      setScanInput('');
      setScanError('');
    } catch (error) {
      setScanError(error.message || 'Có lỗi xảy ra');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setScanInput('');
    setScanError('');
    setIsProcessing(false);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: '#fff',
          padding: 24,
          borderRadius: 12,
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          maxWidth: 400,
          width: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          📱 Quét mã xác nhận giao mèo
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 13,
              color: '#6b7280',
              marginBottom: 6,
              display: 'block',
            }}
          >
            Nhập hoặc quét mã:
          </label>
          <input
            type="text"
            value={scanInput}
            onChange={(e) => {
              setScanInput(e.target.value);
              setScanError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isProcessing) {
                handleConfirm();
              }
            }}
            placeholder="Quét mã QR hoặc nhập token"
            autoFocus
            disabled={isProcessing}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 14,
              fontFamily: 'monospace',
              opacity: isProcessing ? 0.6 : 1,
            }}
          />
        </div>

        {scanError && (
          <div
            style={{
              padding: 12,
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              color: '#991b1b',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {scanError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: isProcessing ? '#9ca3af' : '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 500,
              opacity: isProcessing ? 0.7 : 1,
            }}
          >
            {isProcessing ? '⏳ Đang xử lý...' : '✓ Xác nhận'}
          </button>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 500,
              opacity: isProcessing ? 0.7 : 1,
            }}
          >
            ✗ Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
