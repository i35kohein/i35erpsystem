import React, { useState } from 'react';
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

  if (!isOpen) return null;

  // Filter enabled folders only
  const enabledFolders = folders.filter((f) => f.enabled);

  const chooserContent = (
      <div className={`bg-white ${embedded ? 'h-full w-full' : 'w-full max-w-3xl max-h-[82vh] rounded-2xl border border-[#E5E5EA] shadow-2xl'} flex flex-col overflow-hidden`}>
        {/* Modal Header */}
        <div className="px-3.5 py-3 border-b border-[#E5E5EA] flex items-center justify-between bg-[#F5F5F7]/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#0071E3] text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
              <Folder className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-sm text-[#1D1D1F] truncate">Select Device Model</h2>
              <p className="text-[10px] text-[#86868B] truncate">Choose a model for this repair ticket</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#E5E5EA] text-[#0071E3] font-extrabold text-[11px] border border-[#E5E5EA] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Folder Settings</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-[#E5E5EA] hover:bg-[#D1D1D6] text-[#1D1D1F] transition-all cursor-pointer flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Folder Family Tabs & Search Bar Header */}
        <div className="p-3 border-b border-[#E5E5EA] bg-white space-y-2.5">
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
                <button
                  key={fam.key}
                  type="button"
                  onClick={() => setActiveFamilyTab(fam.key as any)}
                  className={`px-2.5 py-1.5 text-[11px] font-extrabold rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border select-none active:scale-95 ${
                    isActive
                      ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                  <span>{fam.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#E5E5EA] text-[#1D1D1F]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
            <input
              type="text"
              placeholder="Type model name (e.g. 15 Pro, M2, Series 9)..."
              value={deviceSearchQuery}
              onChange={(e) => setDeviceSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg text-[11px] font-bold text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
            />
            {deviceSearchQuery && (
              <button
                type="button"
                onClick={() => setDeviceSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-[#86868B] hover:text-[#1D1D1F]"
              >
                Clear
              </button>
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
                <div key={folder.id} className="space-y-2">
                  {/* Folder Header */}
                  <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2">
                    <div className="flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-[#0071E3]" />
                      <h3 className="text-[11px] font-black uppercase tracking-wider text-[#1D1D1F]">
                        {folder.name}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#86868B] border border-[#E5E5EA]">
                        {filteredModels.length}
                      </span>
                    </div>
                  </div>

                  {/* Folder Models Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {filteredModels.map((item) => {
                      const isSelected = selectedDevice === item.model;
                      const activeServiceCount = Object.values(item.prices).filter((p) => p !== null).length;

                      return (
                        <button
                          key={item.model}
                          type="button"
                          onClick={() => {
                            onSelectDevice(item.model);
                            onClose();
                          }}
                            className={`p-2.5 rounded-lg text-[11px] font-extrabold flex items-center justify-between border transition-all cursor-pointer text-left ${
                            isSelected
                              ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                              : 'bg-[#F5F5F7] text-[#1D1D1F] border-[#E5E5EA] hover:border-[#0071E3] hover:text-[#0071E3]'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="truncate block">{item.model}</span>
                            <span
                              className={`text-[9px] font-bold block mt-0.5 ${
                                isSelected ? 'text-white/80' : 'text-[#86868B]'
                              }`}
                            >
                              {activeServiceCount} services priced
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 shrink-0 text-white stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            });

            if (renderedFolderCount === 0) {
              return (
                <div className="py-12 text-center text-[#86868B] space-y-2">
                  <Folder className="w-10 h-10 mx-auto opacity-30 text-[#0071E3]" />
                  <p className="font-extrabold text-sm text-[#1D1D1F]">No matching device models found</p>
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
        <div className="px-3.5 py-2 bg-[#F5F5F7] border-t border-[#E5E5EA] flex items-center justify-between text-[11px]">
          <span className="font-bold text-[#86868B]">
            Selected: <span className="text-[#0071E3] font-black">{selectedDevice || 'None'}</span>
          </span>
          <span className="text-[10px] text-[#86868B] font-medium">{enabledFolders.length} folders available</span>
        </div>
      </div>
  );

  if (embedded) return chooserContent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs sm:p-5 animate-fadeIn">
      {chooserContent}
    </div>
  );
};
