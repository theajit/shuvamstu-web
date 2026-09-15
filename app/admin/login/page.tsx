import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {ADMIN_COOKIE, validAdminSession} from '../../../lib/admin-auth';
import LoginForm from './login-form';

export const dynamic='force-dynamic';
export default async function AdminLogin(){
  const store=await cookies();
  if(validAdminSession(store.get(ADMIN_COOKIE)?.value))redirect('/admin');
  return <main className="admin-login"><section><img src="/shuvamstu-logo.jpg" alt="Shuvamstu"/><h1>Scheduling admin</h1><p>Sign in to manage bookings and availability.</p><LoginForm/></section></main>;
}
