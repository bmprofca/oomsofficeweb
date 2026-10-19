import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AiChatPanel from '../AiChatPanel';
import { tableToCsv } from '../blocks/AiTableBlock';
import { buildHref, formatValue } from '../blocks/format';
import { parseSseFrame } from '../../../utils/ai-api';

jest.mock('../../../utils/permission-helper', () => ({
  useUserPermissions: () => ({ permissions: [], loading: false, check: (k) => !k || k === 'finance_balance_view' }),
}));

// recharts needs real layout APIs; a light stand-in keeps the test about our block contract.
jest.mock('recharts', () => {
  const React = require('react');
  const Box = ({ children, ...p }) => React.createElement('div', { 'data-chart-part': p.dataKey || 'part' }, children);
  return new Proxy({}, { get: (_, name) => (name === '__esModule' ? true : Box) });
});

const table = {
  type: 'table',
  title: 'Tasks assigned to Arun Pawan',
  columns: [
    { key: 'task_id', label: 'Task', type: 'text', href: '/task/{task_id}' },
    { key: 'status', label: 'Status', type: 'status' },
    { key: 'due_date', label: 'Due date', type: 'date' },
    { key: 'total', label: 'Total', type: 'money' },
  ],
  rows: [
    { task_id: 'T1', status: 'in process (overdue)', due_date: '2026-10-10', total: 1500 },
    { task_id: 'T2', status: 'complete', due_date: '2026-10-01', total: 800 },
  ],
  total: 2,
  truncated: false,
};
const kpi = { type: 'kpi', items: [{ label: 'Total', value: 8, format: 'number' }, { label: 'Total receivable', value: 45000, format: 'money' }] };
const chart = { type: 'chart', title: 'Active tasks by due date', kind: 'bar', xKey: 'category', series: [{ key: 'count', label: 'Tasks' }], data: [{ category: 'Overdue', count: 1 }] };
const clarification = { type: 'clarification', question: 'Which Arun do you mean?', options: ['Arun Pawan (Accountant)', 'Arun Pawan (Clerk)'] };

function renderPanel(messages, extra = {}) {
  const chat = { messages, sending: false, loadingHistory: false, send: jest.fn(), stop: jest.fn(), retry: jest.fn(), ...extra };
  render(
    <MemoryRouter>
      <AiChatPanel chat={chat} autoFocus={false} />
    </MemoryRouter>
  );
  return chat;
}

test('renders assistant text, table, KPI, chart and clarification blocks', () => {
  const chat = renderPanel([
    { id: 'u', role: 'user', text: 'Tasks of Arun?' },
    { id: 'a', role: 'assistant', text: 'Arun has **1 overdue** task.', blocks: [kpi, table, chart, clarification] },
  ]);

  expect(screen.getByText('1 overdue').tagName).toBe('STRONG');
  expect(screen.getByText('Tasks assigned to Arun Pawan')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'T1' })).toHaveAttribute('href', '/task/T1');
  expect(screen.getByText('in process (overdue)')).toBeInTheDocument();
  expect(screen.getByText('₹45,000.00')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Active tasks by due date' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Arun Pawan (Clerk)' }));
  expect(chat.send).toHaveBeenCalledWith('Arun Pawan (Clerk)');
});

test('HTML and scripts in model text are shown as plain text, never executed', () => {
  const { container } = render(
    <MemoryRouter>
      <AiChatPanel
        autoFocus={false}
        chat={{
          messages: [{ id: 'a', role: 'assistant', text: '<script>alert(1)</script> <img src=x onerror="alert(2)"> [bad](javascript:alert(3))', blocks: [] }],
          sending: false,
          loadingHistory: false,
          send: jest.fn(),
          stop: jest.fn(),
          retry: jest.fn(),
        }}
      />
    </MemoryRouter>
  );
  expect(container.querySelector('script')).toBeNull();
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('a[href^="javascript"]')).toBeNull();
  expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeInTheDocument();
});

test('unknown or malformed blocks are ignored', () => {
  renderPanel([{ id: 'a', role: 'assistant', text: 'ok', blocks: [{ type: 'html', html: '<b>x</b>' }, { type: 'table' }] }]);
  expect(screen.queryByText('x')).toBeNull();
});

test('empty state offers permission-filtered suggestions and Enter sends', () => {
  const chat = renderPanel([]);
  expect(screen.getByText('Show me the outstanding balances')).toBeInTheDocument();
  expect(screen.queryByText('Who is absent today?')).toBeNull();

  const input = screen.getByLabelText('Ask the OOMS assistant');
  fireEvent.change(input, { target: { value: 'Which tasks are overdue?' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(chat.send).toHaveBeenCalledWith('Which tasks are overdue?');
});

test('errors show a retry action; sending shows progress and blocks duplicate sends', () => {
  const failed = { id: 'a', role: 'assistant', text: '', blocks: [], error: { message: 'The AI service is busy.', retryable: true, retryText: 'hi' } };
  const chat = renderPanel([{ id: 'u', role: 'user', text: 'hi' }, failed]);
  const alert = screen.getByRole('alert');
  fireEvent.click(within(alert).getByRole('button', { name: /retry/i }));
  expect(chat.retry).toHaveBeenCalledWith(failed);
});

test('pending answer shows tool progress and a stop button', () => {
  const chat = renderPanel([{ id: 'a', role: 'assistant', text: '', blocks: [], pending: true, statusLabel: 'Checking attendance' }], { sending: true });
  expect(screen.getByRole('status')).toHaveTextContent('Checking attendance');
  fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
  expect(chat.stop).toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Send' })).toBeNull();
});

test('helpers: CSV formula guard, relative-only links, formatting, SSE parsing', () => {
  const csv = tableToCsv({ columns: [{ key: 'a', label: 'A' }], rows: [{ a: '=HYPERLINK("x")' }, { a: 'plain' }] });
  expect(csv).toBe('A\n"\'=HYPERLINK(""x"")"\nplain');
  expect(buildHref('/task/{task_id}', { task_id: 'a/b' })).toBe('/task/a%2Fb');
  expect(buildHref('//evil.com/{x}', { x: '1' })).toBeNull();
  expect(buildHref('/task/{task_id}', {})).toBeNull();
  expect(formatValue(null, 'money')).toBe('—');
  expect(parseSseFrame('event: status\ndata: {"label":"Looking up tasks"}')).toEqual({ event: 'status', data: { label: 'Looking up tasks' } });
  expect(parseSseFrame('event: x\ndata: not-json')).toBeNull();
});
