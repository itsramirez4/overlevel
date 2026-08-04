import { create } from 'zustand';
import { Routine } from '../types';

interface RoutineStore {
  routines: Routine[];
  setRoutines: (routines: Routine[]) => void;
}

export const routineStore = create<RoutineStore>((set) => ({
  routines: [],
  setRoutines: (routines) => set({ routines }),
}));
