import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, GraduationCap, Orbit, ShieldCheck, Sparkles } from 'lucide-react';
import { EvalisBrand, EvalisMark } from '../components/brand/EvalisBrand';

const signals = [
  ['01', 'Set the work', 'Create clear assessments and quizzes that reach the right cohort.'],
  ['02', 'See the signal', 'Submissions, grading and feedback move through one visible system.'],
  ['03', 'Close the loop', 'Publish trusted results and give every learner a useful next step.']
];

export default function LandingPage() {
  return <div className="brand-site">
    <header className="brand-header"><EvalisBrand/><nav aria-label="Public navigation"><a href="#system">The system</a><a href="#workspaces">Workspaces</a><Link className="brand-button secondary" to="/login">Sign in</Link><Link className="brand-button primary" to="/login">Enter Evalis</Link></nav></header>
    <main>
      <section className="brand-hero">
        <div className="hero-noise" aria-hidden="true"/>
        <div className="brand-hero-copy"><div className="brand-kicker"><Sparkles size={15}/>The academic operating system</div><h1>Turn academic<br/><em>motion</em> into<br/><span>momentum.</span></h1><p>Evalis connects teaching, submissions, grading and results in one beautifully accountable workspace—so institutions can move with clarity.</p><div className="brand-hero-actions"><Link className="brand-button signal" to="/login">Open your workspace</Link><a className="brand-text-link" href="#system">See how it moves</a></div><div className="hero-trust"><span><CheckCircle2/>Role-aware access</span><span><CheckCircle2/>Live academic data</span><span><CheckCircle2/>One source of truth</span></div></div>
        <div className="signal-stage" aria-label="A connected view of teaching, assessment and progress">
          <div className="signal-orbit orbit-a"/><div className="signal-orbit orbit-b"/><div className="signal-orbit orbit-c"/>
          <div className="signal-core"><EvalisMark size={58}/><span>LIVE SIGNAL</span><strong>84%</strong><small>academic flow</small></div>
          <article className="signal-card signal-card-a"><span className="signal-card-icon"><BookOpen size={18}/></span><small>ASSESSMENT</small><strong>Systems thinking</strong><div className="mini-progress"><i/></div><p>32 of 38 submitted</p></article>
          <article className="signal-card signal-card-b"><span className="pulse-dot"/><small>FEEDBACK LOOP</small><strong>12 ready to review</strong><div className="avatar-stack"><i>MK</i><i>RA</i><i>+9</i></div></article>
          <article className="signal-card signal-card-c"><small>RESULT STATUS</small><strong>Published</strong><span>Verified · visible · complete</span></article>
          <div className="signal-caption"><Orbit size={17}/> Every action leaves a clear signal.</div>
        </div>
      </section>

      <section className="brand-proof" aria-label="Product principles"><span>BUILT FOR THE WHOLE ACADEMIC JOURNEY</span><div>Teach</div><i/><div>Assess</div><i/><div>Review</div><i/><div>Publish</div><i/><div>Grow</div></section>

      <section className="system-section" id="system"><div className="system-intro"><span className="brand-kicker dark">The system, made human</span><h2>Less chasing.<br/>More knowing.</h2><p>A calm interface on top of serious academic operations. Every person sees the work, decisions and next actions that belong to them.</p></div><div className="signal-steps">{signals.map(([number,title,copy])=><article key={number}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></section>

      <section className="workspace-showcase" id="workspaces"><div className="showcase-heading"><div><span className="brand-kicker dark">One campus. Precisely personal.</span><h2>Built around the person doing the work.</h2></div><p>The public entrance stays simple. Your verified role opens the exact tools, data and permissions you need.</p></div><div className="workspace-showcase-grid">
        <Link to="/login?role=student" className="showcase-card student"><span className="showcase-icon"><GraduationCap/></span><small>STUDENT WORKSPACE</small><h3>Know what’s next.<br/>Own your progress.</h3><p>Assessments, quizzes, submissions and published feedback in one focused view.</p><span className="showcase-cta">Enter as student</span><div className="showcase-number">01</div></Link>
        <Link to="/login?role=teacher" className="showcase-card teacher"><span className="showcase-icon"><BookOpen/></span><small>EDUCATOR WORKSPACE</small><h3>Make the work clear.<br/>Make feedback count.</h3><p>Create, review and understand learning without losing time to fragmented tools.</p><span className="showcase-cta">Enter as educator</span><div className="showcase-number">02</div></Link>
      </div></section>

      <section className="brand-manifesto"><div className="manifesto-mark"><ShieldCheck/></div><span>THE EVALIS STANDARD</span><h2>Serious infrastructure.<br/><em>Zero institutional beige.</em></h2><p>Reliable by design. Distinctive by choice. Made for the people moving education forward.</p><Link className="brand-button signal" to="/login">Find your workspace</Link></section>
    </main>
    <footer className="brand-footer"><EvalisBrand compact/><p>Clarity for every academic move.</p><div><a href="#system">System</a><a href="#workspaces">Workspaces</a><Link to="/login">Sign in</Link></div></footer>
  </div>;
}
