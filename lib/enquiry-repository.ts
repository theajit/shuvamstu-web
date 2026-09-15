import {randomBytes} from 'node:crypto';
import postgres from 'postgres';

export type EnquiryInput={name:string;email:string;service:string;pujaCategory:string;preferredDate:string;message:string};
const databaseUrl=process.env.DATABASE_URL;
const sql=databaseUrl?postgres(databaseUrl,{max:3,idle_timeout:20,connect_timeout:10}):null;
export const enquiryPersistenceConfigured=Boolean(sql);

export async function storeEnquiry(input:EnquiryInput){
  if(!sql)throw new Error('DATABASE_NOT_CONFIGURED');
  for(let attempt=0;attempt<5;attempt+=1){
    const reference=`ENQ-${new Date().getUTCFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
    try{const [stored]=await sql`insert into enquiries(reference,name,email,service_slug,puja_category,preferred_date,message) values(${reference},${input.name},${input.email},${input.service||null},${input.pujaCategory||null},${input.preferredDate||null},${input.message||null}) returning id::text,reference,status,created_at::text as "createdAt"`;return stored}catch(error){if(!(error instanceof postgres.PostgresError)||error.code!=='23505'||attempt===4)throw error}
  }
  throw new Error('REFERENCE_GENERATION_FAILED');
}
