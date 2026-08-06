import React, { useState } from 'react';
import {
  LogOut,
  CircleDot,
  LayoutDashboard,
  ClipboardList,
  Kanban,
  Boxes,
  Truck,
  CreditCard,
  Users,
  ShieldCheck,
  Menu,
  X,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Tag,
  Settings,
  PhoneCall,
  DollarSign
} from 'lucide-react';
import { WorkOrder, SystemSettings, AppUser } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { UserRoleSwitcher } from './common/UserRoleSwitcher';
import { Button } from './ui';
import { Badge } from './ui';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  workOrders: WorkOrder[];
  systemSettings?: SystemSettings;
  currentUser?: AppUser;
  users?: AppUser[];
  onSwitchUser?: (user: AppUser) => void;
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
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  workOrders,
  systemSettings,
  currentUser,
  users = [],
  onSwitchUser,
  onLogout,
  onOpenUserManagement,
  onOpenNewWorkOrder,
  onOpenRecycleBin,
  lowStockCount = 0,
  isCollapsed,
  setIsCollapsed,
  isMobileMenuOpen: externalMobileMenuOpen,
  setIsMobileMenuOpen: externalSetIsMobileMenuOpen,
}) => {
  const { t } = useLanguage();
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false);
  const isMobileMenuOpen = externalMobileMenuOpen !== undefined ? externalMobileMenuOpen : internalMobileMenuOpen;
  const setIsMobileMenuOpen = externalSetIsMobileMenuOpen || setInternalMobileMenuOpen;

  const role = currentUser?.role || 'Admin';
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

  // Sidebar counts mirror the actual module queues.
  const intakeCount = myWorkOrders.filter((w) => w.status === 'Receive').length;
  const activePipelineCount = myWorkOrders.filter(
    (w) => w.status === 'Receive' || w.status === 'In Progress' || w.status === 'Pending'
  ).length;
  const qaFinishedCount = myWorkOrders.filter(
    (w) => (w.status === 'Finished' || w.status === 'Taken Out') && !w.postRepairChecklist
  ).length;
  // POS-ready = tickets past QA (have a postRepairChecklist). Declined/cant-repair
  // tickets are NOT payable work — don't count them here (P0 #2).
  const posReadyCount = myWorkOrders.filter((w) => Boolean(w.postRepairChecklist)).length;
  const pendingFollowUpCount = myWorkOrders.filter(
    (w) => (w.status === 'Finished' || w.status === 'Taken Out') && (!w.followUpStatus || w.followUpStatus === 'Pending Call')
  ).length;

  // lowStockCount comes from App (real: parts at/below reorderPoint) — P0 #1 fix.
  const inventoryLowStock = lowStockCount;

  const allNavGroups = [
    {
      title: t('navRepair'),
      items: [
        {
          id: 'intake',
          label: t('navIntake'),
          icon: ClipboardList,
          badge: intakeCount > 0 ? intakeCount : myWorkOrders.length,
          badgeColor: 'bg-brand',
        },
        {
          id: 'pipeline',
          label: isTech ? 'My Assigned Jobs' : t('navPipeline'),
          icon: Kanban,
          badge: activePipelineCount,
          badgeColor: 'bg-success',
        },
        {
          id: 'qa',
          label: t('navQa'),
          icon: ShieldCheck,
          badge: qaFinishedCount > 0 ? qaFinishedCount : undefined,
          badgeColor: 'bg-[#AF52DE]',
        },
        {
          id: 'follow-up',
          label: t('navFollowUp'),
          icon: PhoneCall,
          badge: pendingFollowUpCount > 0 ? pendingFollowUpCount : undefined,
          badgeColor: 'bg-[#FF9500]',
        },
        {
          id: 'price-catalog',
          label: t('navPriceList'),
          icon: Tag,
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
          badgeColor: 'bg-[#16A34A]',
        },
        {
          id: 'finance',
          label: 'Shop Finance',
          icon: DollarSign,
        },
      ],
    },
    {
      title: t('navInventory'),
      items: [
        {
          id: 'inventory',
          label: isCollapsed ? t('navPartsMatrix') : 'Parts & Stock Matrix',
          icon: Boxes,
          badge: inventoryLowStock > 0 ? inventoryLowStock : undefined,
          badgeColor: 'bg-[#FF9500]',
        },
        {
          id: 'suppliers',
          label: t('navSuppliers'),
          icon: Truck,
        },
      ],
    },
    {
      title: t('navManagement'),
      items: [
        {
          id: 'crm',
          label: t('navCrm'),
          icon: Users,
        },
        {
          id: 'settings',
          label: t('navSettings'),
          icon: Settings,
        },
      ],
    },
  ];

  // Role-based filtering of navigation items
  const navGroups = allNavGroups
    .map((group) => {
      const filteredItems = group.items.filter((item) => {
        if (role === 'Admin') return true;
        if (role === 'Reception') {
          // Reception can use everything EXCEPT system settings
          if (item.id === 'settings') return currentUser?.permissions?.canAccessSettings === true;
          return true;
        }
        if (role === 'Technician') {
          // Technician can see Pipeline (assigned only), QA, CRM, and Price List.
          const allowedTechItems = ['pipeline', 'qa', 'crm', 'price-catalog'];
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

  return (
    <>
      {/* Backdrop overlay for mobile menu drawer */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Left Sidebar Navigation */}
      <aside className={`
        app-sidebar fixed top-0 left-0 z-50 h-full h-dvh shrink-0
        bg-white border-r border-line
        flex flex-col justify-between
        transition-all duration-300 ease-in-out select-none
        ${isMobileMenuOpen ? 'translate-x-0 w-[280px] max-w-[85vw]' : '-translate-x-full lg:translate-x-0'}
        ${effectiveCollapsed ? 'lg:w-14' : 'lg:w-64'}
        ${!effectiveCollapsed ? 'lg:shadow-xl lg:shadow-ink/10' : ''}
      `}>
        {/* Sidebar Header & Toggle */}
        <div className="p-2.5 border-b border-line flex flex-col gap-2">
          {effectiveCollapsed ? (
            /* Collapsed Header: Centered Logo + Expand Toggle Stacked */
            <div className="flex flex-col items-center justify-center space-y-2 py-1">
              <button
                onClick={() => handleTabSelect('dashboard')}
                className="w-10 h-10 rounded-xl bg-white border border-line p-0.5 flex items-center justify-center shadow-2xs hover:border-brand transition-all cursor-pointer overflow-hidden shrink-0"
                title={systemSettings?.shopName || 'AppleRepair Pro'}
              >
                {systemSettings?.shopLogoUrl ? (
                  <img src={systemSettings.shopLogoUrl} alt="Shop Logo" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full rounded-lg bg-brand flex items-center justify-center text-white shrink-0">
                    <CircleDot className="w-5 h-5" />
                  </div>
                )}
              </button>
              <button
                onClick={() => setIsCollapsed(false)}
                className="hidden lg:flex w-10 h-10 items-center justify-center text-muted hover:text-brand hover:bg-[#F0F7FF] rounded-xl transition-all cursor-pointer border border-transparent hover:border-brand/20"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Expanded Header: Logo + Title + Collapse Toggle */
            <div className="flex items-center justify-between">
              <div 
                className="flex items-center space-x-2.5 cursor-pointer overflow-hidden"
                onClick={() => handleTabSelect('dashboard')}
              >
                {systemSettings?.shopLogoUrl ? (
                  <img 
                    src={systemSettings.shopLogoUrl} 
                    alt="Shop Logo" 
                    className="w-9 h-9 rounded-xl object-contain bg-white border border-line p-0.5 shrink-0" 
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
                  <p className="text-[10px] text-muted truncate font-medium">Repair operations</p>
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
                  className="lg:hidden p-2 text-muted hover:text-ink rounded-xl"
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
        <nav aria-label="Sidebar Navigation" className="flex-1 overflow-y-auto p-2 space-y-3 text-xs touch-pan-y overscroll-y-contain scrollbar-thin scrollbar-thumb-gray-200">
          {/* Dashboard is the landing view — the sidebar logo already navigates
              there, so a separate "Dashboard Overview" entry is redundant. */}
          <div className="pb-2 border-b border-line/80">
            {/* New Intake Ticket — primary action */}
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
              className={`w-full mt-1.5 ${
                effectiveCollapsed ? 'w-10 h-10 mx-auto justify-center p-0' : 'justify-center px-3.5 py-2.5 min-h-10'
              } font-bold ${activeTab === 'create-ticket' ? 'bg-brand-deep' : 'hover:bg-brand-deep'}`}
            >
              <div className="flex items-center justify-center min-w-0">
                <Plus className={`w-4 h-4 shrink-0 ${effectiveCollapsed ? '' : 'mr-2'}`} />
                {!effectiveCollapsed && <span className="truncate text-xs">+ Intake Ticket</span>}
              </div>
            </Button>

            {/* Dashboard — landing view shortcut (logo also navigates here) */}
            <Button
              type="button"
              onClick={() => handleTabSelect('dashboard')}
              aria-current={activeTab === 'dashboard' ? 'page' : undefined}
              variant="outline"
              size="sm"
              title="Dashboard"
              className={`w-full mt-1.5 ${
                effectiveCollapsed ? 'w-10 h-10 mx-auto justify-center p-0 relative' : 'justify-between px-3.5 py-2.5 min-h-10'
              } ${
                activeTab === 'dashboard'
                  ? 'bg-[#EAF2FF] text-[#1559A6] font-bold border-[#B8D3F4]'
                  : 'border-transparent hover:text-ink hover:bg-[#F3F4F6]'
              }`}
            >
              <div className="flex items-center justify-center min-w-0">
                <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'dashboard' ? 'text-brand' : 'text-muted'}`} />
                {!effectiveCollapsed && <span className="truncate text-xs ml-2.5">Dashboard</span>}
              </div>
            </Button>
          </div>

          {/* Grouped Sub-Menus with detail lines */}
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1 pb-2 border-b border-line/60 last:border-b-0">
              {!effectiveCollapsed && (
                <div className="px-3 py-1 text-[9px] font-extrabold text-muted tracking-wider uppercase flex items-center justify-between">
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
                      className={`w-full ${
                        effectiveCollapsed ? 'w-10 h-10 mx-auto justify-center p-0 relative' : 'justify-between px-3.5 py-2.5 min-h-10'
                      } ${
                        isActive
                          ? 'bg-[#EAF2FF] text-[#1559A6] font-bold border-[#B8D3F4]'
                          : 'border-transparent hover:text-ink hover:bg-[#F3F4F6]'
                      }`}
                      title={item.badge !== undefined && (typeof item.badge === 'string' || item.badge > 0) ? `${item.label} (${item.badge})` : item.label}
                      aria-label={item.badge !== undefined && (typeof item.badge === 'string' || item.badge > 0) ? `${item.label} (${item.badge} pending)` : item.label}
                    >
                      <div className={`flex items-center min-w-0 ${effectiveCollapsed ? 'justify-center' : 'flex-1'}`}>
                        <ItemIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand' : 'text-muted'}`} />
                        {!effectiveCollapsed && <span className="truncate text-xs ml-2.5">{item.label}</span>}
                      </div>

                      {item.badge !== undefined && (typeof item.badge === 'string' || item.badge > 0) && (
                        <Badge className={`text-[9px] py-0.2 px-1.5 text-white shrink-0 ${item.badgeColor || 'bg-brand'} ${effectiveCollapsed ? 'absolute -top-1.5 -right-1.5 px-[5px] py-[2px] text-[length:8px] leading-none min-w-[16px] text-center border border-white shadow-2xs' : ''}`}>
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

        {/* Sidebar Footer Quick Action Utilities */}
        <div className="p-2.5 border-t border-line bg-[#F9F9FB] space-y-2 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
          {/* Active User Role Switcher */}
          {currentUser && onSwitchUser && (
            <div className="w-full flex justify-center">
              <UserRoleSwitcher
                currentUser={currentUser}
                users={users}
                onSwitchUser={onSwitchUser}
                onOpenUserManagement={onOpenUserManagement}
                compact={effectiveCollapsed}
              />
            </div>
          )}

          {/* Logout */}
          {onLogout && (
            <Button
              type="button"
              onClick={onLogout}
              title="Logout"
              aria-label="Logout"
              variant="outline"
              size="sm"
              className="w-full justify-center gap-2 py-2 text-[11px] hover:bg-danger/5 hover:text-danger"
            >
              <LogOut className="h-3.5 w-3.5" />
              {!effectiveCollapsed && <span>Logout</span>}
            </Button>
          )}

          {/* System Online Status Pill */}
          {!effectiveCollapsed && (
            <div className="pt-1 px-1 flex items-center justify-between text-[10px] text-muted">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2E7D32]" />
                <span className="font-medium">System online</span>
              </span>
              <span className="font-mono text-[9px] bg-line px-1.5 py-0.5 rounded-md text-ink">v2.4.0</span>
            </div>
          )}
        </div>

      </aside>

    </>
  );
};
