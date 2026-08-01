import React, { useState } from 'react';
import { 
  CircleDot, 
  LayoutDashboard, 
  ClipboardList, 
  Kanban, 
  Boxes, 
  Truck, 
  CreditCard, 
  Users, 
  ShieldCheck, 
  Sparkles, 
  Search, 
  Menu,
  X,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Tag,
  Settings,
  ExternalLink,
  PhoneCall,
  Trash2,
  DollarSign
} from 'lucide-react';
import { WorkOrder, SystemSettings, AppUser } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSwitcher } from './common/LanguageSwitcher';
import { UserRoleSwitcher } from './common/UserRoleSwitcher';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  workOrders: WorkOrder[];
  systemSettings?: SystemSettings;
  currentUser?: AppUser;
  users?: AppUser[];
  onSwitchUser?: (user: AppUser) => void;
  onOpenUserManagement?: () => void;
  onOpenNewWorkOrder: () => void;
  onOpenAiAssistant: () => void;
  onOpenRecycleBin?: () => void;
  archivedCount?: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
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
  onOpenUserManagement,
  onOpenNewWorkOrder,
  onOpenAiAssistant,
  onOpenRecycleBin,
  archivedCount = 0,
  searchQuery,
  setSearchQuery,
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
  const posReadyCount = myWorkOrders.filter((w) => {
    const hasRecordedDiagnostic =
      (w.beforeDiagnostics && w.beforeDiagnostics.some((diagnostic) => diagnostic.status === 'Pass' || diagnostic.status === 'Fail')) ||
      (w.diagnosticResult && w.diagnosticResult.trim().length > 0 && w.diagnosticResult !== 'Diagnostic Pending');
    const isDeclinedDiagnostic =
      (w.status === 'Cant Repair' || w.status === 'Customer Not Repair') &&
      hasRecordedDiagnostic;

    return Boolean(w.postRepairChecklist) || isDeclinedDiagnostic;
  }).length;
  const pendingFollowUpCount = myWorkOrders.filter(
    (w) => (w.status === 'Finished' || w.status === 'Taken Out') && (!w.followUpStatus || w.followUpStatus === 'Pending Call')
  ).length;

  const lowStockCount = 2; // sample trigger

  const allNavGroups = [
    {
      title: t('navRepair'),
      items: [
        {
          id: 'intake',
          label: t('navIntake'),
          icon: ClipboardList,
          badge: intakeCount > 0 ? intakeCount : myWorkOrders.length,
          badgeColor: 'bg-[#0071E3]',
        },
        {
          id: 'pipeline',
          label: isTech ? 'My Assigned Jobs' : t('navPipeline'),
          icon: Kanban,
          badge: activePipelineCount,
          badgeColor: 'bg-[#34C759]',
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
          label: t('navPartsMatrix'),
          icon: Boxes,
          badge: lowStockCount,
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
        fixed lg:sticky top-0 left-0 z-50 lg:z-30 h-full h-dvh lg:h-screen shrink-0
        bg-white border-r border-[#E5E5EA]
        flex flex-col justify-between
        transition-all duration-300 ease-in-out select-none
        ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-14' : 'lg:w-56'}
      `}>
        {/* Sidebar Header & Toggle */}
        <div className="p-2.5 border-b border-[#E5E5EA] flex flex-col gap-2">
          {isCollapsed ? (
            /* Collapsed Header: Centered Logo + Expand Toggle Stacked */
            <div className="flex flex-col items-center justify-center space-y-2 py-1">
              <button
                onClick={() => handleTabSelect('dashboard')}
                className="w-10 h-10 rounded-xl bg-white border border-[#E5E5EA] p-0.5 flex items-center justify-center shadow-2xs hover:border-[#0071E3] transition-all cursor-pointer overflow-hidden shrink-0"
                title={systemSettings?.shopName || 'AppleRepair Pro'}
              >
                {systemSettings?.shopLogoUrl ? (
                  <img src={systemSettings.shopLogoUrl} alt="Shop Logo" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full rounded-lg bg-[#0071E3] flex items-center justify-center text-white shrink-0">
                    <CircleDot className="w-5 h-5" />
                  </div>
                )}
              </button>
              <button
                onClick={() => setIsCollapsed(false)}
                className="hidden lg:flex w-10 h-8 items-center justify-center text-[#86868B] hover:text-[#0071E3] hover:bg-[#F0F7FF] rounded-xl transition-all cursor-pointer border border-transparent hover:border-[#0071E3]/20"
                title="Expand sidebar"
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
                    className="w-9 h-9 rounded-xl object-contain bg-white border border-[#E5E5EA] p-0.5 shrink-0" 
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-[#0071E3] flex items-center justify-center text-white shrink-0">
                    <CircleDot className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center space-x-1">
                    <span className="font-extrabold text-sm tracking-tight text-[#1D1D1F] truncate">
                      {systemSettings?.shopName || 'i35 ERP'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#86868B] truncate font-medium">Repair operations</p>
                </div>
              </div>

              {/* Close / Collapse Toggle Button */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="hidden lg:flex p-1.5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-lg transition-colors cursor-pointer"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="lg:hidden p-1.5 text-[#86868B] hover:text-[#1D1D1F] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Close / Collapse Toggle Button */}
        </div>

        {/* Navigation List */}
        <nav aria-label="Sidebar Navigation" className="flex-1 overflow-y-auto p-2 space-y-3 text-xs touch-pan-y overscroll-y-contain scrollbar-thin scrollbar-thumb-gray-200">
          {/* Dashboard Main Link */}
          <div className="pb-2 border-b border-[#E5E5EA]/80">
            <button
              onClick={() => handleTabSelect('dashboard')}
              aria-current={activeTab === 'dashboard' ? 'page' : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'w-10 h-10 mx-auto justify-center p-0' : 'justify-between px-3.5 py-2.5'
              } rounded-xl font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] ${
                activeTab === 'dashboard'
                  ? 'bg-[#EAF2FF] text-[#1559A6] border border-[#B8D3F4]'
                  : 'text-[#1D1D1F] bg-white hover:bg-[#F3F4F6] border border-transparent'
              }`}
              title="Overview Dashboard"
            >
              <div className="flex items-center justify-center min-w-0">
                <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'dashboard' ? 'text-[#1559A6]' : 'text-[#667085]'}`} />
                {!isCollapsed && <span className="ml-2.5">Dashboard Overview</span>}
              </div>
            </button>
          </div>

          {/* Grouped Sub-Menus with detail lines */}
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1 pb-2 border-b border-[#E5E5EA]/60 last:border-b-0">
              {!isCollapsed && (
                <div className="px-3 py-1 text-[9px] font-extrabold text-[#86868B] tracking-wider uppercase flex items-center justify-between">
                  <span>{group.title}</span>
                  <span className="w-8 h-[1px] bg-[#E5E5EA]" />
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = activeTab === item.id || (item.id === 'intake' && activeTab === 'create-ticket');

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabSelect(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full flex items-center ${
                        isCollapsed ? 'w-10 h-10 mx-auto justify-center p-0 relative' : 'justify-between px-3.5 py-2.5'
                      } rounded-xl font-semibold transition-all cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] ${
                        isActive
                          ? 'bg-[#EAF2FF] text-[#1559A6] font-bold border-[#B8D3F4]'
                          : 'bg-white text-[#344054] border-transparent hover:text-[#1D1D1F] hover:bg-[#F3F4F6]'
                      }`}
                      title={item.label}
                    >
                      <div className="flex items-center justify-center min-w-0">
                        <ItemIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0071E3]' : 'text-[#86868B]'}`} />
                        {!isCollapsed && <span className="truncate text-xs ml-2.5">{item.label}</span>}
                      </div>

                      {item.badge !== undefined && (typeof item.badge === 'string' || item.badge > 0) && (
                        <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded-full text-white shrink-0 ${
                          item.badgeColor || 'bg-[#0071E3]'
                        } ${isCollapsed ? 'absolute -top-1 -right-1 px-1 py-0 text-[8px] border border-white shadow-2xs' : ''}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer Quick Action Utilities */}
        <div className="p-2.5 border-t border-[#E5E5EA] bg-[#F9F9FB] space-y-2">
          {/* Active User Role Switcher */}
          {currentUser && onSwitchUser && (
            <div className="w-full flex justify-center">
              <UserRoleSwitcher
                currentUser={currentUser}
                users={users}
                onSwitchUser={onSwitchUser}
                onOpenUserManagement={onOpenUserManagement}
                compact={isCollapsed}
              />
            </div>
          )}

          {/* System Online Status Pill */}
          {!isCollapsed && (
            <div className="pt-1 px-1 flex items-center justify-between text-[10px] text-[#86868B]">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2E7D32]" />
                <span className="font-medium">System online</span>
              </span>
              <span className="font-mono text-[9px] bg-[#E5E5EA] px-1.5 py-0.5 rounded-md text-[#1D1D1F]">v2.4.0</span>
            </div>
          )}
        </div>

      </aside>

      {/* Mobile Bottom Navigation Bar (Touch-First UI) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E5EA] px-1 py-1.5 flex items-center justify-around shadow-lg">
        {isTech ? (
          <>
            <button
              type="button"
              onClick={() => handleTabSelect('pipeline')}
              className={`min-h-[44px] flex-1 flex flex-col items-center justify-center space-y-0.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'pipeline' ? 'text-[#0071E3] bg-blue-50/80 font-black' : 'text-[#86868B] font-bold hover:text-[#1D1D1F]'
              }`}
            >
              <Kanban className="w-5 h-5" />
              <span className="text-[10px] truncate">My Jobs</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSelect('qa')}
              className={`min-h-[44px] flex-1 flex flex-col items-center justify-center space-y-0.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'qa' ? 'text-[#0071E3] bg-blue-50/80 font-black' : 'text-[#86868B] font-bold hover:text-[#1D1D1F]'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[10px] truncate">QA Inspection</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSelect('crm')}
              className={`min-h-[44px] flex-1 flex flex-col items-center justify-center space-y-0.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'crm' ? 'text-[#0071E3] bg-blue-50/80 font-black' : 'text-[#86868B] font-bold hover:text-[#1D1D1F]'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px] truncate">CRM</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="min-h-[44px] flex-1 flex flex-col items-center justify-center space-y-0.5 rounded-xl text-[#86868B] font-bold hover:text-[#1D1D1F] transition-all cursor-pointer"
            >
              <Menu className="w-5 h-5" />
              <span className="text-[10px] truncate">More</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => handleTabSelect('intake')}
              className={`min-h-[44px] flex-1 flex flex-col items-center justify-center space-y-0.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'intake' ? 'text-[#0071E3] bg-blue-50/80 font-black' : 'text-[#86868B] font-bold hover:text-[#1D1D1F]'
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              <span className="text-[10px] truncate">Work Intake</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSelect('pipeline')}
              className={`min-h-[44px] flex-1 flex flex-col items-center justify-center space-y-0.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'pipeline' ? 'text-[#0071E3] bg-blue-50/80 font-black' : 'text-[#86868B] font-bold hover:text-[#1D1D1F]'
              }`}
            >
              <Kanban className="w-5 h-5" />
              <span className="text-[10px] truncate">Pipeline</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSelect('pos')}
              className={`min-h-[44px] flex-1 flex flex-col items-center justify-center space-y-0.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'pos' ? 'text-[#0071E3] bg-blue-50/80 font-black' : 'text-[#86868B] font-bold hover:text-[#1D1D1F]'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="text-[10px] truncate">POS</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabSelect('crm')}
              className={`min-h-[44px] flex-1 flex flex-col items-center justify-center space-y-0.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'crm' ? 'text-[#0071E3] bg-blue-50/80 font-black' : 'text-[#86868B] font-bold hover:text-[#1D1D1F]'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px] truncate">CRM</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="min-h-[44px] flex-1 flex flex-col items-center justify-center space-y-0.5 rounded-xl text-[#86868B] font-bold hover:text-[#1D1D1F] transition-all cursor-pointer"
            >
              <Menu className="w-5 h-5" />
              <span className="text-[10px] truncate">Menu</span>
            </button>
          </>
        )}
      </nav>
    </>
  );
};
