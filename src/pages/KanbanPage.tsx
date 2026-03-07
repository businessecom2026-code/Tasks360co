import { Header } from '../components/layout/Header';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { useLocaleStore } from '../stores/useLocaleStore';

export function KanbanPage() {
  const { t } = useLocaleStore();
  return (
    <>
      <Header title={t('kanban.title')} />
      <KanbanBoard />
    </>
  );
}
