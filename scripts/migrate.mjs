import {createHash} from 'node:crypto';
import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import postgres from 'postgres';

const databaseUrl=process.env.DATABASE_URL;
if(process.env.SKIP_DB_MIGRATIONS==='1'){
  console.log('[migrate] Skipped because SKIP_DB_MIGRATIONS=1.');
  process.exit(0);
}
if(!databaseUrl){
  console.log('[migrate] DATABASE_URL is not set; no migrations were run.');
  process.exit(0);
}

const directory=join(process.cwd(),'db','migrations');
const files=(await readdir(directory)).filter(file=>/^\d+_[a-z0-9_-]+\.sql$/i.test(file)).sort();
const sql=postgres(databaseUrl,{max:1,idle_timeout:5,connect_timeout:10});
const connection=await sql.reserve();

try{
  await connection`select pg_advisory_lock(hashtext('shuvamstu_schema_migrations'))`;
  await connection`create table if not exists schema_migrations (filename text primary key,checksum text not null,applied_at timestamptz not null default now())`;
  for(const filename of files){
    const source=await readFile(join(directory,filename),'utf8');
    const checksum=createHash('sha256').update(source).digest('hex');
    const [existing]=await connection`select checksum from schema_migrations where filename=${filename}`;
    if(existing){
      if(existing.checksum!==checksum)throw new Error(`Previously applied migration ${filename} has been modified.`);
      console.log(`[migrate] Already applied: ${filename}`);
      continue;
    }

    // Older installations predate the migration ledger. If every original table
    // exists, record 001 as the baseline; later additive migrations bring it current.
    if(filename.startsWith('001_')){
      const [legacy]=await connection`select count(*)::int as count from unnest(array['providers','provider_services','availability_rules','availability_exceptions','bookings']) name where to_regclass('public.'||name) is not null`;
      if(legacy.count===5){
        await connection`insert into schema_migrations(filename,checksum) values(${filename},${checksum})`;
        console.log(`[migrate] Baseline recorded for existing schema: ${filename}`);
        continue;
      }
      if(legacy.count>0)throw new Error('Partial legacy scheduling schema detected. Restore or repair it before automatic migration.');
    }

    await connection.begin(async transaction=>{
      await transaction.unsafe(source);
      await transaction`insert into schema_migrations(filename,checksum) values(${filename},${checksum})`;
    });
    console.log(`[migrate] Applied: ${filename}`);
  }
  console.log('[migrate] Database schema is current.');
}finally{
  try{await connection`select pg_advisory_unlock(hashtext('shuvamstu_schema_migrations'))`;}catch{}
  connection.release();
  await sql.end({timeout:5});
}
