
import { supabase } from './supabaseClient';

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

  // 2. Kiểm tra mức cọc hiện tại của mèo này
  const { data: existingDeposits, error: existingError } = await supabase
    .from('deposits')
    .select('amount, status')
    .eq('pet_id', petId)
    .eq('status', 'locked'); // chỉ tính các cọc đang chờ

  if (existingError) {
    console.error(existingError);
    throw new Error('Không kiểm tra được mức cọc hiện tại.');
  }

  let maxExisting = 0;
  if (existingDeposits && existingDeposits.length > 0) {
    maxExisting = existingDeposits.reduce(
      (max, d) => (d.amount > max ? d.amount : max),
      0
    );
  }

  // Nếu đã có người cọc, người sau phải cọc >= max + 10k
  const minRequired = maxExisting > 0 ? maxExisting + 10000 : 0;
  if (minRequired > 0 && amount < minRequired) {
    throw new Error(
      `Số tiền cọc tối thiểu hiện tại là ${minRequired.toLocaleString(
        'vi-VN'
      )} đ. Hãy tăng số tiền cọc.`
    );
  }

  // 3. Tạo bản ghi deposit
  const { data: deposit, error: depositError } = await supabase
    .from('deposits')
    .insert({
      pet_id: petId,
      owner_id: ownerId,
      receiver_id: seekerId,
      amount,
      status: 'locked',
    })
    .select('*')
    .single();

  if (depositError || !deposit) {
    console.error(depositError);
    throw new Error('Không tạo được bản ghi cọc.');
  }

  // Trả về deposit
  return { deposit };
}
