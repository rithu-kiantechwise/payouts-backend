import jwt from 'jsonwebtoken'

export const generateTokens = (user) => {
  const accessToken = jwt.sign({
    id: user._id,
  },
    process.env.SECRET_KEY,
    { expiresIn: '1m', }
  );

  const refreshToken = jwt.sign({
    id: user._id,
  },
    process.env.SECRET_KEY,
    { expiresIn: '2m', }
  );

  return { accessToken, refreshToken };
};