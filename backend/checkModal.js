// Thay mã API Key của bạn vào chữ YOUR_API_KEY_HERE
const API_KEY = "AIzaSyBe6SOPUok6AbJPGoEFNDWkJkoUaSdNuWU"; 

async function listAllModels() {
  try {
    console.log("Đang tải danh sách Models từ Google...\n");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();

    if (data.error) {
      console.log("❌ Lỗi API Key:", data.error.message);
      return;
    }

    // Lọc và in ra màn hình
    data.models.forEach(model => {
      // Chỉ in ra những model hỗ trợ tạo text (generateContent)
      if (model.supportedGenerationMethods.includes("generateContent")) {
        // Cắt bỏ chữ "models/" ở đầu để lấy tên gọi chính xác đưa vào code
        const modelName = model.name.replace("models/", "");
        console.log(`✅ ${modelName}`);
        console.log(`   📝 Mô tả: ${model.description}`);
        console.log(`   📊 Giới hạn Token: ${model.inputTokenLimit}`);
        console.log("--------------------------------------------------");
      }
    });

  } catch (error) {
    console.log("Lỗi mạng:", error);
  }
}

listAllModels();