import './config/env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRoutes } from './routes/auth';
import { projectRoutes } from './routes/projects';
import { snapshotRoutes } from './routes/snapshots';
import { taskRoutes } from './routes/tasks';
import { billingRoutes, webhookHandler } from './routes/billing';
import { authenticateToken } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());

// Stripe webhook needs raw body - must be before express.json()
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), webhookHandler);

app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/projects', authenticateToken, projectRoutes);
app.use('/api/snapshots', authenticateToken, snapshotRoutes);
app.use('/api/tasks', authenticateToken, taskRoutes);
app.use('/api/billing', authenticateToken, billingRoutes);

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