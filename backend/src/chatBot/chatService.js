const { detectIntent } = require("./detectIntent");
const {  handleFAQContext } = require("./buildContext");
const generateReply = require("./generateReply");
const Faq = require("../models/Faq");

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

  // 1. KIỂM TRA BỘ NHỚ TẠM
  if (!userSessions.has(userId)) {
    userSessions.set(userId, { step: null, topic: null, previousKeywords: [] });
  }
  const session = userSessions.get(userId);

  // 2. XỬ LÝ NLP & PHÂN LOẠI
  const nlpResult = await detectIntent(message); 
  const intent = nlpResult.intent;
  let entities = nlpResult.entities || [];

  // ==========================================
  // 🧠 3. LOGIC KẾT NỐI TRÍ NHỚ (ĐƯA LÊN ƯU TIÊN 1)
  // ==========================================
  if (session.step === "WAITING_FOR_MAJOR") {
    console.log(`🧠 [Memory] Đang chờ ngành. Topic đang nhớ: [${session.topic}]`);

    const hasMajorSign = msgText.includes("ngành") || msgText.includes("khoa") || entities.length > 0;
    
    if (hasMajorSign) {
      // BƯỚC QUAN TRỌNG: Băm nhỏ câu nói của khách để chống gõ sai chính tả
      const words = msgText.split(" ").filter(w => w.length > 2);

    let combinedKeywords = [session.topic, ...words, ...entities];
    // Dù AI có bảo OUT_OF_SCOPE, ta vẫn lấy nguyên câu khách gõ để ép tìm kiếm
    const testContext = await handleFAQContext(message, combinedKeywords);

      if (testContext && testContext.hasData) {
        console.log("✅ Khách đã nhập ngành. Ráp nối thành công! Xóa trí nhớ.");
        session.step = null;
        session.topic = null;

        testContext.data = [testContext.data[0]];

        const reply = await generateReply(message, testContext);
        return { type: "text", ...reply };
      }
    }
    else {
      console.log("Khách bẻ lái hoặc không tìm thấy. GIỮ NGUYÊN TRÍ NHỚ!");
    }
  }

  const nameMatch = msgText.match(/(?:mình là|tôi là|em là|anh là|chị là|mình tên|tôi tên|em tên|tên là)\s+([a-zà-ỹ\s]+)$/i);
  if (nameMatch) {
    // Lấy tên ra và viết hoa chữ cái đầu cho lịch sự (ví dụ: "mạnh" -> "Mạnh")
    let rawName = nameMatch[1].trim();
    let cleanName = rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // Lưu tên vào bộ nhớ Session
    session.userName = cleanName;
    console.log(`👤 [User Info] Đã lưu tên khách hàng: ${session.userName}`);

    // Trả lời ngay lập tức
    return {
      type: "text",
      message: `Chào ${cleanName} nhé! Rất vui được trò chuyện với bạn. ${cleanName} đang muốn tìm hiểu về khối ngành nào, hay cần hỗ trợ thông tin tuyển sinh ạ?`
    };
  }
  // ==========================================
  // 🛑 4. KIỂM TRA OUT_OF_SCOPE (ĐƯA XUỐNG ƯU TIÊN 2)
  // ==========================================
  if (intent === "OUT_OF_SCOPE") {
    return { 
      type: "text", 
      message: "Xin lỗi bạn, tôi là trợ lý ảo của Nhà trường. Tôi chỉ hỗ trợ giải đáp các thông tin liên quan đến tuyển sinh, ngành học, học phí và các hoạt động của trường thôi nhé." 
    };
  }

  // 5. XỬ LÝ CHÀO HỎI
  if (intent === "GREETING") {
    return { 
      type: "text", 
      message: "Chào bạn! Cảm ơn bạn đã quan tâm đến Nhà trường. Bạn đang muốn tìm hiểu về khối ngành nào, hay cần hỗ trợ thông tin tuyển sinh ạ?" 
    };
  }

  // ==========================================
  // 📚 6. LUỒNG FAQ BÌNH THƯỜNG
  // ==========================================
if (intent === "FAQ" || intent === "1. FAQ") {
    const context = await handleFAQContext(message, entities);

    // 💡 DANH SÁCH 1: CHỦ ĐỀ NGẶT NGHÈO (Bắt buộc phải có ngành mới trả lời được)
    const strictTopics = ["điểm chuẩn", "điểm sàn", "tổ hợp môn", "môn học"];
    
    // 💡 DANH SÁCH 2: CHỦ ĐỀ LAI (Có thể trả lời chung, nhưng vẫn cần lưu trí nhớ ngầm)
    const hybridTopics = ["học phí", "thực tập", "du học"];

    // Quét tìm Topic
    let currentStrictTopic = entities.find(e => strictTopics.includes(e.toLowerCase())) || 
                             (msgText.match(new RegExp(strictTopics.join("|"), "i")) || [])[0];
    let currentHybridTopic = entities.find(e => hybridTopics.includes(e.toLowerCase())) || 
                             (msgText.match(new RegExp(hybridTopics.join("|"), "i")) || [])[0];

    const isAskingProcedure = msgText.match(/đóng|nộp|cách|hướng dẫn|thủ tục/);
    const hasMajorWord = msgText.includes("ngành") || msgText.includes("khoa");

    if (context && context.hasData) {
      
      // 🔥 TRƯỜNG HỢP 1: CHỦ ĐỀ LAI (Ví dụ: Học phí)
      // Nếu hỏi học phí mà chưa có ngành -> Bật trí nhớ ngầm, nhưng KHÔNG CHẶN câu trả lời
      if (currentHybridTopic && !hasMajorWord && !isAskingProcedure) {
        console.log(`🧠 [Memory] Kích hoạt trí nhớ ngầm cho chủ đề Lai [${currentHybridTopic}]`);
        session.step = "WAITING_FOR_MAJOR";
        session.topic = currentHybridTopic?.toLowerCase();
        // KHÔNG CÓ lệnh return ở đây -> Nó sẽ trôi xuống dưới để in ra cái Bảng Giá Học Phí Chung
      }

      // 🛑 TRƯỜNG HỢP 2: CHỦ ĐỀ NGẶT NGHÈO (Ví dụ: Điểm chuẩn)
      // Chặn lại và hỏi ngược lại khách hàng ngay lập tức
      if (currentStrictTopic && !hasMajorWord) {
        console.log(`⚠️ [Memory] Thiếu ngành cho chủ đề Ngặt nghèo [${currentStrictTopic}]. Chặn lại hỏi!`);
        session.step = "WAITING_FOR_MAJOR";
        session.topic = currentStrictTopic?.toLowerCase();

        return {
          type: "text",
          message: `Bạn đang quan tâm đến ${currentStrictTopic} của ngành học nào để mình kiểm tra thông tin cụ thể cho bạn nhé?`,
          displayLink: null,
          displaySuggestion: null,
          tuitionList: [],
          intentType: "ASK_MISSING_INFO"
        };
      }
    }

    // Nếu có tên session.userName, nhét vào context cho AI xưng hô
    if (session.userName) context.userName = session.userName;

    // Trả lời (Dành cho hỏi thủ tục, hỏi đầy đủ, hoặc in bảng giá của Chủ đề Lai)
    const reply = await generateReply(message, context);
    return {
      type: "text",
      ...reply 
    };
  }

  // 7. FALLBACK
  const fallbackReply = await generateReply(message, { hasData: false });
  return {
    type: "text",
    ...fallbackReply
  };
};