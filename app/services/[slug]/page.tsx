import {notFound} from 'next/navigation';
import Link from 'next/link';
import {Shell} from '../../components';
import {serviceBySlug,services} from '../../data/services';
import {pujaCategories} from '../../data/puja-categories';
import {schedulingServiceBySlug} from '../../../lib/scheduling';

const bookingLabels:Record<string,string>={astrology:'Book consultation',numerology:'Request consultation','online-puja':'Request Online Puja',marriage:'Request a Pandit',bratopanayan:'Request a Pandit','puja-rituals':'Plan this Puja'};
export function generateStaticParams(){return services.map(service=>({slug:service.slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params,service=serviceBySlug(slug);return service?{title:service.title,description:service.description}:{};}

export default async function ServicePage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params,service=serviceBySlug(slug);if(!service)notFound();const scheduling=schedulingServiceBySlug(slug);
  return <Shell><main>
    <section className="page-hero" style={{backgroundImage:`linear-gradient(90deg,rgba(43,20,13,.88),rgba(43,20,13,.32)),url('${service.image}')`}}><div className="wrap"><span className="kicker light">{service.eyebrow}</span><h1>{service.title}</h1><p>{service.description}</p>{scheduling?<><Link className="btn btn-light" href={`/book?service=${service.slug}`}>{bookingLabels[slug]}</Link> <Link className="btn" href={`/enquiry?service=${service.slug}`}>General enquiry</Link></>:<Link className="btn btn-light" href={`/enquiry?service=${service.slug}`}>Enquire about {service.title}</Link>}</div></section>
    <section className="section"><div className="wrap detail-grid"><div><span className="kicker">The experience</span><h2>Tradition, with clarity.</h2><p className="lead">{service.intro}</p></div><aside>{service.highlights.map(item=><div className="highlight" key={item}>✓ {item}</div>)}</aside></div></section>
    {slug==='special-prasad'&&<section className="prasad-partner section"><div className="wrap prasad-partner-grid"><div className="partner-logo"><img src="/odia-nanna-logo.png" alt="Odia Nanna"/></div><div><span className="kicker">Special Prasad Partner</span><h2>In partnership with Odia Nanna</h2><p className="lead">Odia Nanna is Shuvamstu’s partner for Special Prasad. Learn more about their pure-vegetarian Odia food and festival offerings on their official website.</p><div className="actions"><a className="btn" href="https://odiananna.in" target="_blank" rel="noopener noreferrer">Visit Odia Nanna ↗</a><Link className="text-link" href="/enquiry?service=special-prasad">Enquire about Special Prasad</Link></div></div></div></section>}
    {slug==='puja-rituals'&&<section className="puja-directory section"><div className="wrap"><h2>Puja Categories</h2><div className="puja-list">{pujaCategories.map(category=><Link key={category} href={`/enquiry?service=puja-rituals&puja=${encodeURIComponent(category)}`}><span aria-hidden="true">›</span>{category}</Link>)}</div><Link className="btn" href="/enquiry?service=puja-rituals">Enquire here</Link></div></section>}
    <section className="soft section"><div className="wrap split"><div><span className="kicker">Planning this occasion?</span><h2>Start with the details you know.</h2></div><div><p>You do not need to know every ritual requirement before enquiring. Share the occasion and context first; the next steps can follow from there.</p><Link className="btn" href={`/enquiry?service=${service.slug}`}>Send an enquiry</Link></div></div></section>
  </main></Shell>;
}
