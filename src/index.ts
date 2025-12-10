/**
 * AgoraX Backend Server Entry Point
 * 
 * @module index
 * @description Main application file that initializes and configures the Express server
 * for the AgoraX video conferencing platform. Sets up middleware, routes, CORS,
 * and starts the HTTP server.
 * 
 * @requires express - Web framework for Node.js
 * @requires dotenv - Environment variable loader
 * @requires cors - Cross-Origin Resource Sharing middleware
 */

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import routes from './routes/routes';

// Load environment variables from .env file
dotenv.config();

/**
 * Express application instance.
 * @type {express.Application}
 */
const app = express();

/**
 * Server port number from environment variable or default to 3000.
 * @type {number}
 * @default 3000
 */
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Enable CORS for development. Adjust origin in production.
app.use(cors());
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Parse JSON request bodies
app.use(express.json());

// Mount API routes under /api prefix
app.use('/api', routes);

/**
 * Health check endpoint.
 * 
 * @route GET /
 * @returns {object} 200 - Server status
 * @example
 * Response:
 * {
 *   "ok": true
 * }
 */
app.get('/', (req, res) => res.json({ ok: true }));

/**
 * Start the Express server and listen on the configured port.
 */
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
