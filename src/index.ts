import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import routes from './routes/routes';

dotenv.config();

const app = express();

// Enable CORS for development. Adjust origin in production.
app.use(cors());
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());
app.use('/api', routes);

app.get('/', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
