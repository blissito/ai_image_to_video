import jwt from 'jsonwebtoken';
// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'blissmo';
// JWT Token Functions
export const generateMagicToken = (email: string): string => {
  return jwt.sign(
    { email, type: 'magic_link' },
    JWT_SECRET,
    { expiresIn: '120m' } // Token expires in 15 minutes
  );
};

export const verifyMagicToken = (token: string): { email: string } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string; type: string };
    if (decoded.type !== 'magic_link') return null;
    return { email: decoded.email };
  } catch (err) {
    console.error('Token verification failed:', err);
    return null;
  }
};