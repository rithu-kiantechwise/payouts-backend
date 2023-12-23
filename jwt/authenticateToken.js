import jwt from 'jsonwebtoken'

export const authenticateToken = (req, res, next) => {
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Missing token' });
  }

  const [, token] = authorizationHeader.split(' ')
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Missing token' });
  }

  jwt.verify(token, process.env.SECRET_KEY, async (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(406).json({ success: false, message: 'Unauthorized: Token has expired' });
      } else {
        console.log(err);
        return res.status(403).json({ success: false, message: 'Forbidden: Invalid token' });
      }
    }
    req.user = user;
    next();
  });
};