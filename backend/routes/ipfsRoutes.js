const express = require("express");
const router = express.Router();

// IPFS 업로드 라우트 (더미)
router.post("/upload", async (req, res) => {
  try {
    // 더미 CID와 signature 반환
    res.json({
      cid: "bafybeigdyrzt3dummycidfor-demo",
      signature: "0x1234567890abcdefdummyforsignature",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "IPFS 업로드에 실패했습니다.",
      error: error.message,
    });
  }
});

module.exports = router;
