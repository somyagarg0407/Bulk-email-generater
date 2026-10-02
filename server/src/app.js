import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';
import { apiLimiter } from './middleware/rateLimit.js';
import routes from './routes/index.js';

const app = express();
if (env.trustProxy) app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.clientUrls, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '1mb' }));
if (!env.isProd) app.use(morgan('dev'));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', apiLimiter, routes);
app.use(notFound);
app.use(errorHandler);

export default app;
