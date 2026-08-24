import React, { useState } from 'react';
import {CircleDot,
  LayoutDashboard,
  ClipboardList,
  Boxes,
  Truck,
  CreditCard,
  Users,
  X,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Tag,
  Settings,
  PhoneCall,
  DollarSign,
  Trello, ClipboardCheck, Stethoscope} from 'lucide-react';
import { WorkOrder, SystemSettings, AppUser } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Button, Badge } from './ui';
import { isModuleEnabled } from '../lib/modules';

// audit A-P2: version derives from the build env (VITE_APP_VERSION) with a
// hardcoded fallback — was a literal that drifted from the real build.
const APP_VERSION = (import.meta.env as Record<string, string | undefined>).VITE_APP_VERSION || 'v2.4.0';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  workOrders: WorkOrder[];
  systemSettings?: SystemSettings;
  currentUser?: AppUser;
  users?: AppUser[];
  onLogout?: () => void;
  onOpenUserManagement?: () => void;
  onOpenNewWorkOrder: () => void;
  onOpenRecycleBin?: () => void;
  /** Real low-stock count computed in App from parts (qty <= reorderPoint). */
  lowStockCount?: number;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean | ((prev: boolean) => boolean)) => void;
  /** iPad: sidebar behaves like the mobile drawer (hidden by default, hamburger opens it). */
  isIpad?: boolean;
  /** audit A-P2: real connectivity so the footer pill isn't always green. */
  isOnline?: boolean;
  /** Module ids to hide from the sidebar (Settings > Modules & Visibility, Ko Hein 2026-08-14). */
  disabledModules?: string[];
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  workOrders,
  systemSettings,
  currentUser,
  lowStockCount = 0,
  onOpenNewWorkOrder,
  onOpenRecycleBin,
  isCollapsed,
  setIsCollapsed,
  isMobileMenuOpen: externalMobileMenuOpen,
  setIsMobileMenuOpen: externalSetIsMobileMenuOpen,
  isIpad = false,
  isOnline = true,
  disabledModules = [],
}) => {
  const { t } = useLanguage();
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false);
  const isMobileMenuOpen = externalMobileMenuOpen !== undefined ? externalMobileMenuOpen : internalMobileMenuOpen;
  const setIsMobileMenuOpen = externalSetIsMobileMenuOpen || setInternalMobileMenuOpen;

  // Audit E-P3: default to the LEAST privileged role when currentUser is
  // missing — never fall back to Admin (latent privilege escalation if the
  // shell ever renders before auth resolves).
  const role = currentUser?.role || 'Reception';
  const isTech = role === 'Technician';
  const techName = currentUser?.technicianName || currentUser?.name || '';
  const myWorkOrders = isTech
    ? workOrders.filter(
        (w) =>
          (currentUser?.technicianId && w.assignedTechId === currentUser.technicianId) ||
          (techName && w.assignedTechName?.toLowerCase() === techName.toLowerCase()) ||
          (techName && (w as any).assignedTechnician?.toLowerCase() === techName.toLowerCase())
      )
    : workOrders;

  // Sidebar counts — only POS keeps a badge (decluttered sidebar).
  // Keep this in sync with the POS "Ready to Checkout" queue: unpaid tickets
  // that can actually be opened in checkout.
  const posReadyCount = myWorkOrders.filter((w) => {
    if (w.isPaid) return false;
    if (w.status !== 'Finished' && w.status !== 'Taken Out' && w.status !== 'Cant Repair' && w.status !== 'Customer Not Repair') return false;
    return Boolean(w.postRepairChecklist) || w.status === 'Cant Repair' || w.status === 'Customer Not Repair';
  }).length;

  // Sidebar count badges (Ko Hein 2026-08-11): show pending-work counts so the
  // shop sees at a glance what needs attention.
  // QA: Finished/Taken Out devices still missing the 21-point QA checklist.
  const qaPendingCount = myWorkOrders.filter((w) => {
    if (w.isArchived || w.isPaid) return false;
    if (w.status !== 'Finished' && w.status !== 'Taken Out') return false;
    return !w.postRepairChecklist;
  }).length;
  // Finance: inventory-fund tickets awaiting settlement (parts used from stock).
  const financePendingCount = myWorkOrders.filter(
    (w) => !w.isArchived && w.inventoryConsumptionAmount && w.inventorySettlementStatus !== 'settled'
  ).length;
  // Follow-up: completed tickets past due for a follow-up call.
  const followUpPendingCount = myWorkOrders.filter((w) => {
    if (w.isArchived) return false;
    if (w.status !== 'Finished' && w.status !== 'Taken Out') return false;
    return Boolean(w.followUpStatus) && w.followUpStatus !== 'Satisfied';
  }).length;

  const allNavGroups = [
    {
      title: t('navRepair'),
      items: [
        {
          id: 'intake',
          label: t('navIntake'),
          icon: ClipboardList,
        },
        {
          id: 'simple-ticket',
          label: t('navSimpleTicket'),
          icon: ClipboardCheck,
        },
        {
          id: 'trello',
          label: t('navTicketBoard'),
          icon: Trello,
        },
        {
          id: 'qa',
          label: t('navQa'),
          icon: Stethoscope,
          badge: qaPendingCount > 0 ? qaPendingCount : undefined,
          badgeColor: 'bg-warning text-white',
        },
        {
          id: 'follow-up',
          label: t('navFollowUp'),
          icon: PhoneCall,
          badge: followUpPendingCount > 0 ? followUpPendingCount : undefined,
          badgeColor: 'bg-purple text-white',
        },
      ],
    },
    {
      title: t('navFinance'),
      items: [
        {
          id: 'pos',
          label: t('navPos'),
          icon: CreditCard,
          badge: posReadyCount > 0 ? posReadyCount : undefined,
          badgeColor: 'bg-success text-white',
        },
        {
          id: 'finance',
          label: t('navFinance'),
          icon: DollarSign,
          badge: financePendingCount > 0 ? financePendingCount : undefined,
          badgeColor: 'bg-warning text-white',
        },
        {
          id: 'price-catalog',
          label: t('navPriceList'),
          icon: Tag,
        },
      ],
    },
    {
      title: t('navInventory'),
      items: [
        {
          id: 'inventory',
          label: t('navPartsMatrix'),
          icon: Boxes,
          badge: lowStockCount && lowStockCount > 0 ? lowStockCount : undefined,
          badgeColor: 'bg-danger text-white',
        },
        {
          id: 'suppliers',
          label: t('navSuppliers'),
          icon: Truck,
        },
      ],
    },
    {
      title: t('navPeople'),
      items: [
        {
          id: 'crm',
          label: t('navCrm'),
          icon: Users,
        },
      ],
    },
    {
      title: t('navSettings'),
      items: [
        {
          id: 'settings',
          label: t('navSettings'),
          icon: Settings,
        },
      ],
    },
    {
      title: t('navMore'),
      items: [
        {
          id: 'mermaid',
          label: t('navMermaid'),
          icon: Tag,
        },
      ],
    },
  ];

  // Module visibility (Ko Hein 2026-08-14): hide sidebar entries the shop
  // disabled in Settings > Modules & Visibility. Dashboard/Settings/Intake
  // button are always kept.
  const navGroups = allNavGroups
    .map((group) => {
      const filteredItems = group.items.filter((item) => {
        if (!isModuleEnabled(disabledModules, item.id)) return false;
        if (role === 'Admin') return true;
        if (role === 'Reception') {
          // Reception can use everything EXCEPT system settings
          if (item.id === 'settings') return currentUser?.permissions?.canAccessSettings === true;
          return true;
        }
        if (role === 'Technician') {
          // Technician can see Pipeline (assigned only), QA, CRM, and Price List.
          const allowedTechItems = ['pipeline', 'trello', 'qa', 'crm', 'price-catalog'];
          if (allowedTechItems.includes(item.id)) return true;
          if (item.id === 'finance') return currentUser?.permissions?.canAccessFinance === true;
          if (item.id === 'settings') return currentUser?.permissions?.canAccessSettings === true;
          return false;
        }
        return true;
      });
      return { ...group, items: filteredItems };
    })
    .filter((group) => group.items.length > 0);



  // Mobile drawer should always render in expanded (not mini-collapsed) mode.
  const effectiveCollapsed = isCollapsed && !isMobileMenuOpen;

  const handleTabSelect = (tabId: string) => {
    if (tabId === 'recycle-bin') {
      onOpenRecycleBin?.();
      setIsMobileMenuOpen(false);
      return;
    }
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  // audit A-P3: one shared collapsed-mode sizing string for the Intake
  // button and the nav items (was three hand-tuned centering variants).
  const collapsedNavBtn = 'h-10 w-10 mx-auto justify-center p-0 rounded-xl';

  const navButtonBase = (isActive: boolean) => `
    group w-full border transition-all duration-200
    ${effectiveCollapsed ? `${collapsedNavBtn} relative` : 'h-11 lg:h-10 justify-between px-2.5 rounded-xl'}
    ${
      isActive
        ? 'bg-brand-soft text-brand-deep font-bold border-transparent'
        : 'border-transparent text-ink hover:text-ink hover:bg-surface'
    }
  `;

  const navIconClass = (isActive: boolean) => `
    flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-transparent transition-colors
    ${isActive ? 'text-brand' : 'text-muted group-hover:text-brand'}
  `;

  return (
    <>
      {/* Backdrop overlay for mobile menu drawer */}
      {isMobileMenuOpen && (
        <div 
          className={`fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 ${isIpad ? '' : 'lg:hidden'} transition-opacity duration-300`}
          onClick={() => setIsMobileMenuOpen(false)}
          role="presentation"
          aria-hidden="true"
        />
      )}

      {/* Main Left Sidebar Navigation */}
      <aside className={`
        app-sidebar fixed top-0 left-0 z-50 h-full h-dvh shrink-0
        bg-white border-r border-line
        flex flex-col justify-between
        transition-all duration-300 ease-in-out select-none
        ${isMobileMenuOpen ? 'translate-x-0 w-[280px] max-w-[85vw]' : isIpad ? '-translate-x-full' : '-translate-x-full lg:translate-x-0'}
        ${effectiveCollapsed ? 'lg:w-14' : 'lg:w-64'}
        ${!effectiveCollapsed ? 'lg:shadow-xl lg:shadow-ink/10' : ''}
      `}>
        {/* Sidebar Header & Toggle */}
        <div className="p-2.5 border-b border-line flex flex-col gap-2">
          {effectiveCollapsed ? (
            /* Collapsed Header: Centered Logo + Expand Toggle Stacked */
            <div className="flex flex-col items-center justify-center space-y-2 py-1">
              <Button
                onClick={() => handleTabSelect('dashboard')}
                variant="outline"
                size="icon"
                className="p-0.5 shadow-2xs hover:border-brand overflow-hidden shrink-0"
                title={systemSettings?.shopName || 'AppleRepair Pro'}
              >
                {systemSettings?.shopLogoUrl ? (
                  <img src={systemSettings.shopLogoUrl} alt="Shop Logo" className="logo-chip w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full rounded-lg bg-brand flex items-center justify-center text-white shrink-0">
                    <CircleDot className="w-5 h-5" />
                  </div>
                )}
              </Button>
              <Button
                onClick={() => setIsCollapsed(false)}
                variant="iconGhost"
                size="icon"
                className="hidden lg:flex border-0 bg-transparent text-muted hover:bg-surface hover:text-ink shadow-none"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            /* Expanded Header: Logo + Title + Collapse Toggle */
            <div className="flex items-center justify-between">
              <div 
                className="flex items-center space-x-2.5 cursor-pointer overflow-hidden"
                onClick={() => handleTabSelect('dashboard')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTabSelect('dashboard'); }
                }}
              >
                {systemSettings?.shopLogoUrl ? (
                  <img 
                    src={systemSettings.shopLogoUrl} 
                    alt="Shop Logo" 
                    className="logo-chip w-9 h-9 rounded-xl object-contain bg-white border border-line p-0.5 shrink-0" 
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-white shrink-0">
                    <CircleDot className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center space-x-1">
                    <span className="font-extrabold text-sm tracking-tight text-ink truncate">
                      {systemSettings?.shopName || 'i35 ERP'}
                    </span>
                  </div>
                  <p className="text-xs text-muted truncate font-medium">Repair operations</p>
                </div>
              </div>

              {/* Close / Collapse Toggle Button */}
              <div className="flex items-center space-x-1">
                <Button
                  type="button"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  variant="ghost"
                  size="icon"
                  className="hidden lg:flex p-1.5 text-muted hover:text-ink hover:bg-surface rounded-lg"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  variant="ghost"
                  size="icon"
                  className={`${isIpad ? '' : 'lg:hidden'} p-2 text-muted hover:text-ink rounded-xl`}
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
            </div>
          )}

          {/* Close / Collapse Toggle Button */}
        </div>

        {/* Navigation List */}
        <nav aria-label="Sidebar Navigation" className="flex-1 overflow-y-auto p-2 space-y-3 text-xs touch-pan-y overscroll-y-contain scrollbar-thin scrollbar-thumb-line">
          {/* Dashboard is the landing view — the sidebar logo already navigates
              there, so a separate "Dashboard Overview" entry is redundant. */}
          <div className="pb-2 border-b border-line/80">
            {/* New Intake Ticket — primary action (hidden when the Intake module
                is disabled in Settings > Modules & Visibility, Ko Hein 2026-08-14) */}
            {isModuleEnabled(disabledModules, 'intake') && (
            <Button
              type="button"
              onClick={() => {
                onOpenNewWorkOrder?.();
                setIsMobileMenuOpen(false);
              }}
              aria-current={activeTab === 'create-ticket' ? 'page' : undefined}
              variant="default"
              size="sm"
              title="New Intake Ticket"
              className={`w-full mt-1.5 h-10 rounded-xl font-bold shadow-sm ${
                effectiveCollapsed ? collapsedNavBtn : 'justify-center px-3.5'
              } ${activeTab === 'create-ticket' ? 'bg-brand-deep' : 'hover:bg-brand-deep'}`}
            >
              <div className="flex items-center justify-center min-w-0 gap-2">
                <Plus className={`${effectiveCollapsed ? '!w-5 !h-5' : 'w-4 h-4'} shrink-0`} />
                {!effectiveCollapsed && <span className="truncate text-xs">Intake Ticket</span>}
              </div>
            </Button>
            )}

            {/* Dashboard — landing view shortcut (logo also navigates here) */}
            <Button
              type="button"
              onClick={() => handleTabSelect('dashboard')}
              aria-current={activeTab === 'dashboard' ? 'page' : undefined}
              variant="outline"
              size="sm"
              title="Dashboard"
              className={`${navButtonBase(activeTab === 'dashboard')} mt-1.5`}
            >
              <div className="flex items-center justify-center min-w-0">
                <span className={navIconClass(activeTab === 'dashboard')}>
                  <LayoutDashboard className="h-4 w-4" />
                </span>
                {!effectiveCollapsed && <span className="truncate text-xs ml-2.5">{t('navDashboard')}</span>}
              </div>
            </Button>
          </div>

          {/* Grouped Sub-Menus with detail lines — audit A-P3: in collapsed
              mode hide the group border too (it floated label-less under every
              icon group). */}
          {navGroups.map((group) => (
            <div key={group.title} className={`space-y-1 ${effectiveCollapsed ? '' : 'pb-2 border-b border-line/60 last:border-b-0'}`}>
              {!effectiveCollapsed && (
                <div className="px-3 py-1 text-xs font-extrabold text-muted tracking-wider flex items-center justify-between">
                  <span>{group.title}</span>
                  <span className="hidden sm:block w-8 h-[1px] bg-line" />
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = activeTab === item.id || (item.id === 'intake' && activeTab === 'create-ticket');

                  return (
                    <Button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabSelect(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      variant="outline"
                      size="sm"
                      className={navButtonBase(isActive)}
                      title={item.badge !== undefined && (typeof item.badge === 'string' || item.badge > 0) ? `${item.label} (${item.badge})` : item.label}
                      aria-label={item.badge !== undefined && (typeof item.badge === 'string' || item.badge > 0) ? `${item.label} (${item.badge} pending)` : item.label}
                    >
                      <div className={`flex items-center min-w-0 ${effectiveCollapsed ? 'justify-center' : 'flex-1'}`}>
                        <span className={navIconClass(isActive)}>
                          <ItemIcon className="h-4 w-4" />
                        </span>
                        {!effectiveCollapsed && <span className="truncate text-xs ml-2.5">{item.label}</span>}
                      </div>

                      {item.badge !== undefined && (typeof item.badge === 'string' || item.badge > 0) && (
                        <Badge className={`text-xs py-0.5 px-2 shrink-0 ${item.badgeColor || 'bg-brand text-white'} ${effectiveCollapsed ? 'absolute -top-1.5 -right-1.5 px-1 py-0.5 text-xs leading-none min-w-[18px] text-center border border-white shadow-2xs' : 'ml-2'}`}>
                          {effectiveCollapsed && typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-2.5 border-t border-line bg-surface pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
          {/* System Online Status Pill — audit A-P2: reflects real connectivity
              (was always green) and version from the build env. */}
          {!effectiveCollapsed && (
            <div className="pt-1 px-1 flex items-center justify-between text-xs text-muted">
              <span className="flex items-center space-x-1.5">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-success-deep' : 'bg-danger'}`} />
                <span className="font-medium">{isOnline ? 'System online' : 'Offline'}</span>
              </span>
              <span className="font-mono text-xs bg-line px-1.5 py-0.5 rounded-md text-ink">{APP_VERSION}</span>
            </div>
          )}
        </div>

      </aside>

    </>
  );
};
