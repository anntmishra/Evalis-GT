import { ReactNode, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, House, BookOpenCheck, ClipboardCheck, UsersRound, Building2, ListChecks, PanelLeftClose, RefreshCw, FileQuestion, Sparkles, ChartNoAxesCombined, School, Landmark, CalendarRange, ScrollText, Upload, ShieldCheck, UserRoundCog, Presentation, GraduationCap, LibraryBig, CircleGauge } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { workspaceFor } from '../../design/workspaces';
import config from '../../config/environment';
import { EvalisBrand, EvalisMark } from '../brand/EvalisBrand';
interface Props { children: ReactNode; role: 'faculty'|'hod'|'teacher'|'student'|'coe'|'master_admin'; }
export default function AcademicDashboardLayout({children,role}:Props){
  const {currentUser,logout}=useAuth(); const navigate=useNavigate(); const location=useLocation();
  const [open,setOpen]=useState(false); const [connection,setConnection]=useState<'checking'|'connected'|'offline'>('checking');
  const actualRole=currentUser?.role || role; const workspace=workspaceFor(actualRole);
  const base=role==='student'?'/dashboard/student':role==='coe'?'/dashboard/coe':role==='master_admin'?'/dashboard/master-admin':'/dashboard/faculty';
  const links:Array<[string,string]>=[['','Overview']];
  if(role==='student')links.push(['assignments','Assessments'],['quizzes','Quizzes'],['results','Published results']);
  else if(role==='coe')links.push(['approvals','Exam approvals'],['results','Publish results'],['schools','Schools'],['departments','Departments'],['imports','Data imports']);
  else if(role==='master_admin')links.push(['schools','Schools'],['programs','Programmes'],['batches','Academic sessions'],['curriculum-admin','Curriculum'],['dean-management','Dean assignments'],['global-roles','University roles'],['bulk-import','Bulk import'],['audit-logs','Audit log']);
  else {
    links.push(['assignments','Assessment & grading'],['questions','Question papers'],['quizzes','Quizzes']);
    if(actualRole==='programme_coordinator')links.push(['teaching','Teaching allocation'],['my-students','Student roster'],['groups','Lecture groups'],['grades','Semester grades'],['programs','Role proposals']);
    if(['hod','dean','assistant_dean'].includes(actualRole))links.push(['staff','Staff responsibilities'],['curriculum','Curriculum review'],['approvals','Paper approvals']);
    if(['dean','assistant_dean'].includes(actualRole))links.push(['deans-desk','Leadership approvals']);
  }
  const checkConnection=async()=>{setConnection('checking');try{const r=await fetch(`${config.API_BASE_URL}/health`);const data=await r.json();setConnection(r.ok && data.checks?.database?.status==='OK'?'connected':'offline');}catch{setConnection('offline');}};
  useEffect(()=>{void checkConnection();},[]);
  useEffect(()=>{setOpen(false);},[location.pathname]);
  const page=links.find(([path])=>location.pathname===`${base}${path?'/'+path:''}`)?.[1] || 'Workspace';
  const navIcons:Record<string,typeof House>={
    '':House,assignments:BookOpenCheck,quizzes:Sparkles,results:ChartNoAxesCombined,approvals:ClipboardCheck,
    schools:School,departments:Building2,imports:Upload,programs:Landmark,batches:CalendarRange,
    'curriculum-admin':LibraryBig,'dean-management':UserRoundCog,'global-roles':ShieldCheck,
    'bulk-import':Upload,'audit-logs':ScrollText,questions:FileQuestion,teaching:Presentation,
    'my-students':GraduationCap,groups:UsersRound,grades:ChartNoAxesCombined,staff:UserRoundCog,
    curriculum:LibraryBig,'deans-desk':ListChecks
  };
  const signOut=async()=>{await logout();navigate('/login');};
  return <div className="workspace-shell" data-role={actualRole}>
    <a className="skip-link" href="#workspace-main">Skip to content</a>
    {open&&<button aria-label="Close navigation overlay" onClick={()=>setOpen(false)} className="sidebar-overlay"/>}
    <aside className={`workspace-sidebar ${open?'is-open':''}`}>
      <EvalisBrand/><button className="sidebar-mobile-close" aria-label="Close navigation" onClick={()=>setOpen(false)}><PanelLeftClose size={20}/></button>
      <div className="workspace-switcher"><span className="workspace-switcher-icon"><workspace.icon size={19}/></span><span><small>YOUR WORKSPACE</small><strong>{workspace.name}</strong></span></div>
      <div className="sidebar-label">YOUR NAVIGATION</div><nav aria-label="Workspace navigation">{links.map(([path,label])=>{const Icon=navIcons[path]||CircleGauge;return <NavLink key={path} end={!path} to={`${base}${path?'/'+path:''}`} className={({isActive})=>`sidebar-link ${isActive?'active':''}`}><span className="sidebar-link-icon"><Icon size={18}/></span><span>{label}</span>{!path&&<span className="nav-shortcut">HOME</span>}</NavLink>;})}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><EvalisMark size={28}/><p>One system.<br/><strong>Every academic signal.</strong></p></div><div className="sidebar-profile"><span className="profile-avatar">{(currentUser?.name||'E').slice(0,2).toUpperCase()}</span><div><strong>{currentUser?.name || 'Your account'}</strong><small>{workspace.name}</small></div><button title="Sign out" aria-label="Sign out" onClick={signOut}><LogOut size={18}/></button></div></div>
    </aside>
    <div className="workspace-body"><header className="workspace-topbar"><button className="mobile-menu" aria-label="Open navigation" onClick={()=>setOpen(true)}><Menu size={23}/></button><div className="topbar-context"><div className="breadcrumbs"><span>{workspace.short}</span><span>/</span><strong>{page}</strong></div><h2>{page}</h2></div><div className="topbar-actions"><span className="role-chip">{workspace.name}</span><button className={`connection-label ${connection}`} onClick={checkConnection} title="Check database connection"><span/>{connection==='connected'?'Live data':connection==='checking'?'Checking':'Offline'}<RefreshCw size={12}/></button><span className="topbar-avatar">{(currentUser?.name||'E').slice(0,2).toUpperCase()}</span></div></header><main id="workspace-main" className="workspace-main">{children}</main><footer className="workspace-footer"><span>Evalis Academic OS</span><span>{workspace.name} · live workspace</span></footer></div>

  </div>;
}
