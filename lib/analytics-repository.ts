import postgres from 'postgres';

const connection=process.env.DATABASE_URL;
const sql=connection?postgres(connection,{max:3,idle_timeout:20,connect_timeout:10}):null;
function db(){if(!sql)throw new Error('DATABASE_NOT_CONFIGURED');return sql}
function number(value:unknown){const parsed=Number(value);return Number.isFinite(parsed)?parsed:0}

export type AnalyticsData={
  overview:{bookings:number;bookings30:number;previousBookings30:number;completed:number;cancelled:number;grossPaise:number;platformRevenuePaise:number;collectedPaise:number;refundPaise:number;customers:number;repeatCustomers:number;enquiries:number;convertedEnquiries:number;completedConversions:number;activeProviders:number;publishedProviders:number};
  monthly:Array<{month:string;label:string;bookings:number;completed:number;grossPaise:number}>;
  statuses:Array<{status:string;count:number}>;
  cities:Array<{city:string;bookings:number;completed:number;grossPaise:number;activeProviders:number}>;
  services:Array<{service:string;bookings:number;completed:number;grossPaise:number}>;
  generatedAt:string;
};

export async function getAnalytics():Promise<AnalyticsData>{
  const database=db();
  const [overviewRows,monthlyRows,statusRows,cityRows,serviceRows]=await Promise.all([
    database`with customer_counts as (
      select coalesce(nullif(lower(customer_email),''),nullif(regexp_replace(customer_phone,'\\D','','g'),'')) customer_key,count(*) booking_count
      from bookings where realm='LIVE' group by 1
    ), booking_metrics as (
      select count(*) bookings,
        count(*) filter(where created_at>=now()-interval '30 days') bookings_30,
        count(*) filter(where created_at>=now()-interval '60 days' and created_at<now()-interval '30 days') previous_bookings_30,
        count(*) filter(where status='COMPLETED') completed,
        count(*) filter(where status in('CANCELLED','REJECTED','REFUNDED')) cancelled,
        coalesce(sum(gross_amount_paise) filter(where status not in('CANCELLED','REJECTED','REFUNDED')),0) gross_paise,
        coalesce(sum(platform_fee_paise) filter(where status='COMPLETED'),0) platform_revenue_paise,
        coalesce(sum(refund_amount_paise),0) refund_paise
      from bookings where realm='LIVE'
    ), payment_metrics as (
      select coalesce(sum(p.amount_paise) filter(where upper(p.status) in('PAID','CAPTURED','COMPLETED','SUCCESS')),0) collected_paise
      from payments p join bookings b on b.id=p.booking_id where b.realm='LIVE'
    ), enquiry_metrics as (
      select count(*) enquiries,
        count(*) filter(where e.status='CONVERTED' or e.booking_id is not null) converted_enquiries,
        count(*) filter(where b.status='COMPLETED') completed_conversions
      from enquiries e left join bookings b on b.id=e.booking_id and b.realm='LIVE'
    ), provider_metrics as (
      select count(*) filter(where active and realm='LIVE') active_providers,count(*) filter(where active and published and realm='LIVE') published_providers from providers
    )
    select b.*,p.*,e.*,r.*,
      (select count(*) from customer_counts where customer_key is not null) customers,
      (select count(*) from customer_counts where customer_key is not null and booking_count>1) repeat_customers
    from booking_metrics b cross join payment_metrics p cross join enquiry_metrics e cross join provider_metrics r`,
    database`with months as (
      select generate_series(date_trunc('month',now())-interval '11 months',date_trunc('month',now()),interval '1 month') as month_start
    ) select to_char(m.month_start,'YYYY-MM') as month_key,to_char(m.month_start,'Mon YY') label,
      count(b.id) bookings,count(b.id) filter(where b.status='COMPLETED') completed,
      coalesce(sum(b.gross_amount_paise) filter(where b.status not in('CANCELLED','REJECTED','REFUNDED')),0) gross_paise
    from months m left join bookings b on b.realm='LIVE' and b.created_at>=m.month_start and b.created_at<m.month_start+interval '1 month'
    group by m.month_start order by m.month_start`,
    database`select status,count(*) count from bookings where realm='LIVE' group by status order by count(*) desc,status`,
    database`select coalesce(c.name,nullif(p.city,''),'Unassigned') city,count(b.id) bookings,
      count(b.id) filter(where b.status='COMPLETED') completed,
      coalesce(sum(b.gross_amount_paise) filter(where b.status not in('CANCELLED','REJECTED','REFUNDED')),0) gross_paise,
      count(distinct p.id) filter(where p.active) active_providers
    from bookings b join providers p on p.id=b.provider_id left join cities c on c.id=b.city_id
    where b.realm='LIVE' group by 1 order by bookings desc,city limit 10`,
    database`select coalesce(pu.name,nullif(initcap(replace(b.service_slug,'-',' ')),''),'Unspecified') service,count(*) bookings,
      count(*) filter(where b.status='COMPLETED') completed,
      coalesce(sum(b.gross_amount_paise) filter(where b.status not in('CANCELLED','REJECTED','REFUNDED')),0) gross_paise
    from bookings b left join pujas pu on pu.id=b.puja_id where b.realm='LIVE'
    group by 1 order by bookings desc,service limit 8`
  ]);
  const row=overviewRows[0]||{};
  return {
    overview:{bookings:number(row.bookings),bookings30:number(row.bookings_30),previousBookings30:number(row.previous_bookings_30),completed:number(row.completed),cancelled:number(row.cancelled),grossPaise:number(row.gross_paise),platformRevenuePaise:number(row.platform_revenue_paise),collectedPaise:number(row.collected_paise),refundPaise:number(row.refund_paise),customers:number(row.customers),repeatCustomers:number(row.repeat_customers),enquiries:number(row.enquiries),convertedEnquiries:number(row.converted_enquiries),completedConversions:number(row.completed_conversions),activeProviders:number(row.active_providers),publishedProviders:number(row.published_providers)},
    monthly:monthlyRows.map(row=>({month:String(row.month_key),label:String(row.label),bookings:number(row.bookings),completed:number(row.completed),grossPaise:number(row.gross_paise)})),
    statuses:statusRows.map(row=>({status:String(row.status),count:number(row.count)})),
    cities:cityRows.map(row=>({city:String(row.city),bookings:number(row.bookings),completed:number(row.completed),grossPaise:number(row.gross_paise),activeProviders:number(row.active_providers)})),
    services:serviceRows.map(row=>({service:String(row.service),bookings:number(row.bookings),completed:number(row.completed),grossPaise:number(row.gross_paise)})),
    generatedAt:new Date().toISOString()
  };
}
