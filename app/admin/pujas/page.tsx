import {cookies} from 'next/headers';import {redirect} from 'next/navigation';import {ADMIN_COOKIE,validAdminSession} from '../../../lib/admin-auth';import PujaManager from './puja-manager';
export const dynamic='force-dynamic';export default async function Page(){const c=await cookies();if(!validAdminSession(c.get(ADMIN_COOKIE)?.value))redirect('/admin/login');return <PujaManager/>}
