import postgres from 'postgres';
import type {ProviderType} from './scheduling';

export type PublicPractitioner={id:string;slug:string;name:string;type:ProviderType;bio:string;experienceYears:number|null;city:string;languages:string[];specialties:string[];qualifications:string;photoUrl:string};
const connection=process.env.DATABASE_URL;
const sql=connection?postgres(connection,{max:3,idle_timeout:20,connect_timeout:10}):null;
const selectFields=sql?.unsafe('id,slug,name,type,bio,experience_years as "experienceYears",city,languages,specialties,qualifications,photo_url as "photoUrl"');

export async function listPractitioners(type:ProviderType):Promise<PublicPractitioner[]>{
  if(!sql||!selectFields)return [];
  try{return await sql<PublicPractitioner[]>`select ${selectFields} from providers where active and published and slug is not null and type=${type} order by experience_years desc nulls last,name`;}catch{return []}
}

export async function getPractitioner(type:ProviderType,slug:string):Promise<PublicPractitioner|null>{
  if(!sql||!selectFields)return null;
  try{const [profile]=await sql<PublicPractitioner[]>`select ${selectFields} from providers where active and published and type=${type} and slug=${slug} limit 1`;return profile||null}catch{return null}
}

export async function listPractitionerUrls():Promise<Array<{slug:string;type:ProviderType;updatedAt:string}>>{
  if(!sql)return [];
  try{return await sql`select slug,type,updated_at::text as "updatedAt" from providers where active and published and slug is not null`}catch{return []}
}
