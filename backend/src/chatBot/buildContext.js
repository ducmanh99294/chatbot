const Faq = require("../models/Faq");
const {detectSpecialtyFromDB} = require("./detectIntent");

let cachedFAQManual = null;
let cachedFAQArray = []; 

async function loadFAQFromDB() {
  if (cachedFAQArray.length > 0) return;

  try {
    const faqs = await Faq.find();

    cachedFAQArray = faqs.map((item, index) => ({
      id: index + 1,
      noidung: item.question.toLowerCase(),
      traloi: item.answer.toLowerCase(),
      link: item.attachments || [],
      goiMo: item.suggestions || [],
    }));

    console.log(`Đã load ${cachedFAQArray.length} FAQ từ MongoDB`);
  } catch (err) {
    console.error("Lỗi load DB:", err);
  }
}

async function handleFAQContext(message, entities = []) {
  // 1. Load DB nếu chưa có
  if (cachedFAQArray.length === 0) {
    await loadFAQFromDB();
  }

  // 2. Xử lý từ khóa
  let searchKeywords = [];

  if (entities.length > 0) {
    const extraWords = message
      .toLowerCase()
      .split(" ")
      .filter(w => w.length > 2);

    searchKeywords = [...new Set([
      ...entities.map(e => e.toLowerCase()),
      ...extraWords
    ])];
  }

  console.log("🔍 Keywords đang tìm:", searchKeywords);

  // 3. Chấm điểm các kết quả trong RAM
  let scoredRows = cachedFAQArray.map(item => {
    let score = 0;
    searchKeywords.forEach(kw => {
      if (item.noidung.includes(kw)) score += 3;
      if (item.traloi.includes(kw)) score += 1;
    });
    return { ...item, score };
  });

  // 4. Lọc ra top 3 kết quả điểm cao nhất
  const top3Rows = scoredRows
    .filter(item => item.score > 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // 5. TRẢ VỀ ĐÚNG ĐỊNH DẠNG MỚI (RẤT QUAN TRỌNG)
  if (top3Rows.length > 0) {
    // Nếu tìm thấy, trả về hasData: true và truyền mảng top3Rows đi
    return {
      type: "faq",
      hasData: true, 
      data: top3Rows // Frontend sẽ dùng cái này để vẽ Card
    };
  } else {
    // Nếu không tìm thấy bất kỳ dòng nào khớp
    return {
      type: "faq",
      hasData: false,
      data: null
    };
  }
}

module.exports = {
  handleFAQContext 
};
