import { create } from "zustand";

type DashboardUiState = {
  notificationsOpen: boolean;
  toggleNotifications: () => void;
};

export const useDashboardUi = create<DashboardUiState>((set) => ({
  notificationsOpen: false,
  toggleNotifications: () => set((s) => ({ notificationsOpen: !s.notificationsOpen })),
}));
