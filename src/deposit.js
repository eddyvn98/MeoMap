
import { supabase } from './supabaseClient';


function generateRandomToken(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

// petId: id mèo trong bảng pets
// ownerId: id người đăng mèo
// amount: số tiền cọc (vd 50000)
export async function createDepositAndTicket({ petId, ownerId, amount }) {
  // 1. Lấy user hiện tại (người nhận)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Bạn phải đăng nhập trước khi đặt cọc.');
  }

  const seekerId = user.id;

  // 2. Tạo bản ghi deposit
  const { data: deposit, error: depositError } = await supabase
    .from('deposits')
    .insert({
      pet_id: petId,
      owner_id: ownerId,
      seeker_id: seekerId,
      amount,
      status: 'locked',
    })
    .select('*')
    .single();

  if (depositError || !deposit) {
    console.error(depositError);
    throw new Error('Không tạo được bản ghi cọc.');
  }

  // 3. Sinh token + ticket
  const token = generateRandomToken(8);
  const expireAt = new Date();
  expireAt.setDate(expireAt.getDate() + 14); // hết hạn sau 14 ngày

  const { data: ticket, error: ticketError } = await supabase
    .from('adoption_tickets')
    .insert({
      deposit_id: deposit.id,
      owner_id: ownerId,
      seeker_id: seekerId,
      token,
      expire_at: expireAt.toISOString(),
      status: 'active',
    })
    .select('*')
    .single();

  if (ticketError || !ticket) {
    console.error(ticketError);
    throw new Error('Không tạo được ticket (mã QR).');
  }

  // Trả ra để màn hình khác dùng hiển thị QR
  return { deposit, ticket };
}
