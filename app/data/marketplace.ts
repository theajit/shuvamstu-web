import {pujaCategories} from './puja-categories';

export type Puja={slug:string;name:string;short:string;description:string;duration:string|null;from:number|null;samagri:number|null;modes:string[];popular?:boolean};
export type MarketplacePujari={slug:string;name:string;city:string;languages:string[];experience:number;rating:number;reviews:number;completed:number;specializations:string[];pujas:string[];online:boolean;verified:boolean;available:string};
export const formatMoney=(value:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value);
export const pujaSlug=(name:string)=>name.toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
export const cities=['Dhenkanal','Bhubaneswar','Cuttack'] as const;

const configured:Record<string,Partial<Puja>>={
 'Ganapati Puja':{short:'Puja for auspicious beginnings and important occasions.',description:'Arrange Ganapati Puja with a verified Pujari and clear preparation support.',duration:'1–2 hours',from:1800,samagri:1100,modes:['IN_PERSON','ONLINE','TEMPLE'],popular:true},
 'Satyanarayana Puja':{short:'A thoughtfully coordinated puja for home and family.',description:'Book a Satyanarayana Puja with clear inclusions, timing and preparation support.',duration:'2 hours',from:2100,samagri:1400,modes:['IN_PERSON','ONLINE'],popular:true},
 'Gruha Pratistha':{short:'A complete house ceremony with clear preparation guidance.',description:'Plan Gruha Pratistha with a verified Pujari, preparation guidance and optional samagri. Ritual details are confirmed with your selected Pujari.',duration:'2–3 hours',from:3100,samagri:1800,modes:['IN_PERSON','ONLINE'],popular:true},
 'Rudrabhisek':{short:'Experienced Pujaris for Rudrabhisek at home or temple.',description:'Choose a suitable Pujari and package for Rudrabhisek with transparent pricing.',duration:'2–3 hours',from:2500,samagri:1600,modes:['IN_PERSON','TEMPLE'],popular:true},
 'Laxmi Puja':{short:'Book Laxmi Puja with preparation and samagri support.',description:'Arrange Laxmi Puja for your family or workplace with a verified Pujari.',duration:'1–2 hours',from:2100,samagri:1300,modes:['IN_PERSON','ONLINE']},
 'Sradha':{short:'Respectful coordination for ancestral rituals.',description:'Requirements differ by family tradition and location. Details are confirmed privately with the selected Pujari.',duration:'2–3 hours',from:2600,samagri:1500,modes:['IN_PERSON','TEMPLE']},
};

export const pujas:Puja[]=pujaCategories.map(name=>({
 slug:pujaSlug(name),name,
 short:'Connect with a suitable Pujari and confirm the service requirements.',
 description:`Tell Shuvamstu about your ${name} requirements, preferred date, location and language. Scope, duration, samagri and price are confirmed before booking.`,
 duration:null,from:null,samagri:null,modes:['IN_PERSON'],
 ...configured[name],
}));

export const marketplacePujaris:MarketplacePujari[]=[
 {slug:'acharya-ananta-dash',name:'Acharya Ananta Dash',city:'Bhubaneswar',languages:['Odia','Hindi','Sanskrit'],experience:18,rating:4.9,reviews:84,completed:146,specializations:['Gruha Pratistha','Satyanarayana Puja'],pujas:['gruha-pratistha','satyanarayana-puja','ganapati-puja'],online:true,verified:true,available:'Available tomorrow'},
 {slug:'pandit-biswajit-mishra',name:'Pandit Biswajit Mishra',city:'Dhenkanal',languages:['Odia','Hindi'],experience:14,rating:4.8,reviews:61,completed:109,specializations:['Rudrabhisek','Family rituals'],pujas:['rudrabhisek','satyanarayana-puja','laxmi-puja','sradha'],online:false,verified:true,available:'Available today'},
 {slug:'acharya-chinmaya-rath',name:'Acharya Chinmaya Rath',city:'Cuttack',languages:['Odia','English','Hindi'],experience:11,rating:4.8,reviews:47,completed:92,specializations:['Traditional ceremonies','Gruha Pratistha'],pujas:['gruha-pratistha','nabaratri','durga-puja','saraswati-puja'],online:true,verified:true,available:'Next slot Fri'},
 {slug:'pandit-debasish-panda',name:'Pandit Debasish Panda',city:'Bhubaneswar',languages:['Odia','Hindi'],experience:9,rating:4.7,reviews:39,completed:76,specializations:['Ganapati Puja','Nabagraha Santi'],pujas:['ganapati-puja','nabagraha-santi','laxmi-puja'],online:true,verified:true,available:'Available tomorrow'},
 {slug:'acharya-eswar-tripathy',name:'Acharya Eswar Tripathy',city:'Dhenkanal',languages:['Odia','Sanskrit'],experience:22,rating:4.9,reviews:97,completed:188,specializations:['Vedic rituals','Ancestral rituals'],pujas:['sradha','rudrabhisek','gruha-pratistha'],online:false,verified:true,available:'Next slot Sat'},
 {slug:'pandit-fakir-mohan-dash',name:'Pandit Fakir Mohan Dash',city:'Cuttack',languages:['Odia','Hindi'],experience:12,rating:4.6,reviews:32,completed:65,specializations:['Satyanarayana Puja','Ganapati Puja'],pujas:['satyanarayana-puja','ganapati-puja','santoshi-puja'],online:true,verified:true,available:'Available tomorrow'},
];
export const pujaBySlug=(slug:string)=>pujas.find(item=>item.slug===slug);
export const pujariBySlug=(slug:string)=>marketplacePujaris.find(item=>item.slug===slug);
