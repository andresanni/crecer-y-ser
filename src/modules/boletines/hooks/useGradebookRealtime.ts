import { useEffect } from 'react';
import type { RecordModel, RecordSubscription } from 'pocketbase';
import pb from '../../../core/pocketbase';
import type { EstadoInstanciaCargaBoletin } from '../models/boletin.model';
import { useGradebookConcurrencyStore } from '../store/gradebookConcurrencyStore';

interface WorkflowRealtimeRecord extends RecordModel {
  curso_id: string;
  periodo_id: string;
  estado: EstadoInstanciaCargaBoletin;
  revision: number;
}

const toWorkflowVersion = (record: WorkflowRealtimeRecord) => ({
  id: record.id,
  cursoId: record.curso_id,
  periodoId: record.periodo_id,
  estado: record.estado,
  revision: Number(record.revision) || 0,
});

export const useGradebookRealtime = () => {
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const subscribe = async () => {
      unsubscribe = await pb.collection('instancias_carga_boletin').subscribe<WorkflowRealtimeRecord>(
        '*',
        (event: RecordSubscription<WorkflowRealtimeRecord>) => {
          if (!active) return;
          const workflow = toWorkflowVersion(event.record);
          const store = useGradebookConcurrencyStore.getState();
          if (event.action === 'delete') {
            store.receiveDeletedWorkflow(workflow);
          } else {
            store.receiveWorkflow(workflow);
          }
        },
      );
    };
    void subscribe();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);
};
