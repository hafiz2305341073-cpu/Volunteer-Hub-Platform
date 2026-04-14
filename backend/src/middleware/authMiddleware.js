const admin = require('../config/firebaseAdmin');
const User = require('../models/User');

async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing Bearer token.' });
    }

    const idToken = authHeader.split(' ')[1];

    if (!idToken) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token format.' });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.auth = decodedToken;

    const dbUser = await User.findOne({ firebaseUid: decodedToken.uid }).lean();

    req.user = {
      id: dbUser?._id || null,
      firebaseUid: decodedToken.uid,
      email: decodedToken.email || dbUser?.email || null,
      role: dbUser?.role || decodedToken.role || 'volunteer',
      profileCompleted: Boolean(dbUser)
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      message: 'Unauthorized: Token verification failed.',
      error: error.message
    });
  }
}

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User context is missing.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: This route requires one of [${allowedRoles.join(', ')}].`
      });
    }

    return next();
  };
}

module.exports = {
  verifyFirebaseToken,
  requireRoles
};