import express from 'express';
import { connectDb } from './db.js';
import { analysesRouter } from './routes/analyses.js';
import { profileRouter } from './routes/profile.js';

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/analyses', analysesRouter);
app.use('/api/profile', profileRouter);

async function start() {
  await connectDb();
  app.listen(PORT, () => {
    console.log(`job-match server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
