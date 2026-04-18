const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async function generateReply(message, context) {
  let prompt = "";
  let systemInstruction = "";

  // ==========================================
  // 1. NẾU LÀ CÂU HỎI CÓ DATA TỪ FILE EXCEL (FAQ, HỎI NGÀNH, HỌC PHÍ...)
  // ==========================================
  if (context.type === "faq") {
    systemInstruction = `
      Bạn là Chuyên viên tư vấn tuyển sinh của Nhà trường (Đại học).
      Nhiệm vụ của bạn là giải đáp thắc mắc của học sinh/phụ huynh DỰA HOÀN TOÀN vào Tài liệu hướng dẫn bên dưới.
      Tuyệt đối không bịa thêm thông tin về học phí, ngành học hay điểm chuẩn nếu tài liệu không nhắc đến.

      YÊU CẦU TRẢ LỜI CỤ THỂ:
      1. Trả lời tự nhiên, ngắn gọn dựa trên "Câu trả lời chuẩn".
      2. Nếu tài liệu có cung cấp "Link/Đính kèm", hãy khéo léo chèn vào câu trả lời để hướng dẫn học sinh xem thêm.
      3. BẮT BUỘC kết thúc câu trả lời bằng nguyên văn nội dung trong phần "Câu hỏi gợi mở tiếp theo" (nếu có trong tài liệu).
      4. Giọng điệu thân thiện, nhiệt tình, xưng "Admin", "Thầy/Cô" hoặc "Mình" và gọi "bạn", "em".
    `;

    prompt = `
      TÀI LIỆU HƯỚNG DẪN TỪ NHÀ TRƯỜNG:
      ${context.manual || "Không có tài liệu."}

      Câu hỏi của học sinh: "${message}"
    `;
  } 
  
  // ==========================================
  // 2. CÁC TRƯỜNG HỢP KHÁC (Chào hỏi, trò chuyện linh tinh, Fallback)
  // ==========================================
  else {
    // Nếu bạn có truyền entities từ NLP sang thì lấy ra, không thì để trống
    const extractedKeywords = context.entities && context.entities.length > 0 
      ? context.entities.join(", ") 
      : "Không có từ khóa nổi bật";

    systemInstruction = `
      Bạn là Chuyên viên tư vấn tuyển sinh của Nhà trường (Đại học).
      Nhiệm vụ của bạn là giải đáp thắc mắc DỰA HOÀN TOÀN vào Tài liệu hướng dẫn bên dưới.

      QUY TẮC TRẢ LỜI CỤ THỂ:
      1. Tuyệt đối KHÔNG bịa đặt số liệu. Nếu tài liệu không có, hãy báo là chưa có thông tin.
      2. Nếu người dùng hỏi CHUNG CHUNG về Học phí hoặc Danh sách ngành học, hãy tự động lọc dữ liệu từ tài liệu và trình bày dưới dạng BẢNG (Table) cho dễ nhìn. 
         (Ví dụ cấu trúc bảng: | Tên Ngành | Học phí / Tín chỉ | Tổng học phí dự kiến |).
      3. Nếu tài liệu có cung cấp "Link/Đính kèm", BẮT BUỘC chèn link đó vào câu trả lời theo đúng định dạng Markdown sau: [Nội dung hiển thị](URL_của_link). 
         Ví dụ: [Xem chi tiết tại đây](https://donga.edu.vn/tuyensinh2026).
      4. BẮT BUỘC kết thúc câu trả lời bằng nội dung trong phần "Câu hỏi gợi mở tiếp theo".
    `;

prompt = `
      TÀI LIỆU HƯỚNG DẪN TỪ NHÀ TRƯỜNG:
      ${context.manual || "Không có tài liệu."}

      Câu hỏi của học sinh: "${message}"
    `;
  }

  console.log("=====================================");
  console.log("📩 DỮ LIỆU THỰC TẾ GỬI CHO AI ĐỌC:");
  console.log("System:", systemInstruction);
  console.log("Prompt:", prompt);
  console.log("=====================================");
  // Truyền cả prompt (nội dung user hỏi) và systemInstruction (định hình nhân vật) vào AI
  return await rewriteWithAI(prompt, systemInstruction);
};

// Cập nhật lại hàm gọi API để nhận thêm systemInstruction
async function rewriteWithAI(prompt, systemInstruction, retry = 1) {
  try {
    // 1. Cấu hình mô hình Gemini 1.5 Flash (Context Window 1 triệu token)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      systemInstruction: systemInstruction // 👈 Đưa System Prompt vào đây
    });

    // 2. Gửi câu hỏi (Prompt) bao gồm file Excel lên cho AI
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    let finalText = response.text();

    // 💡 LƯU Ý QUAN TRỌNG VỀ MARKDOWN:
    // Code cũ của bạn có đoạn: .replaceAll("**", "")
    // Nếu bạn muốn AI vẽ bảng (Table) hoặc in đậm chữ cho đẹp, bạn KHÔNG NÊN xóa dấu **
    // Mình đã tạm bỏ lệnh replaceAll đó đi để giao diện hiển thị Markdown chuẩn nhất.
    return finalText.trim();

  } catch (error) {
    console.error("❌ Lỗi khi gọi Gemini AI:", error.message);

    // 3. Cơ chế Retry nếu API bị timeout hoặc lỗi mạng
    if (retry > 0) {
      console.log(`⏳ Đang thử gọi lại AI... (Còn ${retry} lần)`);
      // Đợi 1 giây rồi mới gọi lại để tránh bị block spam
      await new Promise(resolve => setTimeout(resolve, 1000));
      return rewriteWithAI(prompt, systemInstruction, retry - 1);
    }

    return "Hệ thống tư vấn đang tạm thời bận, bạn vui lòng thử lại sau ít phút nhé.";
  }
}