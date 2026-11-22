import { BookOpen, GraduationCap, Network, Building2, ShieldCheck, Users, Landmark, ClipboardCheck } from 'lucide-react';
export const workspaces = [
  { id: 'student', name: 'Student', short: 'Learn', description: 'Your courses, submissions and published results.', icon: GraduationCap, kind: 'student' },
  { id: 'teacher', name: 'Teacher', short: 'Teach', description: 'Create assessments. Give feedback that matters.', icon: BookOpen, kind: 'teacher' },
  { id: 'programme_coordinator', name: 'Programme coordinator', short: 'Coordinate', description: 'Connect students, teaching teams and programmes.', icon: Network, kind: 'teacher' },
  { id: 'hod', name: 'Head of department', short: 'Lead', description: 'Manage responsibilities and review curriculum.', icon: Building2, kind: 'teacher' },
  { id: 'assistant_dean', name: 'Assistant dean', short: 'Review', description: 'Review proposals and support academic leadership.', icon: Users, kind: 'teacher' },
  { id: 'dean', name: 'Dean', short: 'Shape', description: 'Oversee your school and approve leadership.', icon: Landmark, kind: 'teacher' },
  { id: 'coe', name: 'Examination office', short: 'Publish', description: 'Review examinations and release results.', icon: ClipboardCheck, kind: 'teacher' },
  { id: 'admin', name: 'Master administrator', short: 'Build', description: 'Set up the institution, programmes and access.', icon: ShieldCheck, kind: 'admin' },
] as const;
export function workspaceFor(role?: string) { return workspaces.find(w => w.id === (role === 'master_admin' ? 'admin' : role)) || workspaces[1]; }
