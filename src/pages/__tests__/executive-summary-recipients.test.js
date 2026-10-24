import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfigurationPanel } from '../executive-summary';

jest.mock('../../components/header', () => ({ Header: () => null, Sidebar: () => null }));
jest.mock('../../components/PortalDatePicker', () => ({ DatePickerField: () => null }));
jest.mock('../../services/executiveSummaryService', () => ({}));
jest.mock('recharts', () => {
  const React = require('react');
  const Box = ({ children }) => React.createElement('div', null, children);
  return new Proxy({}, { get: (_, name) => (name === '__esModule' ? true : Box) });
});

const CONFIG = { enabled: false, schedule_type: 'weekly', send_hour: 9, send_minute: 0, inactivity_days: 30, sections: {}, recipient_emails: ['one@x.com'] };

// Mirrors how the page owns `draft` and passes patchDraft down.
function Harness({ config = CONFIG, onDraft, onSection }) {
  const [draft, setDraft] = useState(config);
  const patchDraft = (key, value) => setDraft((current) => { const next = { ...current, [key]: value }; onDraft?.(next); return next; });
  return <ConfigurationPanel draft={draft} config={config} saving={false} onSave={() => {}} patchDraft={patchDraft} patchSection={(key, value) => { onSection?.(key, value); setDraft((current) => ({ ...current, sections: { ...current.sections, [key]: { ...current.sections?.[key], ...value } } })); }} />;
}

const addButton = () => screen.getByRole('button', { name: 'Add recipient email' });

describe('Executive Summary – recipient emails', () => {
  it('renders one field per saved recipient', () => {
    render(<Harness config={{ ...CONFIG, recipient_emails: ['one@x.com', 'two@x.com'] }} />);
    expect(screen.getByLabelText('Recipient email 1')).toHaveValue('one@x.com');
    expect(screen.getByLabelText('Recipient email 2')).toHaveValue('two@x.com');
    expect(screen.queryByLabelText('Recipient email 3')).toBeNull();
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
  });

  it('adds fields with the plus button up to 5, then disables it', () => {
    render(<Harness />);
    for (let i = 0; i < 4; i += 1) fireEvent.click(addButton());
    expect(screen.getByLabelText('Recipient email 5')).toBeInTheDocument();
    expect(addButton()).toBeDisabled();
    expect(addButton()).toHaveTextContent('Maximum of 5 recipients reached');
    fireEvent.click(addButton());
    expect(screen.queryByLabelText('Recipient email 6')).toBeNull();
  });

  it('keeps draft.recipient_emails in sync, dropping blanks and removed rows', () => {
    const onDraft = jest.fn();
    render(<Harness config={{ ...CONFIG, recipient_emails: ['one@x.com', 'two@x.com'] }} onDraft={onDraft} />);
    fireEvent.click(addButton());
    fireEvent.change(screen.getByLabelText('Recipient email 3'), { target: { value: 'three@x.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove recipient email 1' }));
    expect(onDraft).toHaveBeenLastCalledWith(expect.objectContaining({ recipient_emails: ['two@x.com', 'three@x.com'] }));
    expect(screen.getByLabelText('Recipient email 1')).toHaveValue('two@x.com');
  });

  it('flags invalid and duplicate emails on their row', () => {
    render(<Harness />);
    fireEvent.click(addButton());
    fireEvent.change(screen.getByLabelText('Recipient email 2'), { target: { value: 'ONE@x.com' } });
    expect(screen.getByText('This email is already added')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Recipient email 2'), { target: { value: 'nope' } });
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Recipient email 2')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Executive Summary – configuration panel', () => {
  it('uses animated switches for scheduled delivery and toggles the draft', () => {
    const onDraft = jest.fn();
    render(<Harness onDraft={onDraft} />);
    const toggle = screen.getByRole('switch', { name: 'Enable scheduled reports' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle.firstChild.className).toMatch(/transition/);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(onDraft).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
  });

  it('shows one switch per report section and turns a section off', () => {
    const onSection = jest.fn();
    render(<Harness onSection={onSection} />);
    expect(screen.getAllByRole('switch')).toHaveLength(1 + 8);
    expect(screen.getByText('8 of 8 on')).toBeInTheDocument();
    const sales = screen.getByRole('switch', { name: 'Include Sales' });
    fireEvent.click(sales);
    expect(onSection).toHaveBeenCalledWith('sales', { enabled: false });
    expect(sales).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('7 of 8 on')).toBeInTheDocument();
  });

  it('has no timezone setting and states the schedule runs in IST', () => {
    render(<Harness />);
    expect(screen.queryByText(/timezone/i)).toBeNull();
    expect(screen.getByText(/Indian Standard Time \(IST\)/)).toBeInTheDocument();
    expect(screen.getByLabelText('Hour (0-23)')).toHaveValue('9');
    expect(screen.getByLabelText('Minute (0-59)')).toHaveValue('0');
  });
});
