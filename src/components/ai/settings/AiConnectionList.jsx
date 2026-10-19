import React from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiArrowDown, FiArrowUp, FiEdit2, FiLoader, FiMenu, FiTrash2, FiZap } from 'react-icons/fi';
import { ProviderMark } from './AiConnectionDialog';
import { connectionRoles, connectionStatus, relativeTime } from './aiProviderMeta';

const TONE = {
  success: 'ui-badge ui-badge-success',
  danger: 'ui-badge ui-badge-danger',
  warning: 'ui-badge ui-badge-warning',
  neutral: 'ui-badge ui-badge-neutral',
  brand: 'ui-badge ui-badge-brand',
};

function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:opacity-50 ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

function Row({ connection, index, total, role, providerLabel, modelLabel, busy, testing, onToggle, onTest, onEdit, onDelete, onMove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: connection.id });
  const status = connectionStatus(connection);
  const used = relativeTime(connection.last_used_at);
  const name = connection.label || providerLabel;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative flex flex-col gap-3 rounded-xl border bg-white p-3 sm:flex-row sm:items-center ${isDragging ? 'z-10 border-indigo-300 shadow-lg' : 'border-slate-200'} ${connection.enabled ? '' : 'bg-slate-50/70'}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-slate-400 hover:text-slate-600 active:cursor-grabbing"
          aria-label={`Drag to reorder ${name}`}
          {...attributes}
          {...listeners}
        >
          <FiMenu className="h-4 w-4" />
        </button>
        <span className="w-5 shrink-0 text-center text-[13px] font-semibold tabular-nums text-slate-400">{index + 1}</span>
        <ProviderMark provider={connection.provider} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`truncate text-[14px] font-semibold ${connection.enabled ? 'text-slate-900' : 'text-slate-500'}`}>{name}</span>
            {role && <span className={role === 'Primary' ? TONE.brand : TONE.neutral}>{role}</span>}
            <span className={TONE[status.tone]} title={status.help}>{status.label}</span>
          </div>
          <p className="mt-0.5 truncate text-[12.5px] text-slate-500">
            {connection.label ? `${providerLabel} · ` : ''}{modelLabel}
            <span className="mx-1.5 text-slate-300">|</span>
            <span className="font-mono">{connection.api_key_hint || '••••'}</span>
            {used && <><span className="mx-1.5 text-slate-300">|</span>used {used}</>}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 pl-9 sm:pl-0">
        <div className="mr-1 hidden items-center sm:flex">
          <button type="button" className="ui-btn ui-btn-ghost ui-btn-icon" onClick={() => onMove(index, index - 1)} disabled={index === 0 || busy} aria-label={`Move ${name} up`}>
            <FiArrowUp className="h-4 w-4" />
          </button>
          <button type="button" className="ui-btn ui-btn-ghost ui-btn-icon" onClick={() => onMove(index, index + 1)} disabled={index === total - 1 || busy} aria-label={`Move ${name} down`}>
            <FiArrowDown className="h-4 w-4" />
          </button>
        </div>
        <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => onTest(connection)} disabled={testing || busy}>
          {testing ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : <FiZap className="h-3.5 w-3.5" />} Test
        </button>
        <button type="button" className="ui-btn ui-btn-ghost ui-btn-icon" onClick={() => onEdit(connection)} disabled={busy} aria-label={`Edit ${name}`}>
          <FiEdit2 className="h-4 w-4" />
        </button>
        <button type="button" className="ui-btn ui-btn-ghost ui-btn-icon text-red-600" onClick={() => onDelete(connection)} disabled={busy} aria-label={`Delete ${name}`}>
          <FiTrash2 className="h-4 w-4" />
        </button>
        <span className="ml-1.5">
          <Switch checked={connection.enabled} onChange={(v) => onToggle(connection, v)} disabled={busy} label={`${connection.enabled ? 'Switch off' : 'Switch on'} ${name}`} />
        </span>
      </div>
    </li>
  );
}

/**
 * Connections in failover order. Drag (mouse, touch or keyboard) or use the arrows to change
 * priority; the parent persists the new order.
 */
export default function AiConnectionList({ connections, providers, busyId, testingId, onReorder, onToggle, onTest, onEdit, onDelete }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const roles = connectionRoles(connections);
  const providerOf = (id) => providers.find((p) => p.id === id);

  const move = (from, to) => {
    if (to < 0 || to >= connections.length || from === to) return;
    onReorder(arrayMove(connections, from, to));
  };

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const from = connections.findIndex((c) => c.id === active.id);
    const to = connections.findIndex((c) => c.id === over.id);
    move(from, to);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={connections.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <ol className="space-y-2" aria-label="AI connections in failover order">
          {connections.map((c, i) => {
            const info = providerOf(c.provider);
            const modelLabel = info?.models.find((m) => m.id === c.model)?.label.split(' (')[0] || c.model;
            return (
              <Row
                key={c.id}
                connection={c}
                index={i}
                total={connections.length}
                role={roles[i]}
                providerLabel={info?.label || c.provider}
                modelLabel={modelLabel}
                busy={busyId === c.id}
                testing={testingId === c.id}
                onToggle={onToggle}
                onTest={onTest}
                onEdit={onEdit}
                onDelete={onDelete}
                onMove={move}
              />
            );
          })}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
