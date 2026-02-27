import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { env } from './config/env';
import { errorHandler } from './middleware/error';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/v1', routes);

app.use(errorHandler);
