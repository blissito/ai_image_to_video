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
  if (!token) {
    console.error('No token provided for verification');
    return null;
  }

  // Basic JWT format validation (3 parts separated by dots)
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    console.error('Invalid token format:', token.length > 50 ? `${token.substring(0, 50)}...` : token);
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string; type: string };
    
    if (!decoded || typeof decoded !== 'object') {
      console.error('Invalid token payload:', decoded);
      return null;
    }

    if (decoded.type !== 'magic_link') {
      console.error('Invalid token type:', decoded.type);
      return null;
    }

    if (!decoded.email) {
      console.error('No email in token payload');
      return null;
    }

    return { email: decoded.email };
  } catch (err: any) {
    console.error('Token verification failed:', {
      name: err.name,
      message: err.message,
      expiredAt: err.expiredAt,
      date: new Date().toISOString()
    });
    return null;
  }
};