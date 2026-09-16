import 'server-only';
import {createHash} from 'node:crypto';
import postgres from 'postgres';
import {translateText,type TranslationLocale} from './sarvam-translation';

const sql=process.env.DATABASE_URL?postgres(process.env.DATABASE_URL,{max:3,idle_timeout:20,connect_timeout:5}):null;
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');

export async function translateUiTexts(texts:string[],locale:TranslationLocale){
 if(!sql)throw new Error('DATABASE_UNAVAILABLE');
 const unique=[...new Set(texts.map(text=>text.trim()).filter(Boolean))];
 const hashes=unique.map(hash);
 const cached=hashes.length?await sql<{sourceHash:string;translatedText:string}[]>`select source_hash as "sourceHash",translated_text as "translatedText" from ui_translations where locale=${locale} and source_hash in ${sql(hashes)}`:[];
 const byHash=new Map(cached.map(row=>[row.sourceHash,row.translatedText]));
 for(const source of unique){
  const sourceHash=hash(source);
  if(byHash.has(sourceHash))continue;
  try{
   const translatedText=await translateText(source,locale);
   await sql`insert into ui_translations(source_hash,locale,source_text,translated_text) values(${sourceHash},${locale},${source},${translatedText}) on conflict(source_hash,locale) do update set source_text=excluded.source_text,translated_text=excluded.translated_text,updated_at=now()`;
   byHash.set(sourceHash,translatedText);
  }catch(error){
   console.error('[ui-translation] Sarvam rejected a text item:',error instanceof Error?error.message:error);
   byHash.set(sourceHash,source);
  }
 }
 return Object.fromEntries(unique.map(source=>[source,byHash.get(hash(source))??source]));
}
