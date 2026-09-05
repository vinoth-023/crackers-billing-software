import React, { useState } from 'react';
import { Flame, Loader2 } from 'lucide-react';
import { signIn } from '../services/firebase';

export function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) { e.preventDefault(); setLoading(true); setError('');
    try { await signIn(email, password); onLogin(); } catch { setError('Invalid email/password or inactive account.'); } finally { setLoading(false); }
  }
  return <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white"><form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl"><div className="text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-600"><Flame /></div><h1 className="text-xl font-bold">Crackers Billing</h1><p className="text-sm text-slate-400">Admin & staff sign in</p></div>{error && <p className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}<input required type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-lg bg-slate-800 p-3 outline-none" /><input required type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-lg bg-slate-800 p-3 outline-none" /><button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 p-3 font-bold">{loading && <Loader2 className="animate-spin" size={16}/>} Sign in</button></form></div>;
}
