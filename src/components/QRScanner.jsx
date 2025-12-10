import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

/**
 * Component quét QR code để xác nhận giao mèo
 * Owner dùng component này để quét QR của người nhận
 */
export default function QRScanner({ onScanSuccess, onScanError }) {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  useEffect(() => {
    if (isScanning && scannerRef.current && !scannerInstanceRef.current) {
      initScanner();
    }

    return () => {
      cleanup();
    };
  }, [isScanning]);

  const initScanner = () => {
    const scanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      showTorchButtonIfSupported: true,
      showZoomSliderIfSupported: true,
      defaultZoomValueIfSupported: 2
    });

    scanner.render(
      (decodedText) => {
        // Quét thành công
        console.log('QR scanned:', decodedText);
        if (onScanSuccess) {
          onScanSuccess(decodedText);
        }
        // Dừng scanner sau khi quét thành công
        cleanup();
        setIsScanning(false);
      },
      (errorMessage) => {
        // Lỗi quét (thường không cần xử lý)
        // console.log('Scan error:', errorMessage);
      }
    );

    scannerInstanceRef.current = scanner;
  };

  const cleanup = () => {
    if (scannerInstanceRef.current) {
      try {
        scannerInstanceRef.current.clear();
      } catch (err) {
        console.error('Error cleaning up scanner:', err);
      }
      scannerInstanceRef.current = null;
    }
  };

  const startScanning = () => {
    setIsScanning(true);
  };

  const stopScanning = () => {
    cleanup();
    setIsScanning(false);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }}>
      {!isScanning ? (
        <button
          onClick={startScanning}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
            transition: 'transform 0.2s'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          📷 Quét mã QR người nhận
        </button>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          {/* Scanner container */}
          <div
            id="qr-reader"
            ref={scannerRef}
            style={{
              borderRadius: 8,
              overflow: 'hidden',
              border: '2px solid #667eea'
            }}
          />

          {/* Stop button */}
          <button
            onClick={stopScanning}
            style={{
              padding: '10px 20px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              cursor: 'pointer'
            }}
          >
            ✖ Hủy quét
          </button>

          <p style={{
            margin: 0,
            fontSize: 13,
            color: '#6b7280',
            textAlign: 'center'
          }}>
            💡 Hướng camera vào mã QR của người nhận
          </p>
        </div>
      )}
    </div>
  );
}
