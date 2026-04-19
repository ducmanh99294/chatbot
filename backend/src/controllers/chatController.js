const chatService = require("../chatBot/chatService");

exports.chatConsult = async (req, res) => {
  try {
    const result = await chatService(req.user.id, req.body.message);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Chat lỗi" });
  }
};

exports.handleSocketChat = async (userId, data) => {
  try {
    // Từ frontend, bạn gửi lên { message: input } HOẶC { type: "image", image: base64 }
    // Nên ta lấy data.message (nếu là chữ) hoặc data.image (nếu là ảnh)
    const inputContent = data.message || data.image; 
    
    // Gọi chatService xử lý logic AI Router đã làm trước đó
    const result = await chatService(userId, inputContent);
    return result; 
  } catch (error) {
    console.error("Lỗi handleSocketChat:", error);
    throw error; // Ném lỗi ra để khối catch bên socket bắt được
  }
};