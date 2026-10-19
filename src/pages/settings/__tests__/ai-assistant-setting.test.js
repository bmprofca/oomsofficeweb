import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AiAssistantSetting from '../ai-assistant-setting';
import {
  createAiConnection,
  deleteAiConnection,
  getAiSettings,
  reorderAiConnections,
  testAiConnection,
  updateAiConnection,
} from '../../../utils/ai-api';

jest.mock('../../../components/header', () => ({ Header: () => null, Sidebar: () => null }));
jest.mock('react-hot-toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('../../../utils/ai-api', () => ({
  getAiSettings: jest.fn(),
  saveAiSettings: jest.fn(),
  testAiConnection: jest.fn(),
  createAiConnection: jest.fn(),
  updateAiConnection: jest.fn(),
  deleteAiConnection: jest.fn(),
  reorderAiConnections: jest.fn(),
  testSavedAiConnection: jest.fn(),
}));

const providers = [
  { id: 'anthropic', label: 'Anthropic Claude', keyPlaceholder: 'sk-ant-…', keyHelp: 'Anthropic help.', keyUrl: 'https://a', defaultModel: 'claude-sonnet-5-5', models: [{ id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (recommended)' }] },
  { id: 'openai', label: 'OpenAI', keyPlaceholder: 'sk-…', keyHelp: 'OpenAI help.', keyUrl: 'https://o', defaultModel: 'gpt-6.1-sol', models: [{ id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol (recommended)' }] },
  { id: 'gemini', label: 'Google Gemini', keyPlaceholder: 'AIza…', keyHelp: 'Gemini help.', keyUrl: 'https://g', defaultModel: 'gemini-3.8-flash', models: [{ id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (recommended)' }, { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro preview' }] },
];
const conn = (id, provider, model, extra = {}) => ({ id, label: null, provider, model, effort: 'medium', api_key_hint: `••••${id.slice(-4)}`, enabled: true, priority: 1, last_status: null, last_used_at: null, ...extra });
const connections = [
  conn('c-000000000001', 'anthropic', 'claude-sonnet-5-5', { label: 'Office Claude', last_status: 'BILLING' }),
  conn('c-000000000002', 'gemini', 'gemini-3.8-flash', { last_status: 'ok' }),
  conn('c-000000000003', 'openai', 'gpt-6.1-sol', { enabled: false }),
];
const payload = (overrides = {}) => ({
  settings: { enabled: true, rate_per_min: 6, rate_per_day: 200 },
  connections,
  providers,
  efforts: ['low', 'medium', 'high'],
  limits: { max_connections: 10 },
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  getAiSettings.mockResolvedValue(payload());
});

const renderPage = () => render(<MemoryRouter><AiAssistantSetting /></MemoryRouter>);
const rows = () => within(screen.getByRole('list', { name: /failover order/ })).getAllByRole('listitem');

test('shows connections in failover order with roles and health; warns when the primary has no credit', async () => {
  renderPage();
  await screen.findByRole('list', { name: /failover order/ });
  const [first, second, third] = rows();
  expect(within(first).getByText('Primary')).toBeInTheDocument();
  expect(within(first).getByText('No credit')).toBeInTheDocument();
  expect(within(second).getByText('Backup 1')).toBeInTheDocument();
  expect(within(second).getByText('Working')).toBeInTheDocument();
  expect(within(third).getByText('Off')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent(/Office Claude.*No credit.*answered by Google Gemini/);
  expect(screen.getByText(/answering with/)).toHaveTextContent('Google Gemini');
  expect(screen.getByText('3 of 10')).toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/sk-ant-[A-Za-z]/);
});

test('add a second key: pick provider, test, save', async () => {
  createAiConnection.mockResolvedValue(payload());
  testAiConnection.mockResolvedValue({ ok: true, message: 'Connection successful.' });
  renderPage();
  await screen.findByRole('list', { name: /failover order/ });

  fireEvent.click(screen.getByRole('button', { name: /Add connection/ }));
  const dialog = await screen.findByRole('dialog', { name: 'Add AI connection' });
  fireEvent.click(within(dialog).getByRole('radio', { name: /Google Gemini/ }));
  expect(within(dialog).getByLabelText(/^API key/)).toHaveAttribute('placeholder', 'AIza…');
  fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Gemini backup' } });
  fireEvent.change(within(dialog).getByLabelText('Model'), { target: { value: 'gemini-3.1-pro-preview' } });
  fireEvent.change(within(dialog).getByLabelText(/^API key/), { target: { value: 'AIzaSyD-test-key-wxyz' } });

  fireEvent.click(within(dialog).getByRole('button', { name: 'Test connection' }));
  await waitFor(() => expect(testAiConnection).toHaveBeenCalledWith({ provider: 'gemini', apiKey: 'AIzaSyD-test-key-wxyz', model: 'gemini-3.1-pro-preview', effort: 'medium' }));
  expect(await within(dialog).findByText('Connection successful.')).toBeInTheDocument();

  fireEvent.click(within(dialog).getByRole('button', { name: 'Add connection' }));
  await waitFor(() => expect(createAiConnection).toHaveBeenCalledWith({
    label: 'Gemini backup', provider: 'gemini', model: 'gemini-3.1-pro-preview', effort: 'medium', apiKey: 'AIzaSyD-test-key-wxyz', enabled: true,
  }));
});

test('editing keeps the saved key unless replaced; changing provider requires a new key', async () => {
  updateAiConnection.mockResolvedValue(payload());
  renderPage();
  await screen.findByRole('list', { name: /failover order/ });
  fireEvent.click(screen.getByRole('button', { name: 'Edit Office Claude' }));
  const dialog = await screen.findByRole('dialog', { name: 'Edit AI connection' });

  fireEvent.click(within(dialog).getByRole('radio', { name: /OpenAI/ }));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent(/OpenAI API key/);
  expect(updateAiConnection).not.toHaveBeenCalled();

  fireEvent.click(within(dialog).getByRole('radio', { name: /Anthropic Claude/ }));
  fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Main Claude' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(updateAiConnection).toHaveBeenCalledWith('c-000000000001', { label: 'Main Claude', model: 'claude-sonnet-5-5', effort: 'medium' }));
});

test('reorder, switch off and delete', async () => {
  reorderAiConnections.mockResolvedValue({});
  updateAiConnection.mockResolvedValue(payload());
  deleteAiConnection.mockResolvedValue(payload({ connections: connections.slice(1) }));
  renderPage();
  await screen.findByRole('list', { name: /failover order/ });

  fireEvent.click(screen.getByRole('button', { name: 'Move Office Claude down' }));
  await waitFor(() => expect(reorderAiConnections).toHaveBeenCalledWith(['c-000000000002', 'c-000000000001', 'c-000000000003']));
  expect(within(rows()[0]).getByText('Google Gemini')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('switch', { name: 'Switch off Google Gemini' }));
  await waitFor(() => expect(updateAiConnection).toHaveBeenCalledWith('c-000000000002', { enabled: false }));

  fireEvent.click(screen.getByRole('button', { name: 'Delete Office Claude' }));
  const confirm = await screen.findByRole('dialog', { name: 'Delete AI connection?' });
  expect(confirm).toHaveTextContent('••••0001');
  fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));
  await waitFor(() => expect(deleteAiConnection).toHaveBeenCalledWith('c-000000000001'));
});

test('empty state invites adding the first connection; the assistant cannot be switched on without one', async () => {
  getAiSettings.mockResolvedValue(payload({ settings: { enabled: false, rate_per_min: 6, rate_per_day: 200 }, connections: [] }));
  renderPage();
  expect(await screen.findByText('No AI connections yet')).toBeInTheDocument();
  expect(screen.getByRole('switch', { name: /AI Assistant for this branch/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Add your first connection/ })).toBeInTheDocument();
});
