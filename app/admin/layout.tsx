import {cookies} from 'next/headers';
import {ADMIN_COOKIE,validAdminSession} from '../../lib/admin-auth';
import './admin.css';
import './profiles.css';
import './booking-tools.css';
import './enterprise.css';
import './enquiry-tools.css';
import './pujas.css';
import './admin-nav.css';
export default async function AdminLayout({children}:{children:React.ReactNode}){const store=await cookies();const signedIn=validAdminSession(store.get(ADMIN_COOKIE)?.value);return <>{signedIn&&<nav className="admin-global-nav" aria-label="Admin navigation"><a href="/admin">Operations</a><a href="/admin/pujas">Pujas & pricing</a><a href="/admin/analytics">Analytics</a></nav>}{children}</>}
