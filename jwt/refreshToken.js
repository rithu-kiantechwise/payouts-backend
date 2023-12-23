import jwt from 'jsonwebtoken'

export const refreshTokenMiddleware = ({ refreshToken, authorizationHeader }) => {

  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Missing refresh token' });
  }

  jwt.verify(refreshToken, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(406).json({ success: false, message: 'Forbidden: Refresh token has expired' });
      }
      return res.status(403).json({ success: false, message: 'Forbidden: Invalid refresh token' });
    }
   req.user = user
    
    // Generate a new access token
    const newAccessToken = jwt.sign({
      id: user.id,
    },
    process.env.SECRET_KEY,
    { expiresIn: '1d', }
    );
    
    // Attach the new access token to the response for the client to use
    // res.set('Authorization', newAccessToken);

     authorizationHeader = 'Bearer ' + newAccessToken;
  });
};