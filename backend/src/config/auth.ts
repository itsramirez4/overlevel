import jwt from 'jsonwebtoken';

// No fallback: a default secret checked into source would let anyone who's
// read this file forge a valid access token for any user_id. Fail loudly at
// startup instead of silently signing tokens with a public string.
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;
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
