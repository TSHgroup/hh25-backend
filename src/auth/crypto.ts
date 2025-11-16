import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export const generateAccessToken = (accountId: string) => jwt.sign({ accountId }, process.env.JWT_SECRET!, { expiresIn: '10m' });
export const generateRefreshToken = (accountId: string) => jwt.sign({ accountId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '30d' });

export const generateVerificationCode = () => crypto.randomInt(100000, 999999).toString();
export const generateVerificationToken = () => crypto.randomBytes(32).toString('hex');

export const hashToken = (token: string) => bcrypt.hash(token, 10);
export const secureCompare = (a: string, b: string) => {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}