const mongoose = require("mongoose");
const XLSX = require("xlsx");

// connect DB
mongoose.connect("mongodb://127.0.0.1:27017/test");

// schema
const FaqSchema = new mongoose.Schema({
  name: String,
  tuition: String,
  keywords: [String],
  
});

const Faq = mongoose.model("Faq", FaqSchema);

async function importExcel() {
  // đọc file
  const workbook = XLSX.readFile("majors.xlsx");
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  // xử lý data
  const formatted = data.map(row => ({
    name: row.name,
    tuition: row.tuition,
    keywords: row.keywords.split(",").map(k => k.trim().toLowerCase())
  }));

  // insert DB
  await Major.insertMany(formatted);

  console.log("Import thành công!");
  process.exit();
}

importExcel();