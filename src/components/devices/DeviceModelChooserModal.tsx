import React, { useState, useEffect } from 'react';
import { Button , Input } from '../ui';
import {
  Folder,
  Smartphone,
  Tablet,
  Watch,
  Laptop,
  Layers,
  Search,
  Settings,
  X,
  Check,
} from 'lucide-react';
import { usePriceCatalog } from '../../hooks/usePriceCatalog';
import { getModelFolderId } from '../../types/priceCatalog';

interface DeviceModelChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDevice?: string;
  onSelectDevice: (modelName: string) => void;
  onOpenSettings?: () => void;
  embedded?: boolean;
}

export const DeviceModelChooserModal: React.FC<DeviceModelChooserModalProps> = ({
  isOpen,
  onClose,
  selectedDevice = '',
  onSelectDevice,
  onOpenSettings,
  embedded = false,
}) => {
  const { catalog, folders } = usePriceCatalog();
  const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
  const [activeFamilyTab, setActiveFamilyTab] = useState<'All' | 'iPhone' | 'iPad' | 'Apple Watch' | 'Mac' | 'Other'>('All');

  // ESC closes the device chooser (embedded mode stays inert).
  useEffect(() => {
    if (!isOpen || embedded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, embedded, onClose]);

  if (!isOpen) return null;

  // Filter enabled folders only
  const enabledFolders = folders.filter((f) => f.enabled);

  const chooserContent = (
      <div className={`bg-white ${embedded ? 'h-full w-full' : 'w-full max-w-3xl max-h-[82vh] rounded-2xl border border-line shadow-2xl'} flex flex-col overflow-hidden`}>
        {/* Modal Header */}
        <div className="px-3.5 py-3 border-b border-line flex items-center justify-between bg-surface/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
              <Folder className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-sm text-ink truncate">Select Device Model</h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenSettings && (
              <Button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-line text-brand font-extrabold text-xs border border-line transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Folder Settings</span>
              </Button>
            )}
            <Button
              onClick={onClose}
              className="w-8 h-8 rounded-full text-muted hover:text-ink hover:bg-surface transition-colors cursor-pointer flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Folder Family Tabs & Search Bar Header */}
        <div className="p-3 border-b border-line bg-white space-y-2.5">
          {/* Family Folder Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs no-scrollbar">
            {[
              { key: 'All', label: 'All Folders', icon: Folder },
              { key: 'iPhone', label: 'iPhone', icon: Smartphone },
              { key: 'iPad', label: 'iPad', icon: Tablet },
              { key: 'Apple Watch', label: 'Apple Watch', icon: Watch },
              { key: 'Mac', label: 'Mac', icon: Laptop },
              { key: 'Other', label: 'Other', icon: Layers },
            ].map((fam) => {
              const IconComp = fam.icon;
              const isActive = activeFamilyTab === fam.key;
              const famFolderIds = new Set(
                enabledFolders
                  .filter((f) => fam.key === 'All' || f.family === fam.key)
                  .map((f) => f.id)
              );
              const count = catalog.filter((m) => famFolderIds.has(getModelFolderId(m.model))).length;

              return (
                <Button
                  key={fam.key}
                  type="button"
                  onClick={() => { if (count > 0 || fam.key === 'All') setActiveFamilyTab(fam.key as any); }}
                  disabled={count === 0 && fam.key !== 'All'}
                  title={count === 0 && fam.key !== 'All' ? 'No models available yet' : undefined}
                  aria-disabled={count === 0 && fam.key !== 'All'}
                  className={`px-2.5 py-1.5 text-xs font-extrabold rounded-lg transition-all flex items-center gap-1.5 shrink-0 border select-none active:scale-95 ${
                    isActive
                      ? 'bg-brand text-white border-brand shadow-xs'
                      : count === 0 && fam.key !== 'All'
                      ? 'bg-surface text-muted border-line cursor-not-allowed'
                      : 'bg-white hover:bg-surface text-faint hover:text-ink border-line'
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                  <span>{fam.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-line text-ink'
                    }`}
                  >
                    {count}
                  </span>
                </Button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              type="text"
              placeholder="Type model name (e.g. 15 Pro, M2, Series 9)..."
              value={deviceSearchQuery}
              onChange={(e) => setDeviceSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface border border-line rounded-lg text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
            {deviceSearchQuery && (
              <Button
                type="button"
                onClick={() => setDeviceSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-muted hover:text-ink"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Folder / Model Grid Container */}
        <div className={`min-h-0 overflow-y-auto space-y-4 p-3.5 ${embedded ? 'flex-1' : 'max-h-[58vh]'}`}>
          {(() => {
            const visibleFolders = enabledFolders.filter((f) => {
              if (activeFamilyTab !== 'All' && f.family !== activeFamilyTab) return false;
              return true;
            });

            let renderedFolderCount = 0;

            const folderBlocks = visibleFolders.map((folder) => {
              const modelsInFolder = catalog.filter((item) => getModelFolderId(item.model) === folder.id);
              const filteredModels = modelsInFolder.filter((m) =>
                m.model.toLowerCase().includes(deviceSearchQuery.toLowerCase())
              );

              if (filteredModels.length === 0) return null;
              renderedFolderCount++;

              return (
                <div key={folder.id}>
                  {/* Series text header (plain) */}
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted pb-1 pt-2 first:pt-0">
                    {folder.name}
                  </p>

                  {/* Model names — plain text, 3 columns (Ko Hein) */}
                  <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredModels.map((item) => {
                      const isSelected = selectedDevice === item.model;
                      return (
                        <button
                          key={item.model}
                          type="button"
                          onClick={() => {
                            onSelectDevice(item.model);
                            onClose();
                          }}
                          className={`flex w-full items-center justify-between gap-2 border-b border-line/60 py-2 pl-1 text-left text-sm transition-colors cursor-pointer focus:outline-none ${
                            isSelected ? 'font-extrabold text-brand' : 'font-semibold text-ink hover:text-brand'
                          }`}
                        >
                          <span className="truncate">{item.model}</span>
                          {isSelected && <Check className="h-4 w-4 shrink-0 text-brand stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            });

            if (renderedFolderCount === 0) {
              return (
                <div className="py-12 text-center text-muted space-y-2">
                  <Folder className="w-10 h-10 mx-auto opacity-30 text-brand" />
                  <p className="font-extrabold text-sm text-ink">No matching device models found</p>
                  <p className="text-xs">
                    Try another search term or check folder visibility toggles in settings.
                  </p>
                </div>
              );
            }

            return folderBlocks;
          })()}
        </div>

        {/* Modal Footer */}
        <div className="px-3.5 py-2 bg-surface border-t border-line flex items-center justify-between text-xs">
          <span className="font-bold text-muted">
            Selected: <span className="text-brand font-black">{selectedDevice || 'None'}</span>
          </span>
          <span className="text-xs text-muted font-medium">{enabledFolders.length} folders available</span>
        </div>
      </div>
  );

  if (embedded) return chooserContent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-xs sm:p-5 animate-fadeIn">
      {chooserContent}
    </div>
  );
};
