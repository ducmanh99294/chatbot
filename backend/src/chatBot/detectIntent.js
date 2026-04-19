// const { GoogleGenerativeAI } = require("@google/generative-ai");
const apiKey = process.env.GROQ_API_KEY;

 const INTENT_PROMPT = `
 Bạn là hệ thống phân loại ý định (Router) của một Trường Đại học.
Nhiệm vụ của bạn là đọc câu chat của người dùng và trả về DUY NHẤT một chuỗi JSON hợp lệ.

Cấu trúc JSON mong muốn:
{
  "intent": "Tên_Intent",
  "entities": ["từ khóa 1", "từ khóa 2"]
}
  quy tắc chọn "intent" (CHỈ CHỌN 1 TRONG CÁC TỪ SAU):
  1. "FAQ": Người dùng HỎI ĐÁP, TÌM HIỂU VỀ THÔNG TIN CỦA NHÀ TRƯỜNG NHƯ HỌC PHÍ, NGÀNH, MÔN HỌC,... Thường chứa các từ để hỏi: "phương thức xét tuyển", "học bổng", "du học", "xét tuyển online", "học phí", " thực tập", "uy tín", "tuyển". (VD: "tôi muốn xét tuyển online", "làm thế nào để du học", "xét học bổng", "lịch  học").
  2. "OUT_OF_SCOPE": Người dùng nói chuyện phiếm, hỏi những thứ không liên quan đến y tế. (VD: "thời tiết nay thế nào").
  3. "GREETING": Câu chào hỏi xã giao. (VD: "chào bạn", "hello").
`

// Hàm mới dùng AI để phân loại
async function detectIntent(message) {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", // Model nhẹ, chạy cực nhanh
        messages: [
          { role: "system", content: INTENT_PROMPT },
          { role: "user", content: message }
        ],
        response_format: { type: "json_object" }, // Ép trả về JSON
        temperature: 0.1
      })
    });

    const data = await response.json();
    console.log(JSON.stringify(data.choices[0].message, null, 2))
    const result = JSON.parse(data.choices[0].message.content);
    
    return result; // Kết quả sẽ có dạng: { intent: "MEDICAL", entities: ["đau đầu"] }

  } catch (error) {
    console.log("Lỗi AI Router:", error);
    return { intent: "UNKNOWN", entities: [] }; 
  }
}

// Hàm cũ của bạn (Giữ nguyên)
async function detectSpecialtyFromDB(message) {
  const msg = message.toLowerCase();
  const specialty = await Specialty.findOne({
    keywords: {
      $elemMatch: {
        $regex: msg,
        $options: "i"
      }
    }
  });
  return specialty;
};

module.exports = {
  detectIntent,
  detectSpecialtyFromDB
};