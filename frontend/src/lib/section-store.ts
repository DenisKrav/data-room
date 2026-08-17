import { create } from 'zustand';

export type AppSection = 'rooms' | 'shared';

interface SectionState {
  section: AppSection;
  setSection: (section: AppSection) => void;
}

/**
 * Which top-level nav item should read as "active". Room/folder/file detail
 * routes all live under /rooms/:roomId/... regardless of whether the viewer
 * owns the room or is only there via a share, so pathname alone can't tell
 * "My Data Rooms" and "Shared with me" apart — pages set this explicitly
 * from data they already have (e.g. a folder's `canWrite` flag).
 */
export const useSectionStore = create<SectionState>((set) => ({
  section: 'rooms',
  setSection: (section) => set({ section }),
}));