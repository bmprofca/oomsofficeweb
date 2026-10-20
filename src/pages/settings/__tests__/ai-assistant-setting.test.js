import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AiAssistantSetting from '../ai-assistant-setting';
import {
  saveAiSettings,
  createMcpConnector,
  getMcpConnectors,
  rotateMcpConnector,
  updateMcpConnector,
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
  getMcpConnectors: jest.fn(),
  createMcpConnector: jest.fn(),
  updateMcpConnector: jest.fn(),
  rotateMcpConnector: jest.fn(),
  deleteMcpConnector: jest.fn(),
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

const mcpMembers = [{ username: 'usr_BOSS000001', name: 'Office Boss', role: 'admin' }, { username: 'usr_STAFF00001', name: 'Staff One', role: 'staff', designation: 'Accountant' }];
const mcpPayload = (connectors = []) => ({ connectors, members: mcpMembers, endpoint: 'https://server.ooms.in/api/v1/mcp', public: true, limits: { max_connectors: 20 } });
const SECRET_URL = 'https://server.ooms.in/api/v1/mcp/ooms_mcp_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_abcde';

beforeEach(() => {
  jest.clearAllMocks();
  getAiSettings.mockResolvedValue(payload());
  getMcpConnectors.mockResolvedValue(mcpPayload());
  Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue() } });
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

test('Claude connector: create with a member, URL shown once with copy and setup steps, regenerate', async () => {
  const saved = { id: 'm1', label: 'Claude — Sourav', token_hint: '…bcde', run_as: 'usr_STAFF00001', run_as_name: 'Staff One', enabled: true, last_used_at: null };
  createMcpConnector.mockResolvedValue({ ...mcpPayload([saved]), id: 'm1', url: SECRET_URL });
  rotateMcpConnector.mockResolvedValue({ ...mcpPayload([saved]), id: 'm1', url: `${SECRET_URL}X` });
  renderPage();
  const card = (await screen.findByRole('heading', { name: /Claude connector/ })).closest('section');
  expect(await within(card).findByText(/No connectors yet/)).toBeInTheDocument();

  fireEvent.click(within(card).getByRole('button', { name: /Create connector/ }));
  const dialog = await screen.findByRole('dialog', { name: 'Create Claude connector' });
  fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Claude — Sourav' } });
  fireEvent.change(within(dialog).getByLabelText('Access level of'), { target: { value: 'usr_STAFF00001' } });
  expect(within(dialog).queryByText(/usr_/)).not.toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create connector' }));
  await waitFor(() => expect(createMcpConnector).toHaveBeenCalledWith({ label: 'Claude — Sourav', runAs: 'usr_STAFF00001', accessMode: 'read', acknowledgeWrite: false }));

  const urlDialog = await screen.findByRole('dialog', { name: 'Your connector URL' });
  expect(within(urlDialog).getByLabelText('Connector URL')).toHaveValue(SECRET_URL);
  expect(urlDialog).toHaveTextContent(/Add custom connector/);
  fireEvent.click(within(urlDialog).getByRole('button', { name: /Copy/ }));
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(SECRET_URL));
  fireEvent.click(within(urlDialog).getByRole('button', { name: 'Done' }));

  expect(await within(card).findByText('Claude — Sourav')).toBeInTheDocument();
  expect(within(card).getByText('Staff One')).toBeInTheDocument();
  expect(card.textContent).not.toMatch(/ooms_mcp_[A-Za-z0-9]{10}/);

  fireEvent.click(within(card).getByRole('button', { name: /Regenerate URL/ }));
  const confirm = await screen.findByRole('dialog', { name: 'Regenerate connector URL?' });
  fireEvent.click(within(confirm).getByRole('button', { name: 'Regenerate' }));
  await waitFor(() => expect(rotateMcpConnector).toHaveBeenCalledWith('m1'));
  expect(await screen.findByDisplayValue(`${SECRET_URL}X`)).toBeInTheDocument();
});

test('Claude connector can be created as read & write only after ticking the confirmation', async () => {
  const saved = { id: 'm2', label: '', token_hint: '…bcde', run_as: 'usr_BOSS000001', run_as_name: 'Office Boss', enabled: true, access_mode: 'read_write', last_used_at: null };
  createMcpConnector.mockResolvedValue({ ...mcpPayload([saved]), id: 'm2', url: SECRET_URL });
  renderPage();
  const card = (await screen.findByRole('heading', { name: /Claude connector/ })).closest('section');
  await within(card).findByText(/No connectors yet/);
  fireEvent.click(within(card).getByRole('button', { name: /Create connector/ }));
  const dialog = await screen.findByRole('dialog', { name: 'Create Claude connector' });
  const access = within(dialog).getByRole('radiogroup', { name: 'Access' });
  expect(within(access).getByRole('radio', { name: /Read-only/ })).toHaveAttribute('aria-checked', 'true');

  fireEvent.click(within(access).getByRole('radio', { name: /Read & write/ }));
  expect(dialog).toHaveTextContent(/Send WhatsApp messages/);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create connector' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent(/Tick the confirmation/);
  expect(createMcpConnector).not.toHaveBeenCalled();

  fireEvent.click(within(dialog).getByRole('checkbox'));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create connector' }));
  await waitFor(() => expect(createMcpConnector).toHaveBeenCalledWith(expect.objectContaining({ accessMode: 'read_write', acknowledgeWrite: true })));
  const urlDialog = await screen.findByRole('dialog', { name: 'Your connector URL' });
  expect(urlDialog).toHaveTextContent(/approve before anything goes out/);
});

