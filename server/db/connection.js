import process from 'node:process';
import { Pool } from '@neondatabase/serverless';

let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Bounded so a burst of concurrent players queues inside the pool
      // instead of opening an unbounded number of Neon connections.
      max: Number(process.env.DATABASE_POOL_MAX || 10),
      // Neon closes idle connections on its own; recycling ours first avoids
      // handing a half-dead client to a request.
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

    // A client dropped while idle emits 'error' on the pool. Without a
    // listener Node treats it as unhandled and terminates the process, which
    // would take the whole API down mid-event. The pool discards the bad
    // client and later queries transparently get a fresh one.
    pool.on('error', (error) => {
      console.error('[db] idle client error (pool will recover):', error.message);
    });
  }
  return pool;
}
