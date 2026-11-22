import { Teacher } from '../types/university';
import { SUBJECTS, EXAM_TYPES, GRADE_SCALE } from '../data/universityData';

// Re-export for backwards compatibility
export { SUBJECTS, EXAM_TYPES, GRADE_SCALE };

// Backward compatibility for components that expect BATCHES
// Students are now fetched dynamically from the database
export const BATCHES: any = {};

export const TEACHERS: Teacher[] = []; 