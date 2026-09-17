import { syncFootballData } from '../services/football-sync';

async function main() {
  console.log('--- Ingesting API-Football data into Supabase ---');
  const result = await syncFootballData();
  console.log('✓ Ingestion complete:', result);
  process.exit(0);
}

main().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
