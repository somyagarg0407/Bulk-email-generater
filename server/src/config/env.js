import 'dotenv/config';

const required = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
};

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = required('JWT_SECRET');
if (nodeEnv === 'production' && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}

export const env = Object.freeze({
  nodeEnv,
  isProd: nodeEnv === 'production',
  port: Number(process.env.PORT || 5000),
  mongoUri: required('MONGO_URI'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim()),
  trustProxy: process.env.TRUST_PROXY === '1',
  defaultEmailDomain: (process.env.DEFAULT_EMAIL_DOMAIN || 'nitdelhi.ac.in').toLowerCase(),
});
