const Faq = require("../models/Faq");
const XLSX = require("xlsx");
const mongoose = require("mongoose");

const DEFAULT_FAQS = [
  { question: "Làm thế nào để đặt lịch khám với bác sĩ?", answer: "Bạn có thể đặt lịch trực tuyến qua trang Đặt lịch: chọn chuyên khoa, bác sĩ, ngày giờ phù hợp và điền thông tin. Hệ thống sẽ gửi xác nhận qua email/SMS.", order: 1 },
  { question: "Tôi có thể hủy hoặc đổi lịch khám không?", answer: "Có. Bạn vào mục Lịch hẹn của tôi, chọn lịch cần hủy/đổi và thao tác. Nên hủy hoặc đổi trước ít nhất 24 giờ để người khác có thể đặt lịch.", order: 2 },
  { question: "Chi phí khám và thanh toán như thế nào?", answer: "Mức phí tùy từng chuyên khoa và bác sĩ, hiển thị khi bạn chọn bác sĩ. Bạn có thể thanh toán trực tuyến (chuyển khoản, ví điện tử) hoặc thanh toán tại phòng khám.", order: 3 },
  { question: "Kết quả khám và đơn thuốc có được gửi online không?", answer: "Sau khám, bác sĩ có thể gửi đơn thuốc và tóm tắt kết quả qua ứng dụng/email. Bạn có thể xem lại trong mục Hồ sơ khám bệnh.", order: 4 },
  { question: "Tư vấn từ xa (video/chat) có được hỗ trợ không?", answer: "Một số bác sĩ hỗ trợ tư vấn từ xa. Khi đặt lịch bạn có thể chọn hình thức khám trực tiếp hoặc trực tuyến tùy từng bác sĩ.", order: 5 },
];

// Lấy tất cả FAQ (public, chỉ lấy isActive, sắp xếp theo order)
exports.getAllFaqs = async (req, res) => {
  try {
    let faqs = await Faq.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    if (faqs.length === 0) {
      await Faq.insertMany(DEFAULT_FAQS);
      faqs = await Faq.find({ isActive: true }).sort({ order: 1 }).lean();
    }
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createFaqs = async (req, res) => {
  try { 
  const { question } = req.body;

    const news = await Faq.create({
      question
    });

    res.status(201).json(news);
  } catch (e) {
    res.status(500).json({ message: error.message });
  }
}

exports.answerFaq = async (req, res) => {
  try {
 const { question } = req.body;

    const news = await Faq.findById({
      question
    });

    res.status(201).json(news);
  } catch (e) {
    res.status(500).json({ message: error.message });
  }
}
const normalizeRow = (row) => {
  const newRow = {};
  for (let key in row) {
    newRow[key.trim()] = row[key];
  }
  return newRow;
};

exports.uploadFile = async (req, res) => {
  try {
    
    console.log("DB:", mongoose.connection.name);

    if (!req.file) {
      return res.status(400).json({ message: "Chưa có file" });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log("RAW DATA:", data); // 👈 thêm cái này

    const formatted = data
      .map(normalizeRow)
      .map(row => {
        const question = row["Nội dung"]?.toString().trim();
        const answer = row["Trả lời"]?.toString().trim();
        const attachments = row["Đính kèm"]?.toString().trim() || [];
        const suggestions = row["Câu hỏi gợi mở"]?.toString().trim() || [];

        if (!question || !answer) return null;

        return {
          question,
          answer,
          attachments, // không có cũng OK
          suggestions  // không có cũng OK
        };
      })
      .filter(Boolean);
    console.log("COLUMNS:", Object.keys(data[0]));
    console.log("FORMATTED:", formatted); // 👈 log đúng chỗ

    await Faq.deleteMany({});
    const result = await Faq.insertMany(formatted);

    console.log("Inserted:", result.length);

    res.json({
      message: "Import thành công",
      total: formatted.length
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi import file" });
  }
};