const express = require("express");
const router = express.Router();
const clickhouse = require('../src/config/clickhouse');

router.get('/top-clicks', async (req, res) => {
  const segment = req.query.filter;
  // gender: 'male' | 'female' | 'other';
  // ageGroup: '10s' | '20s' | '30s' | '40s' | '50s' | '60s+';
  // signupPath: 'google' | 'facebook' | 'email' | 'kakao' | 'naver' | 'direct' | 'instagram';
  // device: 'mobile' | 'desktop' | 'tablet';
  try {
    if (segment === gender) {

    } else if (segment === ageGroup) {
  
    } else if (segment === signupPath) {
  
    } else if (segment === device) {
  
    } else {
      res.status(400).json({ error: 'Invalid user segment' });
    }
  } catch (err) {
    console.error('Top Clicks API ERROR:', err);
    res.status(500).json({ error: 'Failed to get top clicks data' });
  }
});

module.exports = router;
