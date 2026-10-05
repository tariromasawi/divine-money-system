import {readFile} from "node:fs/promises";
import type {Pool} from "pg";
export const commerceMigrations=["001_tranche1_safety","002_tranche1_request_limits","003_tranche1_card_schema",
  "004_tranche1_domain_controls","005_autonomous_commerce","006_commerce_operations","007_launch_lifecycle","008_durable_relay","009_adjustment_ordering"];
export async function migrateCommerce(pool:Pool) {
  const client=await pool.connect();
  try{
    await client.query("SELECT pg_advisory_lock(hashtext('commerce-schema-migrations'))");
    await client.query("CREATE TABLE IF NOT EXISTS commerce_schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    for(const name of commerceMigrations){
      if((await client.query("SELECT name FROM commerce_schema_migrations WHERE name=$1",[name])).rowCount)continue;
      await client.query(await readFile(`migrations/${name}.sql`,"utf8"));
      await client.query("INSERT INTO commerce_schema_migrations(name) VALUES($1) ON CONFLICT DO NOTHING",[name]);
    }
  }finally{
    await client.query("SELECT pg_advisory_unlock(hashtext('commerce-schema-migrations'))");
    client.release();
  }
}
