import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Check, Layers, LockKeyhole } from 'lucide-react';
import config from '../config/environment';
import { portalHome, useDevelopmentAuth } from '../context/DevelopmentAuth';
import { workspaces, workspaceFor } from '../design/workspaces';
import { EvalisBrand } from '../components/brand/EvalisBrand';
export default function DevelopmentSignIn() {
  const auth = useDevelopmentAuth(); const navigate = useNavigate(); const location = useLocation(); const [params, setParams] = useSearchParams();
  const privateEntry = /\/(admin|master-admin)\/sign-in/.test(location.pathname);
  const requested = privateEntry ? 'admin' : location.pathname.startsWith('/student/') ? 'student' : location.pathname.startsWith('/teacher/') || location.pathname.startsWith('/coe/') ? 'teacher' : params.get('role');
  const selected = workspaceFor(requested === 'teacher' || requested === 'student' || requested === 'admin' && privateEntry ? requested : 'student');
  const [identifier, setIdentifier] = useState(''); const [password, setPassword] = useState(''); const [visible, setVisible] = useState(false);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  if (!auth.loading && auth.currentUser) return <Navigate to={portalHome(auth.currentUser.role)} replace />;
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const body = selected.kind === 'admin' ? { username: identifier.trim(), password } : { email: identifier.trim(), password };
      const response = await fetch(`${config.API_BASE_URL}/auth/${selected.kind}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok || !data.token) throw new Error(data.message || 'Sign-in failed');
      localStorage.setItem(config.AUTH.TOKEN_STORAGE_KEY, data.token);
      await auth.reload(); navigate('/workspace', { replace: true });
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in'); }
    finally { setBusy(false); }
  }
  return <main className="entry-page">
    <section className="entry-story"><EvalisBrand/>
      <div className="entry-story-content"><span className="eyebrow light">THE ACADEMIC WORKSPACE</span><h1>Big ideas.<br/>Clear paths.<br/><em>Your next move.</em></h1><p>One connected place for the people who make learning happen.</p>
        <div className="academic-orbit" aria-hidden="true"><div className="orbit-ring ring-one"/><div className="orbit-ring ring-two"/><div className="orbit-core"><Layers size={44}/></div><span className="orbit-label orbit-learn">LEARN</span><span className="orbit-label orbit-teach">TEACH</span><span className="orbit-label orbit-grow">GROW</span></div>
      </div><p className="entry-footnote">Learning is a collective effort. Make it count.</p>
    </section>
    <section className="entry-access"><div className="entry-access-top"><span>WELCOME TO EVALIS</span><Link to="/">About the workspace</Link></div>
      <div className="entry-form-wrap"><span className="eyebrow">YOUR SPACE, YOUR RESPONSIBILITY</span><h2>{privateEntry ? 'Institution access.' : 'Choose your starting point.'}</h2><p className="entry-description">{privateEntry ? 'Sign in with the account assigned by your institution.' : 'Choose your workspace, then sign in with your account.'}</p>
        {!privateEntry && <div className="role-picker" aria-label="Choose your workspace">{workspaces.filter(workspace => workspace.id === 'student' || workspace.id === 'teacher').map(workspace => { const Icon = workspace.icon; const active = workspace.id === selected.id; return <button type="button" key={workspace.id} aria-pressed={active} className={`role-option ${active ? 'selected' : ''}`} onClick={() => { setParams({role: workspace.id}); setIdentifier(''); setPassword(''); setError(''); }}><Icon size={19}/><span>{workspace.name}</span>{active && <Check size={15} className="role-check"/>}</button>; })}</div>}
        <form onSubmit={submit} className="access-form"><div className="selected-workspace"><selected.icon size={23}/><div><strong>{selected.name}</strong><p>{selected.description}</p></div></div>
          <label>{selected.kind === 'admin' ? 'Username' : 'Email address'}<input autoComplete="username" type={selected.kind === 'admin' ? 'text' : 'email'} placeholder={selected.kind === 'admin' ? 'Your administrator username' : 'you@institution.edu'} required value={identifier} onChange={e => setIdentifier(e.target.value)}/></label>
          <label>Password<div className="password-input"><input autoComplete="current-password" type={visible ? 'text' : 'password'} placeholder="Enter your password" required value={password} onChange={e => setPassword(e.target.value)}/><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div></label>
          {error && <p role="alert" className="workspace-error">{error}</p>}<button disabled={busy} className="action-primary access-submit">{busy ? 'Signing you in…' : `Enter ${selected.name.toLowerCase()} workspace`}</button>
          <p className="access-note"><LockKeyhole size={14}/>Your account determines your permissions.</p>
        </form>
      </div><p className="entry-footer">Development environment · Academic leaders sign in through Teacher.</p>
    </section>
  </main>;
}
