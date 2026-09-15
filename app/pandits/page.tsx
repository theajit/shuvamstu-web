import type {Metadata} from 'next';
import PractitionerPage from '../practitioner-page';
import {practitionerPages} from '../data/practitioners';
import {listPractitioners} from '../../lib/practitioner-repository';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Find a Pandit',description:'Connect with a Pandit for puja, marriage, Bratopanayan and traditional family ceremonies.'};
export default async function PanditsPage(){return <PractitionerPage data={practitionerPages.pandits} profiles={await listPractitioners('PANDIT')} basePath="pandits"/>}
