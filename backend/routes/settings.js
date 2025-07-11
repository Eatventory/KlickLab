const express = require("express");
const router = express.Router();
const clickhouse = require("../src/config/clickhouse");
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/get-key', authMiddleware, (req, res) => {
  const { sdk_key } = req.user;
  res.status(200).json(sdk_key);
});


module.exports = router;
