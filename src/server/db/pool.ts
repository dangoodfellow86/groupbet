import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

function cleanConnString(val?: string): string {
  if (!val) return '';
  return val.replace(/^["']|["']$/g, '').trim();
}

const connectionString =
  cleanConnString(process.env.DATABASE_URL) ||
  cleanConnString(process.env.DIRECT_URL) ||
  'postgresql://postgres:postgres@localhost:5432/groupbet';

// Create connection pool instance (singleton pattern across Next.js reloads in dev)
declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined;
}

const isProduction = process.env.NODE_ENV === 'production';
const isRemote =
  connectionString.includes('supabase.com') ||
  connectionString.includes('supabase.co') ||
  connectionString.includes('pooler.supabase.com') ||
  connectionString.includes('aws') ||
  process.env.DATABASE_SSL === 'true';

export const pool: Pool =
  global.__dbPool ||
  new Pool({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 10000,
  });

if (!isProduction) {
  global.__dbPool = pool;
}

/**
 * Execute a parameterized query using the pool.
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    return res;
  } catch (err) {
    console.error('Database query error:', { text, err });
    throw err;
  } finally {
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log('Executed query', { text, duration });
    }
  }
}

/**
 * Execute a series of operations in a transaction.
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
