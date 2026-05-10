// middleware/auth.js
const { auth, db } = require('../utils/firebase');
const { COLLECTIONS } = require('../utils/constants'); // dùng nếu có, không thì thay bằng chuỗi 'users'

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing or invalid token format' });
  }
  const token = authHeader.split(' ')[1];
  try {
    // Xác thực token với Firebase Admin
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken; // chứa uid, email, v.v.

    // Lấy thông tin từ Firestore (collection users)
    const userDoc = await db.collection(COLLECTIONS.USERS || 'users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({ error: 'User data not found in Firestore' });
    }
    req.userData = userDoc.data(); // chứa fullName, role, stationId (nếu là staff), stationIds (nếu là owner)
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { verifyToken };