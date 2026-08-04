import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this';
const JWT_EXPIRE_ACCESS = process.env.JWT_EXPIRE_ACCESS || '15m';
const JWT_EXPIRE_REFRESH = process.env.JWT_EXPIRE_REFRESH || '7d';

export const createTokens = (userId: string) => {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE_ACCESS as jwt.SignOptions['expiresIn'] }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE_REFRESH as jwt.SignOptions['expiresIn'] }
  );

  return { accessToken, refreshToken };
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (error) {
    throw new Error('Invalid token');
  }
};
