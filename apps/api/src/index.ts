import './config/env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRoutes } from './routes/auth';
import { projectRoutes } from './routes/projects';
import { snapshotRoutes } from './routes/snapshots';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/snapshots', snapshotRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 API server running on port ${PORT}`);
  });
  
  // Increase timeout for long-running LLM operations (5 minutes)
  server.timeout = 300000;
}

export default app;