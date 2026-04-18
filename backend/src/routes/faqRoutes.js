const express = require("express");
const router = express.Router();
const faqController = require("../controllers/faqController");
const multer = require("multer");

const upload = multer({
  dest: "uploads/"
});

// public
router.post("/upload", upload.single("file"), faqController.uploadFile);

module.exports = router;
