'use client';
import {useEffect,useState} from 'react';
import {isLocale,LOCALE_COOKIE,type Locale} from '../lib/i18n';
const options=[['en-IN','EN'],['hi-IN','हिंदी'],['od-IN','ଓଡ଼ିଆ']] as const;
function cookieLocale():Locale{const value=document.cookie.split('; ').find(item=>item.startsWith(`${LOCALE_COOKIE}=`))?.split('=')[1];return isLocale(value)?value:'en-IN'}
export function useLocale(){const[locale,setLocale]=useState<Locale>('en-IN');useEffect(()=>setLocale(cookieLocale()),[]);return[locale,setLocale] as const}
export function LanguageToggle({locale,label,onChange}:{locale:Locale;label:string;onChange:(locale:Locale)=>void}){function select(value:Locale){if(value===locale)return;document.cookie=`${LOCALE_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;onChange(value);location.reload()}return <div className="language-toggle" role="group" aria-label={label}>{options.map(([value,text])=><button key={value} onClick={()=>select(value)} type="button" aria-pressed={locale===value}>{text}</button>)}</div>}
