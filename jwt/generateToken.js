import jwt from 'jsonwebtoken'

export const generateTokens = (user) => {
  const accessToken = jwt.sign({
    id: user._id,
  },
    process.env.SECRET_KEY,
    { expiresIn: '7d', }
  );

  const refreshToken = jwt.sign({
    id: user._id,
  },
    process.env.SECRET_KEY,
    { expiresIn: '30d', }
  );

  return { accessToken, refreshToken };
};