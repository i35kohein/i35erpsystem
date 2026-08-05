import React from 'react';
import { RefreshCw, Sparkles, Type } from 'lucide-react';
import { Button } from '../../ui';
import type { SystemSettings } from '../../../types';

interface AiTabProps {
  formData: SystemSettings;
  setFormData: React.Dispatch<React.SetStateAction<SystemSettings>>;
  aiRescanning: boolean;
  aiRescanResult: string | null;
  onAiRescanTickets?: () => Promise<{ classified: number; failed: number }>;
  handleAiRescan: () => void;
}

const AI_MODEL_PRESETS: Record<string, { id: string; label: string }[]> = {
  openrouter: [
    { id: 'anthropic/claude-opus-5', label: 'Claude Opus 5 (flagship)' },
    { id: 'anthropic/claude-opus-4.8', label: 'Claude Opus 4.8' },
    { id: 'anthropic/claude-opus-4', label: 'Claude Opus 4' },
    { id: 'anthropic/claude-sonnet-5', label: 'Claude Sonnet 5' },
    { id: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5' },
    { id: 'deepseek/deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
    { id: 'deepseek/deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
  ],
  anthropic: [{ id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku (server default)' }],
  openai: [{ id: 'gpt-4o-mini', label: 'GPT-4o mini (server default)' }],
  gemini: [{ id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (server default)' }],
  deepseek: [{ id: 'deepseek-chat', label: 'DeepSeek Chat (server default)' }],
  groq: [{ id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (server default)' }],
};

const AiTab: React.FC<AiTabProps> = ({ formData, setFormData, aiRescanning, aiRescanResult, onAiRescanTickets, handleAiRescan }) => {
  return (
        <div className="bg-white p-6 rounded-2xl border border-line-strong shadow-2xs space-y-5">
          <div className="pb-4 border-b border-line">
            <h3 className="text-base font-extrabold text-ink flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-brand" />
              <span>ERP AI Assistant & API Provider</span>
            </h3>
            <p className="text-xs text-muted mt-1">
              Connect a mainstream model or any OpenAI-compatible endpoint. Local Analysis works without an API key.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5 text-xs font-bold text-ink">
              <span>Provider</span>
              <select
                value={formData.aiProvider || 'local'}
                onChange={(event) => {
                  const aiProvider = event.target.value as SystemSettings['aiProvider'];
                  setFormData({ ...formData, aiProvider, aiApiKey: aiProvider === 'deepseek' ? '' : formData.aiApiKey });
                }}
                className="w-full p-2.5 border border-line rounded-xl bg-white"
              >
                <option value="local">Local Analysis (No API)</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="gemini">Google Gemini</option>
                <option value="deepseek">DeepSeek</option>
                <option value="groq">Groq</option>
                <option value="openrouter">OpenRouter</option>
                <option value="custom">Custom OpenAI-Compatible API</option>
              </select>
            </label>

            <label className="space-y-1.5 text-xs font-bold text-ink">
              <span>Model</span>
              <input
                list="ai-model-presets"
                value={formData.aiModel || ''}
                onChange={(event) => setFormData({ ...formData, aiModel: event.target.value })}
                placeholder={
                  formData.aiProvider === 'deepseek'
                    ? 'deepseek-chat (default)'
                    : formData.aiProvider === 'openrouter'
                      ? 'e.g. anthropic/claude-opus-5'
                      : 'Leave blank for provider default'
                }
                className="w-full p-2.5 border border-line rounded-xl bg-white"
              />
              <datalist id="ai-model-presets">
                {(AI_MODEL_PRESETS[formData.aiProvider] || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </datalist>
              {(AI_MODEL_PRESETS[formData.aiProvider] || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(AI_MODEL_PRESETS[formData.aiProvider] || []).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, aiModel: m.id })}
                      title={m.id}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                        formData.aiModel === m.id
                          ? 'bg-brand text-white border-brand'
                          : 'bg-surface text-[#51525C] border-line hover:border-brand hover:text-brand'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </label>

            {formData.aiProvider === 'deepseek' ? (
              <div className="space-y-1.5 text-xs font-bold text-ink">
                <span>DeepSeek API Key</span>
                <div className="min-h-[42px] px-3 py-2.5 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-xl flex items-center">
                  Server environment key in use — no browser key required.
                </div>
              </div>
            ) : (
              <label className="space-y-1.5 text-xs font-bold text-ink">
                <span>API Key</span>
                <input
                  type="password"
                  value={formData.aiApiKey || ''}
                  onChange={(event) => setFormData({ ...formData, aiApiKey: event.target.value })}
                  placeholder={formData.aiProvider === 'local' ? 'Not required for Local Analysis' : 'Provider API key'}
                  disabled={formData.aiProvider === 'local'}
                  autoComplete="off"
                  className="w-full p-2.5 border border-line rounded-xl bg-white disabled:opacity-50"
                />
              </label>
            )}

            <label className="space-y-1.5 text-xs font-bold text-ink">
              <span>Custom Base URL</span>
              <input
                value={formData.aiBaseUrl || ''}
                onChange={(event) => setFormData({ ...formData, aiBaseUrl: event.target.value })}
                placeholder="https://your-api.example.com/v1"
                className="w-full p-2.5 border border-line rounded-xl bg-white"
              />
            </label>
          </div>

          {/* AI Repair-Type Classification — re-scan finished tickets */}
          <div className="p-4 rounded-xl border border-brand/20 bg-gradient-to-br from-brand-soft/50 to-brand-soft/20 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-extrabold text-ink flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand" />
                  AI Repair-Type Classification
                </p>
                <p className="text-[11px] text-muted">
                  Finished tickets are auto-classified as Spareparts Change or Hardware Repair. Re-scan applies AI to every finished ticket without a verdict (including previously failed ones).
                </p>
              </div>
              <Button
                type="button"
                onClick={handleAiRescan}
                disabled={aiRescanning || !onAiRescanTickets}
                className="bg-brand hover:bg-brand-deep disabled:opacity-50 text-white shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${aiRescanning ? 'animate-spin' : ''}`} />
                <span>{aiRescanning ? 'Classifying…' : 'Re-scan Finished Tickets with AI'}</span>
              </Button>
            </div>
            {aiRescanResult && (
              <p className="text-[11px] font-bold text-brand bg-white/80 border border-brand/20 rounded-lg px-3 py-2">
                {aiRescanResult}
              </p>
            )}
          </div>

          <label className="block space-y-1.5 text-xs font-bold text-ink">
            <span>Assistant Instructions</span>
            <textarea
              rows={3}
              value={formData.aiSystemPrompt || ''}
              onChange={(event) => setFormData({ ...formData, aiSystemPrompt: event.target.value })}
              className="w-full p-2.5 border border-line rounded-xl bg-white resize-y"
            />
          </label>

          <div className="p-3 bg-surface border border-line rounded-xl text-[11px] text-muted">
            The assistant sends a compact live operational summary to the selected provider. API credentials are used only for requests initiated from this ERP assistant. For shared production use, keep keys in server-side secrets instead of browser-synced settings.
          </div>
        </div>
  );
};

export default AiTab;
