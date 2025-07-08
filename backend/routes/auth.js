require("dotenv").config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { getUserByEmail, createUser } = require('../services/userService');

/* 로그인 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ message: '이메일 또는 비밀번호가 잘못되었습니다.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: '이메일 또는 비밀번호가 잘못되었습니다.' });

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Refresh Token은 HttpOnly 쿠키로 설정
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false, // 배포할 때는 true로 바꿔야 함
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7일
    });

    res.status(200).json({ accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

/* accessToken 재발급 라우트 */
router.post('/refresh', (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: 'Refresh token 없음' });

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const accessToken = jwt.sign(
      { userId: payload.userId },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    res.status(200).json({ accessToken });
  } catch {
    res.status(401).json({ message: 'Refresh token이 유효하지 않음' });
  }
});

/* 로그아웃 라우트 */
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.status(200).json({ message: '로그아웃되었습니다.' });
});

/* 회원가입 */
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  
  if (!validator.isEmail(email)) { // 이메일 형식 유효성 검사
    return res.status(400).json({ message: '유효한 이메일 주소를 입력해주세요.' });
  }

  try {
    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });
    }
    const userId = await createUser(email, password);
    res.status(201).json({ id: userId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;