import React, { useEffect, useMemo, useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiExternalLink, FiEye, FiEyeOff, FiKey, FiLoader } from 'react-icons/fi';
import AiSettingsModal from './AiSettingsModal';
import { EFFORT_HELP, providerStyle } from './aiProviderMeta';
import { createAiConnection, testAiConnection, testSavedAiConnection, updateAiConnection } from '../../../utils/ai-api';

const CUSTOM_MODEL = '__custom__';

export function ProviderMark({ provider, size = 'h-9 w-9 text-[14px]' }) {
  const s = providerStyle(provider);
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-lg font-bold ring-1 ${size} ${s.className}`}>
      {s.initials}
    </span>
  );
}

const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;

/**
 * Add or edit one AI connection (provider + key + model + effort).
 * In edit mode the key is optional (kept when empty) unless the provider changes.
 */
export default function AiConnectionDialog({ open, mode = 'add', connection = null, providers, efforts, onClose, onSaved }) {
  const isEdit = mode === 'edit' && connection;
  const [provider, setProvider] = useState('anthropic');
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState(false);
  const [effort, setEffort] = useState('medium');
  const [enabled, setEnabled] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const info = useMemo(() => providers.find((p) => p.id === provider) || null, [providers, provider]);

  // Reset the form every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    const start = isEdit ? connection.provider : providers[0]?.id || 'anthropic';
    const startInfo = providers.find((p) => p.id === start);
    const startModel = isEdit ? connection.model : startInfo?.defaultModel || '';
    setProvider(start);
    setLabel(isEdit ? connection.label || '' : '');
    setApiKey('');
    setShowKey(false);
    setModel(startModel);
    setCustomModel(Boolean(startInfo) && !startInfo.models.some((m) => m.id === startModel));
    setEffort(isEdit ? connection.effort : 'medium');
    setEnabled(isEdit ? connection.enabled : true);
    setTestResult(null);
    setError('');
  }, [open, isEdit, connection, providers]);

  const providerChanged = isEdit && provider !== connection.provider;
  const keyRequired = !isEdit || providerChanged;
  const usingSavedKey = isEdit && !providerChanged && !apiKey.trim();
  const modelChanged = isEdit && model.trim() !== connection.model;

  const chooseProvider = (id) => {
    if (id === provider) return;
    const next = providers.find((p) => p.id === id);
    const backToSaved = isEdit && id === connection.provider;
    const nextModel = backToSaved ? connection.model : next?.defaultModel || '';
    setProvider(id);
    setModel(nextModel);
    setCustomModel(Boolean(next) && !next.models.some((m) => m.id === nextModel));
    setApiKey('');
    setTestResult(null);
    setError('');
  };

  const canTest = !testing && model.trim() && (apiKey.trim() || (usingSavedKey && !modelChanged));

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = usingSavedKey
        ? await testSavedAiConnection(connection.id)
        : await testAiConnection({ provider, apiKey: apiKey.trim(), model: model.trim(), effort });
      setTestResult({ ok: result?.ok, message: result?.message });
    } catch (err) {
      setTestResult({ ok: false, message: errorMessage(err, 'Could not test the connection.') });
    } finally {
      setTesting(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (keyRequired && !apiKey.trim()) {
      setError(providerChanged ? `Enter a ${info?.label} API key — the saved key belongs to a different provider.` : 'Enter the API key.');
      return;
    }
    if (!model.trim()) {
      setError('Choose a model.');
      return;
    }
    setSaving(true);
    try {
      const payload = isEdit
        ? await updateAiConnection(connection.id, {
          label: label.trim(),
          ...(providerChanged ? { provider } : {}),
          model: model.trim(),
          effort,
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        })
        : await createAiConnection({ label: label.trim(), provider, model: model.trim(), effort, apiKey: apiKey.trim(), enabled });
      onSaved(payload, isEdit ? 'updated' : 'added');
    } catch (err) {
      setError(errorMessage(err, 'Could not save the connection.'));
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <>
      <div className="mr-auto flex min-h-[32px] items-center">
        {testResult && (
          <span role="status" className={`flex items-start gap-1.5 text-[12.5px] ${testResult.ok ? 'text-emerald-700' : 'text-red-600'}`}>
            {testResult.ok ? <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span className="max-w-[260px]">{testResult.message}</span>
          </span>
        )}
      </div>
      <button type="button" className="ui-btn ui-btn-secondary" onClick={runTest} disabled={!canTest || saving} title={modelChanged && usingSavedKey ? 'Save first to test the saved key with the new model' : undefined}>
        {testing ? <><FiLoader className="h-4 w-4 animate-spin" /> Testing…</> : 'Test connection'}
      </button>
      <button type="submit" form="ai-connection-form" className="ui-btn ui-btn-primary" disabled={saving || testing}>
        {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add connection'}
      </button>
    </>
  );

  return (
    <AiSettingsModal
      open={open}
      onClose={onClose}
      busy={saving}
      size="max-w-2xl"
      labelledBy="ai-connection-title"
      title={isEdit ? 'Edit AI connection' : 'Add AI connection'}
      subtitle="Each connection is one provider account (API key) and model."
      icon={<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><FiKey className="h-4 w-4" /></span>}
      footer={footer}
    >
      <form id="ai-connection-form" onSubmit={save} className="space-y-5">
        <fieldset>
          <legend className="ui-label">Provider</legend>
          <div role="radiogroup" aria-label="AI provider" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {providers.map((p) => {
              const active = p.id === provider;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => chooseProvider(p.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${active ? 'border-indigo-500 bg-indigo-50/60' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <ProviderMark provider={p.id} size="h-8 w-8 text-[13px]" />
                  <span className={`text-[12.5px] font-semibold ${active ? 'text-indigo-700' : 'text-slate-700'}`}>{p.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="ai-conn-label" className="ui-label">Name <span className="font-normal text-slate-400">(optional)</span></label>
            <input
              id="ai-conn-label"
              className="ui-input w-full"
              placeholder={`e.g. ${info?.label || 'Provider'} — office account`}
              maxLength={60}
              value={label}
              onChange={(e) => setLabel(e.target.value.replace(/[<>{}`]/g, ''))}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="ai-conn-key" className="ui-label">
              API key {!keyRequired && <span className="font-normal text-slate-400">(leave empty to keep {connection?.api_key_hint || 'the saved key'})</span>}
            </label>
            <div className="relative">
              <input
                id="ai-conn-key"
                type={showKey ? 'text' : 'password'}
                className="ui-input w-full pr-10 font-mono"
                placeholder={keyRequired ? info?.keyPlaceholder || '' : `${connection?.api_key_hint || '••••'} (saved)`}
                autoComplete="new-password"
                spellCheck={false}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
              </button>
            </div>
            <p className="ui-help flex flex-wrap items-center gap-1">
              {info?.keyHelp}
              {info?.keyUrl && (
                <a href={info.keyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-medium">
                  Get a key <FiExternalLink className="h-3 w-3" />
                </a>
              )}
              <span>Usage is billed to that account. The key is stored encrypted and never shown again.</span>
            </p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="ai-conn-model" className="ui-label">Model</label>
            <select
              id="ai-conn-model"
              className="ui-input w-full"
              value={customModel ? CUSTOM_MODEL : model}
              onChange={(e) => {
                setTestResult(null);
                if (e.target.value === CUSTOM_MODEL) {
                  setCustomModel(true);
                  setModel('');
                } else {
                  setCustomModel(false);
                  setModel(e.target.value);
                }
              }}
            >
              {(info?.models || []).map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
              <option value={CUSTOM_MODEL}>Other model ID…</option>
            </select>
            {customModel && (
              <input
                aria-label="Model ID"
                className="ui-input mt-2 w-full font-mono"
                placeholder="Exact model ID from the provider"
                value={model}
                maxLength={100}
                spellCheck={false}
                onChange={(e) => {
                  setTestResult(null);
                  setModel(e.target.value);
                }}
              />
            )}
          </div>

          <div>
            <label htmlFor="ai-conn-effort" className="ui-label">Reasoning effort</label>
            <select id="ai-conn-effort" className="ui-input w-full" value={effort} onChange={(e) => setEffort(e.target.value)}>
              {efforts.map((v) => (
                <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
              ))}
            </select>
            <p className="ui-help">{EFFORT_HELP[effort]}</p>
          </div>

          {!isEdit && (
            <div>
              <span className="ui-label">Status</span>
              <label className="flex h-[38px] items-center gap-2 text-[13px] text-slate-700">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                Use this connection (on)
              </label>
              <p className="ui-help">New connections are added at the bottom of the failover order.</p>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        )}
      </form>
    </AiSettingsModal>
  );
}
