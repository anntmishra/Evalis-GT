import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { KeyRound, UserPlus } from 'lucide-react';
import config from '../../config/environment';
import { getAuthConfig } from '../../api/authUtils';
import { getAllBatches } from '../../api/batchService';
import PremiumCard from '../ui/PremiumCard';
import { Button } from '../ui/button';

type AccountRole = 'student' | 'teacher';
interface Batch { id: string; name: string; }
const emptyForm = { id: '', name: '', email: '', batch: '', section: '', qualification: '', designation: '' };

export default function ManualAccountPanel() {
  const [role, setRole] = useState<AccountRole>('student');
  const [form, setForm] = useState(emptyForm);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [access, setAccess] = useState({ role: 'student' as AccountRole, email: '' });
  const [accessBusy, setAccessBusy] = useState(false);
  const [accessMessage, setAccessMessage] = useState('');

  useEffect(() => {
    getAllBatches().then((data: any) => {
      const list = Array.isArray(data) ? data : data?.batches || [];
      setBatches(list);
      setForm(current => ({ ...current, batch: current.batch || list[0]?.id || '' }));
    }).catch(() => setBatches([]));
  }, []);

  const update = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));

  const createAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setMessage(''); setError('');
    try {
      const auth = await getAuthConfig();
      const payload = role === 'student'
        ? { id: form.id.trim(), name: form.name.trim(), email: form.email.trim(), batch: form.batch, section: form.section.trim() }
        : { id: form.id.trim() || undefined, name: form.name.trim(), email: form.email.trim(), qualification: form.qualification.trim(), designation: form.designation.trim() };
      const response = await axios.post(`${config.API_BASE_URL}/${role === 'student' ? 'students' : 'teachers'}`, payload, auth);
      const data = response.data?.data || response.data;
      setMessage(data?.message || `${role === 'student' ? 'Student' : 'Teacher'} created and invitation sent.`);
      setForm({ ...emptyForm, batch: batches[0]?.id || '' });
    } catch (err: any) {
      setError(err.response?.data?.message || `Unable to create ${role}.`);
    } finally { setBusy(false); }
  };

  const sendAccess = async (event: React.FormEvent) => {
    event.preventDefault();
    setAccessBusy(true); setAccessMessage(''); setError('');
    try {
      const response = await axios.post(`${config.API_BASE_URL}/admin-tools/send-account-access`, access, await getAuthConfig());
      setAccessMessage(response.data.message);
      setAccess(current => ({ ...current, email: '' }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to send the access email.');
    } finally { setAccessBusy(false); }
  };

  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
    <PremiumCard title="Add One Account" subtitle="Create the roster record and send a secure Clerk invitation.">
      <form onSubmit={createAccount} className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-2 p-1 bg-secondary rounded-lg">
          {(['student', 'teacher'] as AccountRole[]).map(item => <button key={item} type="button" onClick={() => { setRole(item); setMessage(''); setError(''); }} className={`py-2 rounded-md text-sm font-medium capitalize ${role === item ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>{item}</button>)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-sm font-medium">{role === 'student' ? 'Student ID' : 'Teacher ID (optional)'}<input className="mt-1 w-full p-2 border rounded-lg bg-background" value={form.id} onChange={e => update('id', e.target.value)} required={role === 'student'} /></label>
          <label className="text-sm font-medium">Full name<input className="mt-1 w-full p-2 border rounded-lg bg-background" value={form.name} onChange={e => update('name', e.target.value)} required /></label>
        </div>
        <label className="block text-sm font-medium">Institutional email<input type="email" className="mt-1 w-full p-2 border rounded-lg bg-background" value={form.email} onChange={e => update('email', e.target.value)} required /></label>
        {role === 'student' ? <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-sm font-medium">Batch<select className="mt-1 w-full p-2 border rounded-lg bg-background" value={form.batch} onChange={e => update('batch', e.target.value)} required><option value="">Select batch</option>{batches.map(batch => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</select></label>
          <label className="text-sm font-medium">Section<input className="mt-1 w-full p-2 border rounded-lg bg-background" value={form.section} onChange={e => update('section', e.target.value)} placeholder="CSE-A" required /></label>
        </div> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-sm font-medium">Qualification<input className="mt-1 w-full p-2 border rounded-lg bg-background" value={form.qualification} onChange={e => update('qualification', e.target.value)} /></label>
          <label className="text-sm font-medium">Designation<input className="mt-1 w-full p-2 border rounded-lg bg-background" value={form.designation} onChange={e => update('designation', e.target.value)} /></label>
        </div>}
        <p className="text-xs text-muted-foreground">No password is generated or displayed. The user chooses a password after Clerk verifies the invited email address.</p>
        {message && <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">{message}</p>}
        {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}
        <Button className="w-full" type="submit" disabled={busy || (role === 'student' && !form.batch)}><UserPlus size={16} className="mr-2" />{busy ? 'Creating…' : `Create ${role} & send invite`}</Button>
      </form>
    </PremiumCard>

    <PremiumCard title="Send Access / Password Help" subtitle="Resend setup to a new user or password-help instructions to a registered user.">
      <form onSubmit={sendAccess} className="space-y-4 mt-4">
        <label className="block text-sm font-medium">Account type<select className="mt-1 w-full p-2 border rounded-lg bg-background" value={access.role} onChange={e => setAccess(current => ({ ...current, role: e.target.value as AccountRole }))}><option value="student">Student</option><option value="teacher">Teacher</option></select></label>
        <label className="block text-sm font-medium">Registered email<input type="email" className="mt-1 w-full p-2 border rounded-lg bg-background" value={access.email} onChange={e => setAccess(current => ({ ...current, email: e.target.value }))} required /></label>
        <div className="rounded-lg bg-secondary/40 p-4 text-sm text-muted-foreground space-y-2">
          <p><strong>Not registered yet:</strong> sends a fresh Clerk invitation to create the password.</p>
          <p><strong>Already registered:</strong> sends the sign-in link; the user selects “Forgot password” and Clerk verifies the reset by email.</p>
        </div>
        {accessMessage && <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">{accessMessage}</p>}
        <Button variant="outline" className="w-full" type="submit" disabled={accessBusy}><KeyRound size={16} className="mr-2" />{accessBusy ? 'Sending…' : 'Send secure access email'}</Button>
      </form>
    </PremiumCard>
  </div>;
}
