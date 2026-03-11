import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  isExpanded: boolean;
  isMobileOpen: boolean;
  toggle: () => void;
  setExpanded: (expanded: boolean) => void;
  openMobile: () => void;
  closeMobile: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isExpanded: true,
      isMobileOpen: false,
      toggle: () => set((s) => ({ isExpanded: !s.isExpanded })),
      setExpanded: (expanded) => set({ isExpanded: expanded }),
      openMobile: () => set({ isMobileOpen: true }),
      closeMobile: () => set({ isMobileOpen: false }),
    }),
    {
      name: "sidebar-storage",
      partialize: (state) => ({ isExpanded: state.isExpanded }),
    }
  )
);
