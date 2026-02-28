import { Header } from '../components/layout/Header';
import { KanbanBoard } from '../components/kanban/KanbanBoard';

export function KanbanPage() {
  return (
    <>
      <Header title="Kanban" />
      <KanbanBoard />
    </>
  );
}
