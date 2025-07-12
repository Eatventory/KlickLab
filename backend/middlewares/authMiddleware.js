const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "인증 토큰이 필요합니다" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      sdk_key: decoded.sdk_key
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "유효하지 않은 토큰입니다" });
  }
}

module.exports = authMiddleware;
