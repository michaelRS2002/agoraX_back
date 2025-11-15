import express from 'express';
import dotenv from 'dotenv';
import routes from './routes/routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());
app.use('/api', routes);

app.get('/', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
