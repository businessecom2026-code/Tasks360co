import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useTaskStore } from '../../stores/useTaskStore';

const SEGMENTS = [
  { status: 'PENDING',     label: 'Pendentes',    color: '#facc15' }, // yellow-400
  { status: 'IN_PROGRESS', label: 'Em Progresso', color: '#60a5fa' }, // blue-400
  { status: 'REVIEW',      label: 'Em Revisão',   color: '#c084fc' }, // purple-400
  { status: 'DONE',        label: 'Concluídos',   color: '#4ade80' }, // green-400
] as const;

interface TooltipPayloadEntry {
  payload: { label: string; count: number; color: string };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-900 dark:bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs shadow-lg">
      <span style={{ color: d.color }} className="font-semibold">{d.label}</span>
      <span className="text-gray-300 ml-2">{d.count} tarefas</span>
    </div>
  );
}

export function TaskStatusChart() {
  const tasks = useTaskStore((s) => s.tasks);

  const data = useMemo(() => {
    const counts: Record<string, number> = { PENDING: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 };
    tasks.forEach((t) => { if (t.status in counts) counts[t.status]++; });
    return SEGMENTS.map((seg) => ({ ...seg, count: counts[seg.status] }));
  }, [tasks]);

  const total = tasks.length;
  const hasData = total > 0;

  // Empty state data: 4 equal ghost segments
  const chartData = hasData ? data : SEGMENTS.map((s) => ({ ...s, count: 1 }));

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm dark:shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-gray-900 dark:text-white font-semibold text-sm">Visão Geral</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {total} {total === 1 ? 'tarefa' : 'tarefas'}
        </span>
      </div>

      {/* Chart + center label */}
      <div className="relative h-40 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={68}
              startAngle={90}
              endAngle={-270}
              strokeWidth={2}
              stroke="transparent"
              isAnimationActive={true}
              animationBegin={0}
              animationDuration={700}
              animationEasing="ease-out"
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={hasData ? entry.color : '#374151'} // gray-700 for empty state
                  opacity={hasData ? 1 : 0.4}
                />
              ))}
            </Pie>
            {hasData && <Tooltip content={<CustomTooltip />} />}
          </PieChart>
        </ResponsiveContainer>

        {/* Center total */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
            {hasData ? total : '—'}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
        {data.map((seg) => (
          <div key={seg.status} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{seg.label}</span>
            </div>
            <span className="text-xs font-semibold text-gray-900 dark:text-white ml-2 tabular-nums">
              {seg.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
