const { GoogleGenerativeAI } = require("@google/generative-ai");
const apiKey = process.env.GROQ_API_KEY;
const Specialty = require("../models/Speciatly");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Prompt hướng dẫn AI cách phân loại
// const INTENT_PROMPT = `
// Bạn là hệ thống phân loại ý định (Router) của một bệnh viện.
// Nhiệm vụ của bạn là đọc câu chat của người dùng và trả về DUY NHẤT một chuỗi JSON hợp lệ.

// Cấu trúc JSON mong muốn:
// {
//   "intent": "Tên_Intent",
//   "entities": ["từ khóa 1", "từ khóa 2"]
// }

// Quy tắc chọn "intent" (CHỈ CHỌN 1 TRONG CÁC TỪ SAU):
// 1. "MEDICAL": Người dùng kể bệnh, than đau, mô tả triệu chứng. (VD: "tôi hay bị ợ chua", "đau đầu quá").
// 2. "BOOKING": Người dùng YÊU CẦU THỰC HIỆN ĐẶT LỊCH NGAY. Thường mang tính ra lệnh hoặc khẳng định. (VD: "đặt lịch khám cho tôi", "tôi muốn khám bác sĩ A", "chiều nay rảnh không"). TUYỆT ĐỐI KHÔNG CHỌN BOOKING NẾU CÂU CÓ CHỨA CÁC TỪ HỎI CÁCH LÀM (NHƯ: "LÀM SAO", "CÁCH").
// 3. "PRODUCT": Người dùng muốn mua thuốc, hỏi giá thuốc, HOẶC hỏi thuốc chữa một triệu chứng nào đó. (VD: "bán tôi hộp panadol", "tôi bị sổ mũi thì uống thuốc gì", "đau đầu uống gì cho hết").
// 4. "OUT_OF_SCOPE": Người dùng nói chuyện phiếm, hỏi những thứ không liên quan đến y tế. (VD: "thời tiết nay thế nào").
// 5. "GREETING": Câu chào hỏi xã giao. (VD: "chào bạn", "hello").
// 6. "FAQ": Người dùng HỎI ĐÁP, TÌM HIỂU CÁCH SỬ DỤNG website. Thường chứa các từ để hỏi: "làm sao", "cách nào", "hướng dẫn", "ở đâu". (VD: "làm sao để đặt lịch", "cách đặt lịch như thế nào", "xem lịch hẹn ở đâu", "cách tạo lịch rảnh").
// `;

 const INTENT_PROMPT = `
 Bạn là hệ thống phân loại ý định (Router) của một bệnh viện.
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
    // Gọi model Gemini 1.5 Flash
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      systemInstruction: INTENT_PROMPT,
      // Tính năng ép Gemini trả về JSON chuẩn
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1 // Để AI bớt sáng tạo, phân loại chính xác hơn
      }
    });

    const result = await model.generateContent(message);
    const responseText = result.response.text();
    
    // Ép kiểu chuỗi trả về thành Object JSON
    const parsedData = JSON.parse(responseText);
    
    console.log("🔍 [Phân loại Intent]:", parsedData);
    
    return parsedData;

  } catch (error) {
    console.error("❌ Lỗi AI Router (Gemini):", error.message);
    
    // Nếu AI phân loại bị lỗi mạng hoặc quá tải, 
    // Trả về mặc định là FAQ để hệ thống vẫn chạy tiếp sang luồng đọc Excel
    return { intent: "FAQ", entities: [] }; 
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