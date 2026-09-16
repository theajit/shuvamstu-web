import 'server-only';
import {createHash} from 'node:crypto';
import {SarvamAIClient} from 'sarvamai';

export const translationLocales=['hi-IN','od-IN'] as const;
export type TranslationLocale=(typeof translationLocales)[number];
export type TranslatablePuja={name:string;shortDescription:string;fullDescription:string};
export type TranslatedPuja={name:string;shortDescription:string;fullDescription:string};

let client:SarvamAIClient|undefined;

function sarvamClient(){
  const apiSubscriptionKey=process.env.SARVAM_API_KEY;
  if(!apiSubscriptionKey)throw new Error('SARVAM_API_KEY is not configured');
  return client??=new SarvamAIClient({apiSubscriptionKey});
}

export function pujaSourceHash(value:TranslatablePuja){
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function chunks(input:string,maxLength=1800){
  const result:string[]=[];
  let remaining=input.trim();
  while(remaining.length>maxLength){
    const candidate=remaining.slice(0,maxLength);
    const boundary=Math.max(candidate.lastIndexOf('\n'),candidate.lastIndexOf('. '),candidate.lastIndexOf(' '));
    const end=boundary>maxLength/2?boundary+(candidate[boundary]==='.'?1:0):maxLength;
    result.push(remaining.slice(0,end).trim());
    remaining=remaining.slice(end).trim();
  }
  if(remaining)result.push(remaining);
  return result;
}

async function translateText(input:string,target_language_code:TranslationLocale){
  if(!input.trim())return '';
  const translated:string[]=[];
  for(const part of chunks(input)){
    const response=await sarvamClient().text.translate({input:part,source_language_code:'en-IN',target_language_code,model:'sarvam-translate:v1',mode:'formal'});
    translated.push(response.translated_text);
  }
  return translated.join(' ');
}

export async function translatePuja(value:TranslatablePuja,locale:TranslationLocale):Promise<TranslatedPuja>{
  const [name,shortDescription,fullDescription]=await Promise.all([
    translateText(value.name,locale),translateText(value.shortDescription,locale),translateText(value.fullDescription,locale),
  ]);
  return{name,shortDescription,fullDescription};
}
