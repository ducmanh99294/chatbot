const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
    },
    attachments: [String],
    suggestions: [String]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Faq", faqSchema);
