import jwt from 'jsonwebtoken';

export const newRefreshToken = async (req, res, next) => {
    const refreshToken = req.headers.authorization;
    if (!refreshToken) {
        return res.status(403).json({ success: false, message: 'Unauthorized: Missing refresh token' });
    }

    const [, token] = refreshToken.split(' ')
    if (!token) {
        return res.status(403).json({ success: false, message: 'Unauthorized: Missing token' });
    }
    try {
        jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    return res.status(406).json({ success: false, message: 'Forbidden: Refresh token has expired' });
                }
                return res.status(403).json({ success: false, message: 'Forbidden: Invalid refresh token' });
            }
            const newAccessToken = jwt.sign({
                id: user.id,
            },
                process.env.SECRET_KEY,
                { expiresIn: '7d', }
            );
            return res.status(200).json({ success: true, newAccessToken })
        });
    } catch (error) {
        next(error);
    }
};