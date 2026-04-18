const { detectIntent } = require("./detectIntent");
const { handleBookingContext, handleMedicalContext, handleFAQContext } = require("./buildContext");
const generateReply = require("./generateReply");
// const Product = require("../models/Product");
// const TimeSlot = require("../models/TimeSlot");
// const Appointment = require("../models/Appointment");

// bộ nhớ tạm thời
const userSessions = new Map();
// const userHealthContexts = new Map();
// const chatSessions = {}; 

function getChatHistory(sessionId) {
  // Nếu chưa có lịch sử, khởi tạo mảng rỗng
  if (!chatSessions[sessionId]) {
    chatSessions[sessionId] = [];
  }
  return chatSessions[sessionId];
}

function saveMessage(sessionId, role, content) {
  chatSessions[sessionId].push({ role: role, content: content });
  
  // Mẹo: Chỉ nên giữ lại khoảng 10-20 tin nhắn gần nhất để tránh tốn tiền API (Token)
  if (chatSessions[sessionId].length > 20) {
    chatSessions[sessionId].shift(); // Xóa tin nhắn cũ nhất
  }
}

// Hàm tách chuỗi
function extractCoreKeywords(specialtyName) {
  // 1. Cắt bỏ các chữ vô nghĩa như "Khoa", "Nội", "Ngoại"
  let cleanName = specialtyName.replace(/khoa|nội|ngoại/gi, "").trim();

  // 2. Tách chuỗi dựa trên dấu gạch ngang (-), dấu phẩy (,) hoặc chữ "và"
  let keywords = cleanName.split(/[-,\/]| và /i)
                          .map(k => k.trim())
                          .filter(k => k.length > 0); 
                          
  console.log(keywords)
  return keywords; 
}

module.exports = async function chatService(userId, message) {
  const msgText = message.toLowerCase().trim();

  // ==========================================
  // 🔥 1. KIỂM TRA BỘ NHỚ TẠM TRƯỚC TIÊN
  // ==========================================
  if (userSessions.has(userId)) {
    const session = userSessions.get(userId);

    // Xử lý nếu user đang ở trạng thái "Chờ nhập số điện thoại"
    if (session.step === "WAITING_FOR_PHONE") {
      
      // Kiểm tra xem tin nhắn có chứa số điện thoại không (Regex cơ bản cho SĐT Việt Nam)
      const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/g;
      const phoneMatch = msgText.match(phoneRegex);

      if (phoneMatch) {
        const phoneNumber = phoneMatch[0];
        
        // TODO: Lưu phoneNumber, session.major (Ngành học) vào Database (MongoDB/MySQL)
        console.log(`Đã lưu database: User ${userId} đăng ký tư vấn ngành ${session.major} với SĐT: ${phoneNumber}`);

        // XÓA BỘ NHỚ TẠM vì đã hoàn thành kịch bản
        userSessions.delete(userId);

        return {
          type: "text",
          message: `Cảm ơn bạn! Ban tuyển sinh đã nhận được số điện thoại ${phoneNumber}. Các thầy cô sẽ gọi lại tư vấn chi tiết về ngành ${session.major} cho bạn trong thời gian sớm nhất nhé.`
        };
      } 
      
      // Nếu user gõ bậy bạ (ví dụ "không cho đâu", "hủy")
      else if (msgText.match(/không|thôi|hủy|quay lại/)) {
        userSessions.delete(userId);
        return {
          type: "text",
          message: "Dạ vâng, bạn có thể để lại số điện thoại sau cũng được. Bạn cần tìm hiểu thêm thông tin gì về trường không?"
        };
      }
      
      // Nếu gõ sai định dạng SĐT
      else {
        return {
          type: "text",
          message: "Số điện thoại có vẻ chưa đúng định dạng. Bạn vui lòng nhập lại số điện thoại (ví dụ: 0912345678) để được hỗ trợ nhé."
        };
      }
    }
  }

  // ==========================================
  // 2. XỬ LÝ NLP & CÁC LUỒNG BÌNH THƯỜNG
  // ==========================================
  const nlpResult = await detectIntent(message); 
  const intent = nlpResult.intent;
  const entities = nlpResult.entities; 

  // ... (Các luồng OUT_OF_SCOPE, GREETING, FAQ giữ nguyên như cũ) ...

  if (intent === "OUT_OF_SCOPE") {
    return { 
      type: "text", 
      message: "Xin lỗi bạn, tôi là trợ lý ảo của Nhà trường. Tôi chỉ hỗ trợ giải đáp các thông tin liên quan đến tuyển sinh, ngành học, học phí và các hoạt động của trường thôi nhé." 
    };
  }

  // 3. XỬ LÝ CHÀO HỎI
  if (intent === "GREETING") {
    return { 
      type: "text", 
      message: "Chào bạn! Cảm ơn bạn đã quan tâm đến Nhà trường. Bạn đang muốn tìm hiểu về khối ngành nào, hay cần hỗ trợ thông tin tuyển sinh ạ?" 
    };
  }

  // Luồng Đăng ký tư vấn / Quan tâm ngành học
if (intent === "FAQ") {
    
    // Lấy nguyên văn tài liệu từ Excel (Đã lưu trong RAM)
    const context = await handleFAQContext(message);

    // Gọi hàm sinh câu trả lời của bạn, truyền cả user message và systemPrompt vào
    const reply = await generateReply(message, context);
    
    return {
      type: "text",
      message: reply
    };
  }

  // Fallback cho AI sinh câu trả lời
  const reply = await generateReply(message, {});
  return {
    type: "text",
    message: "Admin đang lắng nghe đây ạ. Bạn cần hỗ trợ thông tin gì về kỳ tuyển sinh năm nay?"
  };  
};