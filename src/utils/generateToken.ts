import jwt from 'jsonwebtoken';

const generateToken = (id: string): string => {
  const secret = process.env.JWT_SECRET || 'supersecret123';
  const expiresInMs = 30 * 24 * 60 * 60; // 30 days in seconds
  return jwt.sign({ id }, secret, { expiresIn: expiresInMs });
};

export default generateToken;
