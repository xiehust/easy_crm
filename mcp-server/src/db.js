import pg from 'pg';
import { getDatabaseConfig } from './config.js';

const { Pool } = pg;
let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool(getDatabaseConfig());
  }
  return pool;
}

export function query(text, params = []) {
  return getPool().query(text, params);
}
