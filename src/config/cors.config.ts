import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

export default corsOptions; 