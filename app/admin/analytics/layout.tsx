import {cookies} from 'next/headers';import {redirect} from 'next/navigation';import {ADMIN_COOKIE,validAdminSession} from '../../../lib/admin-auth';
export default async function AnalyticsGuard({children}:{children:React.ReactNode}){const store=await cookies();if(!validAdminSession(store.get(ADMIN_COOKIE)?.value))redirect('/admin/login');return children}
