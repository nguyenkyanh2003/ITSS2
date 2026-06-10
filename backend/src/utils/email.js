const nodemailer = require('nodemailer');

const createTransporter = () => {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

const sendMail = async (to, subject, html) => {
  const transporter = createTransporter();
  if (!transporter) {
    // Email not configured — skip silently in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Email] Skipped (not configured): ${subject} → ${to}`);
    }
    return;
  }

  try {
    await transporter.sendMail({
      from: `"HustTrade" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[Email] Failed to send:', err.message);
  }
};

const orderCreatedSellerEmail = (sellerEmail, sellerName, orderData) => {
  const { orderId, buyerName, totalPrice, items } = orderData;
  const itemList = (items || [])
    .map((i) => `<li>${i.title} × ${i.quantity} — ${Number(i.price).toLocaleString('vi-VN')}đ</li>`)
    .join('');

  return sendMail(
    sellerEmail,
    '[HustTrade] Bạn có đơn hàng mới!',
    `<h2>Xin chào ${sellerName},</h2>
     <p>Bạn vừa nhận được đơn hàng mới từ <strong>${buyerName}</strong>.</p>
     <p><strong>Mã đơn hàng:</strong> ${orderId}</p>
     <ul>${itemList}</ul>
     <p><strong>Tổng tiền:</strong> ${Number(totalPrice).toLocaleString('vi-VN')}đ</p>
     <p>Vui lòng đăng nhập HustTrade để đề xuất lịch hẹn giao dịch.</p>
     <hr/>
     <small>HustTrade — Sàn trao đổi đồ cũ sinh viên Bách Khoa</small>`
  );
};

const orderTimeConfirmedEmail = (email, name, orderData) => {
  const { orderId, finalTime, meetingSpot } = orderData;
  const timeStr = finalTime
    ? `${new Date(finalTime.startAt).toLocaleString('vi-VN')} – ${new Date(finalTime.endAt).toLocaleString('vi-VN')}`
    : 'Chưa xác định';

  return sendMail(
    email,
    '[HustTrade] Lịch hẹn đã được xác nhận',
    `<h2>Xin chào ${name},</h2>
     <p>Lịch hẹn giao dịch cho đơn hàng <strong>${orderId}</strong> đã được chốt:</p>
     <p><strong>Thời gian:</strong> ${timeStr}</p>
     <p><strong>Địa điểm:</strong> ${meetingSpot || 'Chưa xác định'}</p>
     <p>Vui lòng có mặt đúng giờ để hoàn tất giao dịch.</p>
     <hr/>
     <small>HustTrade — Sàn trao đổi đồ cũ sinh viên Bách Khoa</small>`
  );
};

const orderCompletedEmail = (email, name, orderData) => {
  const { orderId, totalPrice } = orderData;

  return sendMail(
    email,
    '[HustTrade] Đơn hàng đã hoàn tất',
    `<h2>Xin chào ${name},</h2>
     <p>Đơn hàng <strong>${orderId}</strong> đã được đánh dấu hoàn tất.</p>
     <p><strong>Giá trị giao dịch:</strong> ${Number(totalPrice).toLocaleString('vi-VN')}đ</p>
     <p>Cảm ơn bạn đã sử dụng HustTrade!</p>
     <hr/>
     <small>HustTrade — Sàn trao đổi đồ cũ sinh viên Bách Khoa</small>`
  );
};

const orderCancelledEmail = (email, name, orderData) => {
  const { orderId, cancelledBy } = orderData;

  return sendMail(
    email,
    '[HustTrade] Đơn hàng đã bị hủy',
    `<h2>Xin chào ${name},</h2>
     <p>Đơn hàng <strong>${orderId}</strong> đã bị hủy bởi <strong>${cancelledBy}</strong>.</p>
     <p>Nếu bạn có thắc mắc, vui lòng liên hệ qua chức năng chat trên HustTrade.</p>
     <hr/>
     <small>HustTrade — Sàn trao đổi đồ cũ sinh viên Bách Khoa</small>`
  );
};

module.exports = {
  orderCreatedSellerEmail,
  orderTimeConfirmedEmail,
  orderCompletedEmail,
  orderCancelledEmail,
};
