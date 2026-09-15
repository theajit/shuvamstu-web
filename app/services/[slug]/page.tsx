import {notFound} from 'next/navigation';
import Link from 'next/link';
import {Shell} from '../../components';
import {serviceBySlug,services} from '../../data/services';
import {schedulingServiceBySlug} from '../../../lib/scheduling';

const bookingLabels: Record<string,string> = {'astrology':'Book consultation','online-puja':'Request Online Puja','marriage':'Request a Pandit','bratopanayan':'Request a Pandit','puja-rituals':'Plan this Puja'};

export function generateStaticParams(){return services.map(s=>({slug:s.slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const s=serviceBySlug(slug);return s?{title:s.title,description:s.description}:{};}

export default async function ServicePage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  const service=serviceBySlug(slug);
  if(!service) notFound();
  const scheduling=schedulingServiceBySlug(slug);
  return <Shell><main><section className="page-hero" style={{backgroundImage:`linear-gradient(90deg,rgba(43,20,13,.88),rgba(43,20,13,.32)),url('${service.image}')`}}><div className="wrap"><span className="kicker light">{service.eyebrow}</span><h1>{service.title}</h1><p>{service.description}</p>{scheduling?<><Link className="btn btn-light" href={`/book?service=${service.slug}`}>{bookingLabels[slug]}</Link> <Link className="btn" href={`/enquiry?service=${service.slug}`}>General enquiry</Link></>:<Link className="btn btn-light" href={`/enquiry?service=${service.slug}`}>Enquire about {service.title}</Link>}</div></section><section className="section"><div className="wrap detail-grid"><div><span className="kicker">The experience</span><h2>Tradition, with clarity.</h2><p className="lead">{service.intro}</p></div><aside>{service.highlights.map(item=><div className="highlight" key={item}>✓ {item}</div>)}</aside></div></section><section className="soft section"><div className="wrap split"><div><span className="kicker">Planning this occasion?</span><h2>Start with the details you know.</h2></div><div><p>You do not need to know every ritual requirement before enquiring. Share the occasion and context first; the next steps can follow from there.</p><Link className="btn" href={`/enquiry?service=${service.slug}`}>Send an enquiry</Link></div></div></section></main></Shell>;
}
