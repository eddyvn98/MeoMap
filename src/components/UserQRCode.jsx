import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../supabaseClient';

/**
 * Component hiển thị QR code cố định của user
 * QR này dùng để xác nhận giao mèo (owner quét)
 */
export default function UserQRCode({ userId, size = 200 }) {
  const [qrId, setQrId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserQRId();
  }, [userId]);

  const loadUserQRId = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_qr_id, display_name')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (!data.user_qr_id) {
        // Nếu chưa có QR-ID, tạo mới (trigger sẽ tự sinh)
        const newQrId = 'USER-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ user_qr_id: newQrId })
          .eq('id', userId);

        if (updateError) throw updateError;
        setQrId(newQrId);
      } else {
        setQrId(data.user_qr_id);
      }
    } catch (err) {
      console.error('Error loading QR-ID:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        border: '1px dashed #ccc',
        borderRadius: 8
      }}>
        <p style={{ margin: 0, color: '#999' }}>Đang tải...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: 16,
        background: '#fee',
        borderRadius: 8,
        color: '#c00'
      }}>
        Lỗi: {error}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12
    }}>
      {/* QR Code */}
      <div style={{
        padding: 16,
        background: '#fff',
        borderRadius: 8,
        border: '2px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <QRCodeSVG 
          value={qrId} 
          size={size}
          level="H"
          includeMargin={false}
        />
      </div>

      {/* Mã QR text (backup) */}
      <div style={{
        textAlign: 'center',
        padding: '8px 16px',
        background: '#f3f4f6',
        borderRadius: 6,
        fontFamily: 'monospace',
        fontSize: 14,
        fontWeight: 'bold',
        color: '#374151',
        letterSpacing: 1
      }}>
        {qrId}
      </div>

      <p style={{
        margin: 0,
        fontSize: 12,
        color: '#6b7280',
        textAlign: 'center',
        maxWidth: size + 32
      }}>
        💡 Đây là mã QR cố định của bạn.<br/>
        Người đăng sẽ quét mã này để xác nhận giao mèo.
      </p>
    </div>
  );
}
