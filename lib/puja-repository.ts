import postgres from 'postgres';
import {pujaSourceHash,translatePuja,translationLocales,type TranslatablePuja,type TranslationLocale} from './sarvam-translation';
export type AdminPuja={id:string;slug:string;name:string;shortDescription:string;fullDescription:string;durationMinutes:number|null;startingPriceRupees:number|null;samagriRequired:boolean;samagriAvailable:boolean;onlineAvailable:boolean;templeAvailable:boolean;notes:string;active:boolean;updatedAt:string;translationStatus:'PENDING'|'COMPLETED'|'FAILED'};
export type PujaInput=Omit<AdminPuja,'id'|'updatedAt'|'translationStatus'>;
const url=process.env.DATABASE_URL;const sql=url?postgres(url,{max:3,idle_timeout:20,connect_timeout:10}):null;
export async function listAdminPujas():Promise<AdminPuja[]>{if(!sql)throw new Error('DATABASE_UNAVAILABLE');return sql<AdminPuja[]>`select p.id,p.slug,p.name,p.short_description as "shortDescription",p.full_description as "fullDescription",p.duration_minutes as "durationMinutes",case when min(pkg.service_amount_paise) is null then null else min(pkg.service_amount_paise)::numeric/100 end::float8 as "startingPriceRupees",p.samagri_required as "samagriRequired",p.samagri_available as "samagriAvailable",p.online_available as "onlineAvailable",p.temple_available as "templeAvailable",coalesce(p.notes,'') as notes,p.active,p.updated_at::text as "updatedAt",case when count(distinct tr.locale)=3 and bool_and(tr.status='COMPLETED') then 'COMPLETED' when bool_or(tr.status='FAILED') then 'FAILED' else 'PENDING' end as "translationStatus" from pujas p left join puja_packages pkg on pkg.puja_id=p.id and pkg.active left join puja_translations tr on tr.puja_id=p.id where p.realm='LIVE' and p.deleted_at is null group by p.id order by p.active desc,p.name`}

async function storeTranslation(id:string,locale:TranslationLocale,value:TranslatablePuja){
 if(!sql)throw new Error('DATABASE_UNAVAILABLE');
 const sourceHash=pujaSourceHash(value);
 const[current]=await sql<{sourceHash:string;status:string}[]>`select source_hash as "sourceHash",status from puja_translations where puja_id=${id} and locale=${locale}`;
 if(current?.sourceHash===sourceHash&&current.status==='COMPLETED')return;
 await sql`insert into puja_translations(puja_id,locale,source_hash,status) values(${id},${locale},${sourceHash},'PENDING') on conflict(puja_id,locale) do update set source_hash=excluded.source_hash,status='PENDING',error_message=null,updated_at=now()`;
 try{
  const translated=await translatePuja(value,locale);
  await sql`update puja_translations set name=${translated.name},short_description=${translated.shortDescription},full_description=${translated.fullDescription},status='COMPLETED',error_message=null,translated_at=now(),updated_at=now() where puja_id=${id} and locale=${locale} and source_hash=${sourceHash}`;
 }catch(error){
  const message=error instanceof Error?error.message:'Translation failed';
  await sql`update puja_translations set status='FAILED',error_message=${message.slice(0,500)},updated_at=now() where puja_id=${id} and locale=${locale} and source_hash=${sourceHash}`;
 }
}

async function syncTranslations(id:string,v:PujaInput){
 const value:TranslatablePuja={name:v.name,shortDescription:v.shortDescription,fullDescription:v.fullDescription};
 await Promise.all(translationLocales.map(locale=>storeTranslation(id,locale,value)));
}
async function savePackage(tx:postgres.TransactionSql,id:string,v:PujaInput){await tx`update puja_packages set active=false,updated_at=now() where puja_id=${id} and name='Standard'`;if(v.startingPriceRupees!==null){const amount=Math.round(v.startingPriceRupees*100);await tx`insert into puja_packages(puja_id,name,description,duration_minutes,service_amount_paise,pujari_amount_paise,platform_fee_paise,tax_paise,active) values(${id},'Standard','Default package managed from the puja catalogue',${v.durationMinutes||60},${amount},${amount},0,0,true)`}}
export async function createPuja(v:PujaInput){if(!sql)throw new Error('DATABASE_UNAVAILABLE');const id=await sql.begin(async tx=>{const[row]=await tx<{id:string}[]>`insert into pujas(realm,slug,name,short_description,full_description,duration_minutes,samagri_required,samagri_available,online_available,temple_available,notes,active) values('LIVE',${v.slug},${v.name},${v.shortDescription},${v.fullDescription},${v.durationMinutes},${v.samagriRequired},${v.samagriAvailable},${v.onlineAvailable},${v.templeAvailable},${v.notes},${v.active}) returning id`;await savePackage(tx,row.id,v);await tx`insert into audit_logs(action,entity_type,entity_id,after_data) values('PUJA_CREATED','Puja',${row.id},${tx.json(v)})`;return row.id});await syncTranslations(id,v);return (await listAdminPujas()).find(p=>p.id===id)!}
export async function updatePuja(id:string,v:PujaInput){if(!sql)throw new Error('DATABASE_UNAVAILABLE');const found=await sql.begin(async tx=>{const[row]=await tx<{id:string}[]>`update pujas set slug=${v.slug},name=${v.name},short_description=${v.shortDescription},full_description=${v.fullDescription},duration_minutes=${v.durationMinutes},samagri_required=${v.samagriRequired},samagri_available=${v.samagriAvailable},online_available=${v.onlineAvailable},temple_available=${v.templeAvailable},notes=${v.notes},active=${v.active},updated_at=now() where id=${id} and realm='LIVE' and deleted_at is null returning id`;if(!row)return false;await savePackage(tx,id,v);await tx`insert into audit_logs(action,entity_type,entity_id,after_data) values('PUJA_UPDATED','Puja',${id},${tx.json(v)})`;return true});if(!found)return null;await syncTranslations(id,v);return (await listAdminPujas()).find(p=>p.id===id)||null}
