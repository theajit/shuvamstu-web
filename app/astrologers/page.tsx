import type {Metadata} from 'next';
import PractitionerPage from '../practitioner-page';
import {practitionerPages} from '../data/practitioners';
import {listPractitioners} from '../../lib/practitioner-repository';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Consult an Astrologer',description:'Connect with an astrologer for traditional guidance on personal questions and important life events.'};
export default async function AstrologersPage(){return <PractitionerPage data={practitionerPages.astrologers} profiles={await listPractitioners('ASTROLOGER')} basePath="astrologers"/>}
