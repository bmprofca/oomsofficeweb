import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AiActionBlock from '../AiActionBlock';
import { cancelAiAction, confirmAiAction } from '../../../../utils/ai-api';

jest.mock('../../../../utils/ai-api', () => ({ confirmAiAction: jest.fn(), cancelAiAction: jest.fn() }));

const block = {
  type: 'action',
  action_id: '7d0b6a0e-0000-4000-8000-000000000001',
  action_type: 'send_email',
  title: 'Send email',
  fields: [{ label: 'To', value: 'Asish Layek (client)' }, { label: 'Email to', value: 'asish@example.com' }, { label: 'Subject', value: 'Documents received' }],
  body: 'Dear Asish,\nWe received your documents.',
  expires_minutes: 15,
};

beforeEach(() => jest.clearAllMocks());

test('shows exactly what will be sent and sends only on Confirm', async () => {
  confirmAiAction.mockResolvedValue({ status: 'done', message: 'Email sent to Asish Layek.', channels: { email: { status: 'sent' } } });
  render(<AiActionBlock block={block} />);
  expect(screen.getByText('Needs your confirmation')).toBeInTheDocument();
  expect(screen.getByText('asish@example.com')).toBeInTheDocument();
  expect(screen.getByText(/We received your documents/)).toBeInTheDocument();
  expect(confirmAiAction).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: /Confirm & send/ }));
  await waitFor(() => expect(confirmAiAction).toHaveBeenCalledWith(block.action_id));
  expect(await screen.findByText('Sent')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Email sent to Asish Layek.');
  expect(screen.queryByRole('button', { name: /Confirm/ })).not.toBeInTheDocument();
});

test('cancel, and already-handled actions show their state instead of buttons', async () => {
  cancelAiAction.mockResolvedValue({ status: 'cancelled', message: 'Cancelled. Nothing was sent.' });
  const { unmount } = render(<AiActionBlock block={block} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(await screen.findByText('Cancelled')).toBeInTheDocument();
  unmount();

  confirmAiAction.mockRejectedValue({ response: { data: { message: 'This action expired. Ask the assistant again.', data: { status: 'expired' } } } });
  render(<AiActionBlock block={block} />);
  fireEvent.click(screen.getByRole('button', { name: /Confirm & send/ }));
  expect(await screen.findByText('Expired')).toBeInTheDocument();
});

test('a reopened conversation shows the saved outcome', () => {
  render(<AiActionBlock block={{ ...block, state: { status: 'failed', message: 'SMTP auth failed' } }} />);
  expect(screen.getByText('Not sent')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Confirm/ })).not.toBeInTheDocument();
});
