import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import mongoose from 'mongoose';

await connectDB();
const server = app.listen(env.port, () => console.log(`API listening on :${env.port} (${env.nodeEnv})`));

const shutdown = () => server.close(async () => { await mongoose.disconnect(); process.exit(0); });
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
