import rateLimit from 'express-rate-limit';

const make = (windowMs, limit, message) =>
  rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { error: { message } } });

export const apiLimiter = make(60_000, 300, 'Too many requests. Please slow down.');
export const loginLimiter = make(15 * 60_000, 10, 'Too many login attempts. Try again later.');
export const generateLimiter = make(60_000, 60, 'Too many recipient generations. Please wait a moment.');
