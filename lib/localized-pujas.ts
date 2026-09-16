import 'server-only';
import postgres from 'postgres';
import type {Locale} from './i18n';
import type {Puja} from '../app/data/marketplace';

type TranslationRow={slug:string;name:string;short:string;description:string};
const sql=process.env.DATABASE_URL?postgres(process.env.DATABASE_URL,{max:2,idle_timeout:20,connect_timeout:5}):null;

export async function localizedPujas(pujas:Puja[],locale:Locale):Promise<Puja[]>{
 if(locale==='en-IN'||!sql)return pujas;
 try{
  const rows=await sql<TranslationRow[]>`select p.slug,tr.name,tr.short_description as short,tr.full_description as description from puja_translations tr join pujas p on p.id=tr.puja_id where tr.locale=${locale} and tr.status='COMPLETED' and p.realm='LIVE' and p.active and p.deleted_at is null`;
  const bySlug=new Map(rows.map(row=>[row.slug,row]));
  return pujas.map(puja=>{const translated=bySlug.get(puja.slug);return translated?{...puja,name:translated.name||puja.name,short:translated.short||puja.short,description:translated.description||puja.description}:puja});
 }catch{return pujas}
}
