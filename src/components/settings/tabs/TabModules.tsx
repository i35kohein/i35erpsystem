import React from 'react';
import { Blocks, Info, CheckCircle2 } from 'lucide-react';
import { MODULES, ALWAYS_ON_MODULE_IDS } from '../../../lib/modules';
import { SystemSettings } from '../../../types';
import { Button } from '../../ui';

interface TabModulesProps {
  formData: SystemSettings;
  setFormData: React.Dispatch<React.SetStateAction<SystemSettings>>;
}

const MODULE_ACCENT: Record<string, string> = {
  Repair: 'bg-brand-soft text-brand',
  Finance: 'bg-success/10 text-success-deep',
  Inventory: 'bg-purple/10 text-purple',
  Management: 'bg-warning/10 text-warning',
};

/** Simple toggle switch row (mirrors the pattern used in TabNotifications). */
const ToggleRow: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
  accent: string;
  locked?: boolean;
}> = ({ checked, onChange, label, description, accent, locked }) => (
  <div className="flex items-center justify-between gap-4 p-4 bg-surface rounded-xl border border-line hover:border-brand/40 transition-all">
    <div className="flex items-start space-x-3 min-w-0">
      <span className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-2xs ${accent}`}>
        <Blocks className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <div className="flex items-center space-x-2">
          <span className="font-extrabold text-xs text-ink">{label}</span>
          {locked && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-line text-muted uppercase tracking-wide shrink-0">
              Always on
            </span>
          )}
        </div>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        disabled={locked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div
        className={`w-11 h-6 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-line after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
          locked ? 'opacity-60 cursor-not-allowed' : 'peer-checked:bg-brand cursor-pointer'
        }`}
      />
    </label>
  </div>
);

const ModulesTab: React.FC<TabModulesProps> = ({ formData, setFormData }) => {
  const disabledModules = formData.disabledModules || [];

  const toggleModule = (id: string, enabled: boolean) => {
    const next = enabled
      ? disabledModules.filter((m) => m !== id)
      : [...disabledModules, id];
    setFormData({ ...formData, disabledModules: next });
  };

  const setAll = (enabled: boolean) => {
    const allIds = MODULES.map((m) => m.id);
    setFormData({
      ...formData,
      disabledModules: enabled ? [] : allIds,
    });
  };

  const groups = [...new Set(MODULES.map((m) => m.group))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-line shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-ink flex items-center space-x-2">
              <Blocks className="w-5 h-5 text-brand" />
              <span>Modules & Visibility</span>
            </h3>
            <p className="text-xs text-muted mt-1">
              Turn off modules your shop doesn't use. Hidden modules disappear from the sidebar — your data stays safe.
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <Button
              type="button"
              onClick={() => setAll(true)}
              variant="outline"
              size="sm"
              className="text-xs font-bold rounded-xl border-line hover:border-brand"
            >
              Enable All
            </Button>
            <Button
              type="button"
              onClick={() => setAll(false)}
              variant="outline"
              size="sm"
              className="text-xs font-bold rounded-xl border-line hover:border-danger"
            >
              Disable All
            </Button>
          </div>
        </div>

        <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-brand-soft/60 border border-brand/20">
          <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
          <p className="text-xs text-ink leading-relaxed">
            Dashboard, Settings and the Intake Ticket button are always available, so you can always get back here to re-enable a module.
          </p>
        </div>
      </div>

      {/* Module groups */}
      {groups.map((group) => {
        const groupModules = MODULES.filter((m) => m.group === group);
        const enabledCount = groupModules.filter((m) => !disabledModules.includes(m.id)).length;
        const accent = MODULE_ACCENT[group] || 'bg-brand-soft text-brand';
        return (
          <div key={group} className="bg-white p-5 rounded-2xl border border-line shadow-xs space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-extrabold uppercase tracking-wider text-muted">{group}</p>
              <span className="text-[11px] font-bold text-muted">
                {enabledCount} / {groupModules.length} enabled
              </span>
            </div>
            <div className="space-y-2.5">
              {groupModules.map((m) => {
                const enabled = !disabledModules.includes(m.id);
                const locked = ALWAYS_ON_MODULE_IDS.includes(m.id);
                return (
                  <ToggleRow
                    key={m.id}
                    checked={enabled}
                    locked={locked}
                    onChange={(v) => toggleModule(m.id, v)}
                    label={m.label}
                    description={m.description}
                    accent={accent}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Footer note */}
      <div className="flex items-center justify-center space-x-2 p-3 text-xs text-muted">
        <CheckCircle2 className="w-4 h-4 text-success" />
        <span>Changes apply after clicking "Save All Settings" in the top bar.</span>
      </div>
    </div>
  );
};

export default ModulesTab;
