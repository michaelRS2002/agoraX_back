import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from usual places. Prefer root .env, then src/.env as fallback.
dotenv.config();

// If keys still missing, try loading src/.env explicitly (some users keep .env inside src)
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  const srcEnv = path.resolve(__dirname, '../.env');
  const rootEnv = path.resolve(__dirname, '../../.env');
  // Try src/.env first
  try {
    dotenv.config({ path: srcEnv });
  } catch (e) {
    // ignore
  }
  // If still not found, try project root .env
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    try {
      dotenv.config({ path: rootEnv });
    } catch (e) {
      // ignore
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL or SUPABASE_KEY not set in environment. Please create a .env in project root with SUPABASE_URL and SUPABASE_KEY (or put them in src/.env).');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);