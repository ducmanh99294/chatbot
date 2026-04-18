const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const User = require("../models/User");
const chatController = require("../controllers/chatController");

let io;

const getMissingFields = (user) => {
  const missing = [];

  if (!user.fullName) missing.push("Họ và tên");
  if (!user.phone) missing.push("Số điện thoại");

  if (user.role === "patient") {
    if (!user.address) missing.push("Địa chỉ");
    if (!user.dateOfBirth) missing.push("Ngày sinh");
  }

  return missing;
};

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", 'https://datn-khaki-xi.vercel.app', 'https://chatbot-nine-snowy-72.vercel.app'],
      credentials: true
    }
  });

  io.use((socket, next) => {
  const guestId = socket.handshake.query.userId;
  if (guestId && guestId.startsWith("guest_")) {
    socket.userId = guestId; // Gán ID giả vào socket
    socket.isGuest = true;   // Đánh dấu đây là khách
    return next(); // Cho phép kết nối thành công ngay lập tức
  }

    const cookies = socket.handshake.headers.cookie;
    if (!cookies) return next(new Error("No cookies"));

    const parsed = cookie.parse(cookies);
    const token = parsed.accessToken;

    if (!token) return next(new Error("No token"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = decoded.id;
      socket.isGuest = false; // Đánh dấu đây không phải khách
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user_${socket.userId}`);

    // validate profile
    socket.on("user_ready", async () => {
      if (socket.isGuest) {
      console.log(`Bỏ qua check profile cho Guest: ${socket.userId}`);
      return; 
    }
try {
      const user = await User.findById(socket.userId);
      if (!user) return; // Đề phòng user bị xóa khỏi DB

      const missingFields = getMissingFields(user);
      if (missingFields.length > 0) {
        sendNotification(socket.userId, {
          type: "incomplete_profile",
          message: `Vui lòng cập nhật: ${missingFields.join(", ")}`
        });
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra profile:", error);
    }
  });
  // cat AI
    socket.on("send_message", async (data) => {
      console.log("AI request:", data);
      try {
        // Gọi hàm từ controller vừa tạo
        const reply = await chatController.handleSocketChat(
          socket.userId,
          data
        );
        
        // 🔥 CHỈ EMIT 1 LẦN DUY NHẤT
        // Frontend của bạn đang đọc data.message.type, nên gửi object bọc ngoài chữ message
        socket.emit("ai_reply", {
          message: reply 
        });

      } catch (error) {
        console.error("AI ERROR:", error);
        // Trả về đúng format để Frontend không bị văng lỗi undefined
        socket.emit("ai_reply", {
          message: { 
            type: "text", 
            message: "AI đang bận hoặc gặp lỗi, vui lòng thử lại sau." 
          }
        });
      }
    });

    socket.on("join_chat", (conversationId) => {
      socket.join(`chat_${conversationId}`);
    });

    socket.on("send_chat_message", ({ conversationId, message }) => {
      io.to(`chat_${conversationId}`).emit("receive_chat_message", {
        sender: socket.userId,
        message
      });
    });

    socket.on("disconnect", () => {
      // Giữ kết nối đóng yên lặng, tránh spam log terminal
    });

    
  });
};
 // notify
const sendNotification = (userId, data) => {
  if (!io) {
    console.log("Socket chưa được init");
    return;
  }

  io.to(`user_${userId}`).emit("notification", data);
};

module.exports = {
  initSocket,
  sendNotification
};