import { SignIn, useAuth } from '@clerk/clerk-react';
import { BookOpen, GraduationCap, Layers } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { EvalisBrand } from '../components/brand/EvalisBrand';

type Entry = 'student' | 'teacher' | 'admin';

export default function ClerkPortalSignIn({ entry }: { entry: Entry }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (isLoaded && isSignedIn) return <Navigate to="/workspace" replace />;

  const privateEntry = entry === 'admin';
  const Icon = entry === 'student' ? GraduationCap : BookOpen;
  const name = entry === 'student' ? 'Student' : entry === 'teacher' ? 'Teacher' : 'Institution';

  return <main className="entry-page">
    <section className="entry-story">
      <EvalisBrand/>
      <div className="entry-story-content"><span className="eyebrow light">THE ACADEMIC WORKSPACE</span><h1>Big ideas.<br/>Clear paths.<br/><em>Your next move.</em></h1><p>One connected place for the people who make learning happen.</p>
        <div className="academic-orbit" aria-hidden="true"><div className="orbit-ring ring-one"/><div className="orbit-ring ring-two"/><div className="orbit-core"><Layers size={44}/></div><span className="orbit-label orbit-learn">LEARN</span><span className="orbit-label orbit-teach">TEACH</span><span className="orbit-label orbit-grow">GROW</span></div>
      </div><p className="entry-footnote">Learning is a collective effort. Make it count.</p>
    </section>
    <section className="entry-access"><div className="entry-access-top"><span>WELCOME TO EVALIS</span><Link to="/">About the workspace</Link></div>
      <div className="entry-form-wrap"><span className="eyebrow">YOUR SPACE, YOUR RESPONSIBILITY</span><h2>{privateEntry ? 'Institution access.' : 'Choose your starting point.'}</h2><p className="entry-description">Your account opens the academic workspace assigned to you.</p>
        {!privateEntry && <div className="role-picker" aria-label="Choose your workspace"><Link className={`role-option ${entry === 'student' ? 'selected' : ''}`} to="/student/sign-in"><GraduationCap size={19}/><span>Student</span></Link><Link className={`role-option ${entry === 'teacher' ? 'selected' : ''}`} to="/teacher/sign-in"><BookOpen size={19}/><span>Teacher</span></Link></div>}
        <div className="selected-workspace"><Icon size={23}/><div><strong>{name}</strong><p>{privateEntry ? 'Access is assigned by your institution.' : `Sign in to your ${name.toLowerCase()} workspace.`}</p></div></div>
        <div className="clerk-entry-card"><SignIn routing="hash" redirectUrl="/workspace" {...(privateEntry ? {} : { signUpUrl: `/${entry}/sign-up` })} appearance={{ elements: { card: 'shadow-none border-0', headerTitle: 'hidden', headerSubtitle: 'hidden', formButtonPrimary: 'action-primary', formFieldInput: 'workspace-clerk-input' } }} /></div>
      </div><p className="entry-footer">Your account determines your permissions.</p>
    </section>
  </main>;
}
