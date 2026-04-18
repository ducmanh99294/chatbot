const Specialty = require("../models/Speciatly");
const Doctor = require("../models/Doctor");
const TimeSlot = require("../models/TimeSlot");
const {detectSpecialtyFromDB} = require("./detectIntent");
const xlsx = require('xlsx');
const path = require('path');

async function handleBookingContext(entities, userId) {
  let specialty = null;
  if (entities && entities.length > 0) {
    specialty = await Specialty.findOne({
      // Tìm chuyên khoa khớp với các từ khóa AI nhả ra (VD: "da liễu")
      name: { $regex: entities.join("|"), $options: "i" } 
    });
  }

  if (!specialty) return { error: "no_specialty" };

  const doctor = await Doctor.findOne({
    specialtyId: specialty._id
  }).populate("userId");

  // Nếu khoa "da liễu" chưa có bác sĩ nào
  if (!doctor) return { specialty, error: "no_doctor" };

  const slot = await TimeSlot.findOne({
    doctorId: doctor._id,
    status: "available",
    date: { $gte: new Date() }
  }).sort({ date: 1 });

  // Nếu bác sĩ đó hết lịch rảnh
  if (!slot) return { specialty, doctor, error: "no_slot" };

  // 🔥 HOLD SLOT
  let holdSuccess = false;

  try {
    // Giả sử bạn đã có hàm holdSlotByAI
    // const held = await holdSlotByAI(slot._id, userId);
    // holdSuccess = !!held;
  } catch (e) {
    holdSuccess = false;
  }

  return {
    type: "booking",
    specialty,
    doctor,
    slot,
    holdSuccess
  };
}

async function handleMedicalContext(entities) {
  let specialty = null;

  if (entities && entities.length > 0) {
    const regexArray = entities.map(keyword => new RegExp(keyword, "i"));

    specialty = await Specialty.findOne({
      $or: [
        { name: { $in: regexArray } },
        { keywords: { $in: regexArray } } // Tìm xem có từ nào khớp với mảng keywords trong DB không
      ]
    });
  }

  if (!specialty) {
    return {
      type: "medical",
      error: "no_specialty"
    };
  }

  const doctor = await Doctor.findOne({ 
    specialtyId: specialty._id
  }).populate("userId");

  const slot = await TimeSlot.findOne({
    doctorId: doctor?._id,
    status: "available",
    date: { $gte: new Date() }
  }).sort({ date: 1, startTime: 1 });

  return {
    type: "medical",
    specialty,
    doctor,
    slot
  };
}

let cachedFAQManual = null;
// Thêm hàm này vào file buildContext.js
function loadFAQDataOnce() {
  // Nếu đã đọc rồi thì bỏ qua không đọc lại
  if (cachedFAQManual !== null) return; 

  try {
    console.log("Đang tải dữ liệu từ file Excel vào bộ nhớ...");
    const filePath = path.join(__dirname, '2026_ KỊCH BẢN CHĂM SÓC.xlsx'); // Đổi tên file cho khớp nếu cần
    
    // Đọc file
    const workbook = xlsx.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Chuyển thành mảng JSON
    const rawData = xlsx.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) {
      console.error("⚠️ Cảnh báo: File Excel không có dữ liệu!");
      cachedFAQManual = "";
      return;
    }

    // Xây dựng chuỗi dữ liệu hướng dẫn cho AI
    let systemManual = "TÀI LIỆU HƯỚNG DẪN TƯ VẤN (TỪ FILE EXCEL):\n\n";

    rawData.forEach((row, index) => {
      // Lấy dữ liệu theo đúng 4 cột trong hình ảnh của bạn
      // Lưu ý: Tên cột phải copy chính xác 100% từ dòng 1 của file Excel
      const noidung = row['Nội dung'] || '';
      const traloi = row['Trả lời'] || '';
      const dinhkem = row['Đính kèm (hình, link, File)...'] || '';
      const morong = row['Mở rộng tương tác Câu hỏi gợi mở sau trả lời (Tùy tình hình)'] || '';

      // Bỏ qua nếu dòng đó không có nội dung và câu trả lời
      if (!noidung && !traloi) return; 

      systemManual += `--- Tình huống ${index + 1} ---\n`;
      if (noidung)  systemManual += `📌 Khách hỏi/Tình huống: ${noidung}\n`;
      if (traloi)   systemManual += `💬 Câu trả lời chuẩn: ${traloi}\n`;
      if (dinhkem)  systemManual += `📎 Link/Đính kèm cần gửi: ${dinhkem}\n`;
      if (morong)   systemManual += `❓ Câu hỏi gợi mở tiếp theo: ${morong}\n`;
      systemManual += `\n`; // Thêm dòng trống để ngăn cách
    });

    // Lưu chuỗi kết quả vào biến Cache
    cachedFAQManual = systemManual.trim();
    console.log("Đã tải xong dữ liệu Excel vào bộ nhớ tạm!");

  } catch (error) {
    console.error("Lỗi khi đọc file Excel:", error);
    // Nếu có lỗi (ví dụ chưa tạo file), thiết lập một câu báo lỗi để không bị sập app
    cachedFAQManual = "Lỗi: Không thể tải dữ liệu hướng dẫn từ hệ thống.";
  }
}

// 3. Kích hoạt hàm đọc file ngay khi file code này được import/chạy
loadFAQDataOnce();

// 4. Hàm xử lý logic chính (Bây giờ chạy cực kỳ nhanh)
async function handleFAQContext(message) {
  if (!cachedFAQManual) {
    console.log("🔄 Thử nạp lại dữ liệu Excel...");
    loadFAQDataOnce();
  }
  // Chỉ việc lấy dữ liệu đã được lưu sẵn trong RAM trả về, không cần đụng đến ổ cứng nữa
  return {
    type: "faq",
    manual: cachedFAQManual
  };
}

// Nhớ export nó ra nhé
module.exports = {
  handleBookingContext,
  handleMedicalContext,
  handleFAQContext 
};