test('each connector has a Read-only / Read & write switch; read & write asks for confirmation first', async () => {
  const c = { id: 'm1', label: 'Claude — Sourav', token_hint: '…bcde', run_as: 'usr_STAFF00001', run_as_name: 'Staff One', enabled: true, access_mode: 'read', last_used_at: null };
  getMcpConnectors.mockResolvedValue(mcpPayload([c]));
  updateMcpConnector.mockImplementation(async (id, body) => mcpPayload([{ ...c, access_mode: body.accessMode }]));
  renderPage();
  const toggle = await screen.findByRole('radiogroup', { name: 'Access of Claude — Sourav' });
  fireEvent.click(within(toggle).getByRole('radio', { name: /Read & write/ }));
  const dialog = await screen.findByRole('dialog', { name: 'Turn on read & write?' });
  expect(dialog).toHaveTextContent(/Claude asks before every send/);
  expect(updateMcpConnector).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('checkbox'));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Turn on read & write' }));
  await waitFor(() => expect(updateMcpConnector).toHaveBeenCalledWith('m1', { accessMode: 'read_write', acknowledgeWrite: true }));
  await waitFor(() => expect(within(screen.getByRole('radiogroup', { name: 'Access of Claude — Sourav' })).getByRole('radio', { name: /Read & write/ })).toHaveAttribute('aria-checked', 'true'));

  fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Access of Claude — Sourav' })).getByRole('radio', { name: /Read-only/ }));
  await waitFor(() => expect(updateMcpConnector).toHaveBeenLastCalledWith('m1', { accessMode: 'read', acknowledgeWrite: false }));
});

test('Claude connector warns when the server is not reachable from the internet', async () => {
  getMcpConnectors.mockResolvedValue({ ...mcpPayload(), endpoint: 'http://localhost:8877/api/v1/mcp', public: false });
  renderPage();
  expect(await screen.findByText(/not reachable from the internet/)).toBeInTheDocument();
});

test('read & write needs the confirmation dialog; read-only is restored directly', async () => {
  saveAiSettings.mockImplementation(async (body) => payload({ settings: { enabled: true, rate_per_min: 6, rate_per_day: 200, access_mode: body.access_mode } }));
  renderPage();
  const group = await screen.findByRole('radiogroup', { name: 'Assistant access' });
  expect(within(group).getByRole('radio', { name: /Read-only/ })).toHaveAttribute('aria-checked', 'true');

  fireEvent.click(within(group).getByRole('radio', { name: /Read & write/ }));
  const dialog = await screen.findByRole('dialog', { name: 'Turn on read & write?' });
  expect(dialog).toHaveTextContent(/Send WhatsApp messages/);
  expect(dialog).toHaveTextContent(/clicks Confirm/);
  const enable = within(dialog).getByRole('button', { name: 'Turn on read & write' });
  expect(enable).toBeDisabled();
  expect(saveAiSettings).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('checkbox'));
  fireEvent.click(enable);
  await waitFor(() => expect(saveAiSettings).toHaveBeenCalledWith(expect.objectContaining({ access_mode: 'read_write', acknowledge_write: true })));
  await waitFor(() => expect(within(group).getByRole('radio', { name: /Read & write/ })).toHaveAttribute('aria-checked', 'true'));

  fireEvent.click(within(group).getByRole('radio', { name: /Read-only/ }));
  await waitFor(() => expect(saveAiSettings).toHaveBeenLastCalledWith(expect.objectContaining({ access_mode: 'read', acknowledge_write: false })));
});

test('cancelling the dialog keeps the assistant read-only', async () => {
  renderPage();
  const group = await screen.findByRole('radiogroup', { name: 'Assistant access' });
  fireEvent.click(within(group).getByRole('radio', { name: /Read & write/ }));
  const dialog = await screen.findByRole('dialog', { name: 'Turn on read & write?' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Keep read-only' }));
  expect(saveAiSettings).not.toHaveBeenCalled();
  expect(within(group).getByRole('radio', { name: /Read-only/ })).toHaveAttribute('aria-checked', 'true');
});
