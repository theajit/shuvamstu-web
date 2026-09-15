'use client';
import {FormEvent, useState} from 'react';
import {useRouter} from 'next/navigation';

export default function LoginForm(){
  const router=useRouter(); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setMessage('');const password=String(new FormData(event.currentTarget).get('password')||'');try{const response=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});const body=await response.json();if(!response.ok)throw new Error(body.message||'Sign in failed.');router.replace('/admin');router.refresh()}catch(error){setMessage(error instanceof Error?error.message:'Sign in failed.');setBusy(false)}}
  return <form onSubmit={submit}><label>Admin password<input name="password" type="password" autoComplete="current-password" required autoFocus/></label><button disabled={busy}>{busy?'Signing in…':'Sign in'}</button>{message&&<p role="alert" className="admin-error">{message}</p>}</form>;
}
