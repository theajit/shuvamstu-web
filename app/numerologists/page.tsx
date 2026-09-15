import type {Metadata} from 'next';
import PractitionerPage from '../practitioner-page';
import {practitionerPages} from '../data/practitioners';
import {listPractitioners} from '../../lib/practitioner-repository';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Consult a Numerologist',description:'Connect with a numerologist for personal name and birth-date analysis.'};
export default async function NumerologistsPage(){return <PractitionerPage data={practitionerPages.numerologists} profiles={await listPractitioners('NUMEROLOGIST')} basePath="numerologists"/>}
