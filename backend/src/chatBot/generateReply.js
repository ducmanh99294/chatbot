const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async function generateReply(message, context) {
  // 1. NẾU BACKEND KHÔNG TÌM THẤY DỮ LIỆU
  if (!context || !context.hasData) {
    const fallbackSystem = await rewriteWithAI(
      `Câu hỏi: ${message}`,
      "Bạn là EduBot. Hãy lịch sự xin lỗi vì chưa có thông tin chính xác về vấn đề này và mời người dùng để lại Số điện thoại để Thầy/Cô tư vấn kỹ hơn."
    );
    return { message: fallbackSystem, tuitionList: [], intentType: "UNKNOWN" };
  }

  let prompt = "";
  let systemInstruction = "";
  let dataSource = []; // 👈 Tạo biến hứng dữ liệu an toàn để tránh lỗi undefined[0]

  // ==========================================
  // LUỒNG 1: HỎI HỌC PHÍ CHUNG CHUNG
  // ==========================================
  if (context.intentType === "GENERAL_TUITION" || context.type === "GENERAL_TUITION") {
    dataSource = context.tuitionList || context.data; // Hứng dữ liệu an toàn
    
    systemInstruction = `
      Bạn là Chuyên viên tư vấn tuyển sinh của Đại học Đông Á.
      Nhiệm vụ: Dựa vào danh sách thông tin được cung cấp, hãy TỔNG HỢP lại để trả lời.
      1. Chỉ dùng nội dung trong dữ liệu, không bịa thêm.
      2. Nếu có nhiều mức học phí, hãy gộp lại thành 1 đoạn so sánh/tổng quan.
      3. Kết thúc bằng 1 câu hỏi gợi mở tự nhiên.
      4. Xưng hô: "Mình" và "bạn".
    `;

    prompt = `
      [THÔNG TIN HỌC PHÍ]
      ${JSON.stringify(dataSource, null, 2)}

      [CÂU HỎI NGƯỜI DÙNG]
      "${message}"
    `;
  } 
  // ==========================================
  // LUỒNG 2: HỎI CỤ THỂ / FAQ / THỰC TẬP (Luồng Gom Nhóm RAG)
  // ==========================================
  else if (context.type === "faq") {
    dataSource = context.data; // Hứng dữ liệu an toàn

    const xungho = context.userName 
      ? `Xưng "Mình", và gọi thân mật tên người hỏi là "${context.userName}".` 
      : `Xưng "Mình" và gọi người hỏi là "bạn".`;

    systemInstruction = `
      Bạn là Chuyên viên tư vấn tuyển sinh của Trường Đại học Đông Á.
      Nhiệm vụ: Trả lời câu hỏi dựa HOÀN TOÀN vào dữ liệu được cung cấp.

      QUY TẮC TRÌNH BÀY (RẤT QUAN TRỌNG):
      1. Nếu trong dữ liệu có nhiều kết quả, HÃY TỔNG HỢP lại. Dùng ý "Hỏi chung" làm câu mở đầu (nếu có).
      2. Tiếp theo, liệt kê các ví dụ cụ thể (nước ngoài, ngành học...) thành các gạch đầu dòng, in đậm ý chính.
      3. Không lặp lại câu hỏi của người dùng. Không dùng từ "Theo dữ liệu".
      4. Nếu người dùng hỏi cụ thể về chủ đề nào đó, hãy ưu tiên trả lời về chủ đề đó nếu có trong dữ liệu.

      GIỌNG VĂN:
      - ${xungho}
      - Chuyên nghiệp, thân thiện nhưng dứt khoát.
    `;

    // Ép mảng thành chuỗi Text giúp Llama 3 đọc hiểu tốt hơn là ném JSON thô
    const contextString = dataSource.map((item, index) => {
      return `Thông tin ${index + 1}: ${item.traloi}`;
    }).join("\n\n");

    prompt = `
      [DỮ LIỆU TỪ HỆ THỐNG]
      ${contextString}

      [CÂU HỎI NGƯỜI DÙNG]
      "${message}"
    `;
  }

  // 3. Gọi Groq Llama 3 xử lý ngôn ngữ
  const aiReply = await rewriteWithAI(prompt, systemInstruction);

  // 4. LẤY LINK VÀ GỢI Ý MỞ THÔNG MINH BẰNG .find() (Chống lỗi mất Nút bấm)
  const resultWithLink = dataSource.find(item => item.link && item.link.length > 0);
  const finalLink = resultWithLink ? resultWithLink.link[0] : null;

  const resultWithSuggestion = dataSource.find(item => item.goiMo && item.goiMo.length > 0);
  const finalSuggestion = resultWithSuggestion ? resultWithSuggestion.goiMo[0] : null;

  // 5. ĐÓNG GÓI CHUẨN ĐỂ GỬI CHO FRONTEND UI
  return {
    message: aiReply,          
    displayLink: finalLink,   
    displaySuggestion: finalSuggestion, 
    tuitionList: dataSource, // Đã an toàn
    intentType: context.intentType || context.type
  };
};

// Cập nhật lại hàm gọi API để nhận thêm systemInstruction
async function rewriteWithAI(prompt, systemInstruction, retry = 0) {
  const apiKey = process.env.GROQ_API_KEY;

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: systemInstruction // 👈 Đưa System Prompt động vào đây
            },
            {
              role: "user",
              content: prompt
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq error:", data);
      return "Hệ thống AI đang tạm thời lỗi.";
    }

    return data.choices[0].message.content.replaceAll("**", "").trim();

  } catch (error) {
    console.error("Lỗi khi gọi AI:", error);

    if (retry > 0) {
      return rewriteWithAI(prompt, systemInstruction, retry - 1);
    }

    return "AI đang bận, vui lòng thử lại sau.";
  }
}