import jwt from 'jsonwebtoken'

export const generateTokens = (user) => {
  const accessToken = jwt.sign({
    id: user._id,
  },
    process.env.SECRET_KEY,
    { expiresIn: '1d', }
  );

  const refreshToken = jwt.sign({
    id: user._id,
  },
    process.env.SECRET_KEY,
    { expiresIn: '7d', }
  );

  return { accessToken, refreshToken };
};