import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {ADMIN_COOKIE,validAdminSession} from '../../lib/admin-auth';
import AdminDashboard from './dashboard';

export const dynamic='force-dynamic';
export default async function AdminPage(){const store=await cookies();if(!validAdminSession(store.get(ADMIN_COOKIE)?.value))redirect('/admin/login');return <><a className="admin-catalogue-shortcut" href="/admin/pujas">Manage puja catalogue</a><AdminDashboard/></>}
