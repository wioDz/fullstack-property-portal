import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PredictionRecord } from './types';

/**
 * Client-side store for estimator history and comparison selection.
 * Persists history to localStorage so it survives page reloads.
 */
interface EstimatorState {
  history: PredictionRecord[];
  selectedIds: number[];
  addToHistory: (record: PredictionRecord) => void;
  toggleSelection: (id: number) => void;
  clearSelection: () => void;
  clearHistory: () => void;
}

export const useEstimatorStore = create<EstimatorState>()(
  persist(
    (set) => ({
      history: [],
      selectedIds: [],
      addToHistory: (record) =>
        set((state) => ({ history: [record, ...state.history] })),
      toggleSelection: (id) =>
        set((state) => ({
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((i) => i !== id)
            : [...state.selectedIds, id],
        })),
      clearSelection: () => set({ selectedIds: [] }),
      clearHistory: () => set({ history: [], selectedIds: [] }),
    }),
    {
      name: 'estimator-storage',
    }
  )
);
