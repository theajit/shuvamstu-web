import type {Metadata} from 'next';
import Link from 'next/link';
import {Shell} from '../components';
import {formatMoney,pujas} from '../data/marketplace';
import {dictionary,interpolate} from '../../lib/i18n';
import {getLocale} from '../../lib/i18n-server';
import {localizedPujas} from '../../lib/localized-pujas';
export const metadata:Metadata={title:'Book a Puja',description:'Browse puja services with verified Pujaris, transparent pricing and optional samagri in Odisha.'};
export default async function PujasPage(){const locale=await getLocale(),t=dictionary(locale),items=await localizedPujas(pujas,locale);return <Shell><main><section className="catalogue-hero"><div className="wrap"><span className="kicker">{t.catalogue}</span><h1>{t.findPuja}</h1><p className="lead">{interpolate(t.browse,{count:items.length})}</p><div className="filter-bar"><span className="filter-chip">{interpolate(t.allPujas,{count:items.length})}</span><span className="filter-chip">{t.packages}</span><span className="filter-chip">{t.online}</span></div></div></section><section className="section"><div className="wrap catalogue-grid">{items.map(puja=><Link className="catalogue-card" href={`/pujas/${puja.slug}`} key={puja.slug}><span className="service-icon">ॐ</span><h2>{puja.name}</h2><p>{puja.short}</p><div className="catalogue-meta">{puja.duration&&<span>{puja.duration}</span>}{puja.modes.includes('ONLINE')&&<span>{t.online}</span>}{puja.samagri!==null&&<span>{t.samagri}</span>}</div><strong className="catalogue-price">{puja.from===null?t.priceLater:`${t.from} ${formatMoney(puja.from)}`}</strong><span className="card-link">{t.details} →</span></Link>)}</div></section></main></Shell>}
