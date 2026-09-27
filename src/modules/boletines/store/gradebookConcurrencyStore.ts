import { create } from 'zustand';
import type { EstadoInstanciaCargaBoletin, InstanciaCargaBoletin } from '../models/boletin.model';

export interface GradebookWorkflowVersion {
  id: string;
  cursoId: string;
  periodoId: string;
  estado: EstadoInstanciaCargaBoletin;
  revision: number;
}

interface GradebookConcurrencyState {
  workflows: Record<string, GradebookWorkflowVersion>;
  periodSequences: Record<string, number>;
  receiveWorkflow: (workflow: GradebookWorkflowVersion) => void;
  receiveDeletedWorkflow: (workflow: GradebookWorkflowVersion) => void;
}

export const gradebookScopeKey = (cursoId: string, periodoId: string) => `${cursoId}:${periodoId}`;

export const useGradebookConcurrencyStore = create<GradebookConcurrencyState>((set) => ({
  workflows: {},
  periodSequences: {},
  receiveWorkflow: (workflow) => set((state) => {
    const key = gradebookScopeKey(workflow.cursoId, workflow.periodoId);
    const current = state.workflows[key];
    if (current && current.revision > workflow.revision) return state;
    if (
      current
      && current.revision === workflow.revision
      && current.id === workflow.id
      && current.estado === workflow.estado
    ) return state;
    return {
      workflows: {
        ...state.workflows,
        [key]: workflow,
      },
      periodSequences: {
        ...state.periodSequences,
        [workflow.periodoId]: (state.periodSequences[workflow.periodoId] || 0) + 1,
      },
    };
  }),
  receiveDeletedWorkflow: (workflow) => set((state) => {
    const key = gradebookScopeKey(workflow.cursoId, workflow.periodoId);
    const current = state.workflows[key];
    if (current && current.revision > workflow.revision) return state;
    const workflows = { ...state.workflows };
    delete workflows[key];
    return {
      workflows,
      periodSequences: {
        ...state.periodSequences,
        [workflow.periodoId]: (state.periodSequences[workflow.periodoId] || 0) + 1,
      },
    };
  }),
}));

export const workflowVersionFromInstance = (
  workflow: InstanciaCargaBoletin,
): GradebookWorkflowVersion => ({
  id: workflow.id,
  cursoId: workflow.cursoId,
  periodoId: workflow.periodoId,
  estado: workflow.estado,
  revision: workflow.revision,
});
