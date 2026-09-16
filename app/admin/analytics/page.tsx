import Link from 'next/link';
import type {CSSProperties} from 'react';
import {getAnalytics} from '../../../lib/analytics-repository';

export const dynamic='force-dynamic';

const money=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0});
const integer=new Intl.NumberFormat('en-IN');
function formatMoney(paise:number){return money.format(paise/100)}
function percent(part:number,total:number){return total?`${(part/total*100).toFixed(1)}%`:'0%'}
function growth(current:number,previous:number){if(!previous)return current?'New':'No change';const value=(current-previous)/previous*100;return `${value>=0?'+':''}${value.toFixed(1)}% vs previous 30 days`}
function label(status:string){return status.toLowerCase().replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase())}

export default async function Analytics(){
  const data=await getAnalytics();
  const {overview}=data;
  const maxMonth=Math.max(1,...data.monthly.map(item=>item.bookings));
  const conversion=percent(overview.convertedEnquiries,overview.enquiries);
  const completion=percent(overview.completed,overview.bookings);
  const repeat=percent(overview.repeatCustomers,overview.customers);
  return <div className="analytics-shell">
    <header className="analytics-topbar"><div><div><span className="analytics-live-dot"/>Live database</div><strong>Shuvamstu analytics</strong><time dateTime={data.generatedAt}>Updated {new Date(data.generatedAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'})}</time></div></header>
    <div className="analytics-layout">
      <aside className="analytics-sidebar"><p>Admin workspace</p><nav aria-label="Analytics sections"><a href="#overview">Overview</a><a href="#bookings">Bookings</a><a href="#funnel">Enquiries</a><a href="#cities">Cities</a><a href="#services">Services</a></nav><Link href="/admin">← Operations dashboard</Link></aside>
      <main className="analytics-main">
        <section className="analytics-heading" id="overview"><div><span>Marketplace performance</span><h1>Business analytics</h1><p>Live operational data from production records. Demo and illustrative records are excluded.</p></div><div className="analytics-range">Last 12 months + all-time totals</div></section>
        <section className="analytics-kpis" aria-label="Key metrics">
          <Metric title="Gross booking value" value={formatMoney(overview.grossPaise)} note="Non-cancelled live bookings"/>
          <Metric title="Collected payments" value={formatMoney(overview.collectedPaise)} note={`${formatMoney(overview.refundPaise)} recorded refunds`}/>
          <Metric title="Platform revenue" value={formatMoney(overview.platformRevenuePaise)} note="Fees on completed bookings"/>
          <Metric title="Bookings · 30 days" value={integer.format(overview.bookings30)} note={growth(overview.bookings30,overview.previousBookings30)}/>
          <Metric title="Completion rate" value={completion} note={`${integer.format(overview.completed)} of ${integer.format(overview.bookings)} bookings`}/>
          <Metric title="Enquiry conversion" value={conversion} note={`${integer.format(overview.convertedEnquiries)} of ${integer.format(overview.enquiries)} enquiries`}/>
          <Metric title="Repeat customers" value={repeat} note={`${integer.format(overview.repeatCustomers)} returning customers`}/>
          <Metric title="Active Pujaris" value={integer.format(overview.activeProviders)} note={`${integer.format(overview.publishedProviders)} published profiles`}/>
        </section>

        <div className="analytics-grid" id="bookings">
          <section className="analytics-card analytics-chart"><header><div><h2>Bookings over time</h2><p>Created bookings by month</p></div><b>{integer.format(overview.bookings)} total</b></header>
            <div className="analytics-bars" role="img" aria-label="Monthly bookings for the last twelve months">{data.monthly.map(item=><div key={item.month} title={`${item.label}: ${item.bookings} bookings`}><span className="bar-value">{item.bookings||''}</span><i style={{'--height':`${Math.max(item.bookings?8:2,item.bookings/maxMonth*100)}%`} as CSSProperties}/><small>{item.label.split(' ')[0]}</small></div>)}</div>
          </section>
          <section className="analytics-card" id="funnel"><header><div><h2>Enquiry funnel</h2><p>All-time customer acquisition</p></div></header><Progress label="Enquiries received" value={overview.enquiries} total={overview.enquiries}/><Progress label="Converted to bookings" value={overview.convertedEnquiries} total={overview.enquiries}/><Progress label="Converted bookings completed" value={overview.completedConversions} total={overview.enquiries}/><div className="analytics-callout"><span>Conversion rate</span><strong>{conversion}</strong></div></section>
        </div>

        <div className="analytics-grid analytics-grid-equal">
          <section className="analytics-card"><header><div><h2>Booking status</h2><p>Current lifecycle distribution</p></div></header>{data.statuses.length?<div className="analytics-status-list">{data.statuses.map(item=><div key={item.status}><span><i className={`status-dot status-${item.status.toLowerCase()}`}/>{label(item.status)}</span><b>{integer.format(item.count)}</b><small>{percent(item.count,overview.bookings)}</small></div>)}</div>:<Empty text="No live bookings yet."/>}</section>
          <section className="analytics-card"><header><div><h2>Customer health</h2><p>Unique customers across live bookings</p></div></header><div className="analytics-big-number"><strong>{integer.format(overview.customers)}</strong><span>unique customers</span></div><dl className="analytics-definition"><div><dt>Returning customers</dt><dd>{integer.format(overview.repeatCustomers)}</dd></div><div><dt>Cancelled / rejected</dt><dd>{integer.format(overview.cancelled)}</dd></div><div><dt>Completion rate</dt><dd>{completion}</dd></div></dl></section>
        </div>

        <section className="analytics-card analytics-table-card" id="cities"><header><div><h2>City operations</h2><p>Bookings are attributed from their booking city or Pujari profile.</p></div></header>{data.cities.length?<div className="analytics-table-wrap"><table><thead><tr><th>City</th><th>Bookings</th><th>Completed</th><th>Completion</th><th>GBV</th><th>Active Pujaris</th></tr></thead><tbody>{data.cities.map(item=><tr key={item.city}><td><b>{item.city}</b></td><td>{integer.format(item.bookings)}</td><td>{integer.format(item.completed)}</td><td>{percent(item.completed,item.bookings)}</td><td>{formatMoney(item.grossPaise)}</td><td>{integer.format(item.activeProviders)}</td></tr>)}</tbody></table></div>:<Empty text="City analytics will appear after the first live booking."/>}</section>

        <section className="analytics-card analytics-table-card" id="services"><header><div><h2>Top services</h2><p>Actual booking demand and value by puja or service.</p></div></header>{data.services.length?<div className="analytics-table-wrap"><table><thead><tr><th>Service</th><th>Bookings</th><th>Completed</th><th>Completion</th><th>GBV</th></tr></thead><tbody>{data.services.map(item=><tr key={item.service}><td><b>{item.service}</b></td><td>{integer.format(item.bookings)}</td><td>{integer.format(item.completed)}</td><td>{percent(item.completed,item.bookings)}</td><td>{formatMoney(item.grossPaise)}</td></tr>)}</tbody></table></div>:<Empty text="Service analytics will appear after the first live booking."/>}</section>
        <p className="analytics-footnote">Financial metrics use amounts stored on booking, payment, and refund records. A zero means no amount has been recorded; it is not an estimate.</p>
      </main>
    </div>
  </div>
}

function Metric({title,value,note}:{title:string;value:string;note:string}){return <article><span>{title}</span><strong>{value}</strong><small>{note}</small></article>}
function Progress({label:progressLabel,value,total}:{label:string;value:number;total:number}){const width=total?Math.min(100,value/total*100):0;return <div className="analytics-progress"><div><span>{progressLabel}</span><b>{integer.format(value)}</b></div><i><span style={{width:`${width}%`}}/></i></div>}
function Empty({text}:{text:string}){return <div className="analytics-empty"><b>No data yet</b><span>{text}</span></div>}
