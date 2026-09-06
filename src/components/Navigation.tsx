/**
 * Navigation sidebar — Ant Design version.
 *
 * Uses antd Layout.Sider + Menu. Drop-in replacement for the original
 * Radix+Tailwind sidebar. Same props, same contract with App.tsx.
 *
 * Removed: inventory nav group (lite mode — no inventory).
 */
import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  CreditCard,
  Users,
  Settings,
  PhoneCall,
  Trello,
  ClipboardCheck,
  Stethoscope,
  DollarSign,
  Tag,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  CircleDot,
} from 'lucide-react';
import type { WorkOrder, SystemSettings, AppUser } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { isModuleEnabled } from '../lib/modules';


import { Layout, Menu, Badge, Button, Typography } from 'antd';
import type { MenuProps } from 'antd';

const { Sider } = Layout;
const { Text } = Typography;

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
  lowStockCount?: number;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean | ((prev: boolean) => boolean)) => void;
  isIpad?: boolean;
  isOnline?: boolean;
  disabledModules?: string[];
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  workOrders,
  systemSettings,
  currentUser,
  onOpenNewWorkOrder,
  isCollapsed,
  setIsCollapsed,
  isMobileMenuOpen: externalMobileMenuOpen,
  setIsMobileMenuOpen: externalSetIsMobileMenuOpen,
  isIpad = false,
  isOnline = true,
  disabledModules = [],
}) => {
  const { t } = useLanguage();
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const isMobileMenuOpen = externalMobileMenuOpen !== undefined ? externalMobileMenuOpen : internalMobileOpen;
  const setIsMobileMenuOpen = externalSetIsMobileMenuOpen || setInternalMobileOpen;

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

  const posReadyCount = myWorkOrders.filter((w) => {
    if (w.isPaid) return false;
    if (w.status !== 'Finished' && w.status !== 'Taken Out' && w.status !== 'Cant Repair' && w.status !== 'Customer Not Repair') return false;
    return Boolean(w.postRepairChecklist) || w.status === 'Cant Repair' || w.status === 'Customer Not Repair';
  }).length;

  const qaPendingCount = myWorkOrders.filter((w) => {
    if (w.isArchived || w.isPaid) return false;
    if (w.status !== 'Finished' && w.status !== 'Taken Out') return false;
    return !w.postRepairChecklist;
  }).length;

  const financePendingCount = myWorkOrders.filter(
    (w) => !w.isArchived && w.inventoryConsumptionAmount && w.inventorySettlementStatus !== 'settled'
  ).length;

  const followUpPendingCount = myWorkOrders.filter((w) => {
    if (w.isArchived) return false;
    if (w.status !== 'Finished' && w.status !== 'Taken Out') return false;
    return Boolean(w.followUpStatus) && w.followUpStatus !== 'Satisfied';
  }).length;

  // Build antd Menu items.
  const menuItems = useMemo((): MenuProps['items'] => {
    const filterItem = (item: { id: string; roleCheck?: boolean }) => {
      if (!isModuleEnabled(disabledModules, item.id)) return false;
      if (role === 'Admin') return true;
      if (role === 'Reception') {
        if (item.id === 'settings') return currentUser?.permissions?.canAccessSettings === true;
        return true;
      }
      if (role === 'Technician') {
        const allowed = ['trello', 'qa', 'crm', 'price-catalog'];
        if (allowed.includes(item.id)) return true;
        if (item.id === 'finance') return currentUser?.permissions?.canAccessFinance === true;
        if (item.id === 'settings') return currentUser?.permissions?.canAccessSettings === true;
        return false;
      }
      return true;
    };

    const items: MenuProps['items'] = [
      // Dashboard (always shown)
      {
        key: 'dashboard',
        icon: <LayoutDashboard size={18} />,
        label: t('navDashboard'),
      },
    ];

    // Repair group
    const repairItems: MenuProps['items'] = [];
    if (filterItem({ id: 'intake' })) {
      repairItems.push({ key: 'intake', icon: <ClipboardList size={18} />, label: t('navIntake') });
    }
    repairItems.push({ key: 'simple-ticket', icon: <ClipboardCheck size={18} />, label: t('navSimpleTicket') });
    if (filterItem({ id: 'trello' })) {
      repairItems.push({ key: 'trello', icon: <Trello size={18} />, label: t('navTicketBoard') });
    }
    if (filterItem({ id: 'qa' })) {
      repairItems.push({
        key: 'qa',
        icon: <Stethoscope size={18} />,
        label: (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {t('navQa')}
            {qaPendingCount > 0 && (
              <Badge count={qaPendingCount} size="small" style={{ backgroundColor: '#FF9500' }} />
            )}
          </span>
        ),
      });
    }
    if (filterItem({ id: 'follow-up' })) {
      repairItems.push({
        key: 'follow-up',
        icon: <PhoneCall size={18} />,
        label: (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {t('navFollowUp')}
            {followUpPendingCount > 0 && (
              <Badge count={followUpPendingCount} size="small" style={{ backgroundColor: '#AF52DE' }} />
            )}
          </span>
        ),
      });
    }
    if (repairItems.length > 0) {
      items.push({ type: 'divider' as const });
      items.push({
        key: 'repair-group',
        label: t('navRepair'),
        type: 'group',
        children: repairItems,
      });
    }

    // Finance group
    const financeItems: MenuProps['items'] = [];
    financeItems.push({
      key: 'pos',
      icon: <CreditCard size={18} />,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {t('navPos')}
          {posReadyCount > 0 && (
            <Badge count={posReadyCount} size="small" style={{ backgroundColor: '#34C759' }} />
          )}
        </span>
      ),
    });
    if (filterItem({ id: 'finance' })) {
      financeItems.push({
        key: 'finance',
        icon: <DollarSign size={18} />,
        label: (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {t('navFinance')}
            {financePendingCount > 0 && (
              <Badge count={financePendingCount} size="small" style={{ backgroundColor: '#FF9500' }} />
            )}
          </span>
        ),
      });
    }
    financeItems.push({ key: 'price-catalog', icon: <Tag size={18} />, label: t('navPriceList') });
    items.push({ type: 'divider' as const });
    items.push({
      key: 'finance-group',
      label: t('navFinance'),
      type: 'group',
      children: financeItems,
    });

    // People
    if (filterItem({ id: 'crm' })) {
      items.push({ type: 'divider' as const });
      items.push({
        key: 'people-group',
        label: t('navPeople'),
        type: 'group',
        children: [
          { key: 'crm', icon: <Users size={18} />, label: t('navCrm') },
        ],
      });
    }

    // Settings
    if (filterItem({ id: 'settings' })) {
      items.push({ type: 'divider' as const });
      items.push({
        key: 'settings-group',
        label: t('navSettings'),
        type: 'group',
        children: [
          { key: 'settings', icon: <Settings size={18} />, label: t('navSettings') },
        ],
      });
    }

    return items;
  }, [disabledModules, role, currentUser, t, qaPendingCount, followUpPendingCount, posReadyCount, financePendingCount]);

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    setActiveTab(key);
    setIsMobileMenuOpen(false);
  };

  // Collapse toggle
  const toggleCollapsed = () => setIsCollapsed((prev: boolean) => !prev);

  // Drawer backdrop (mobile only)
  const mobileDrawerVisible = isMobileMenuOpen && !isIpad;

  return (
    <>
      {/* Mobile backdrop */}
      {mobileDrawerVisible && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sider wrapper — mobile: fixed drawer; desktop: inline */}
      <div
        className={`
          app-sidebar
          ${mobileDrawerVisible
            ? 'fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] translate-x-0 shadow-xl'
            : isIpad
              ? 'fixed inset-y-0 left-0 z-50 -translate-x-full'
              : 'hidden lg:block lg:relative'
          }
          transition-transform duration-300 ease-in-out
          shrink-0
          ${isCollapsed && !mobileDrawerVisible ? 'lg:w-[60px]' : 'lg:w-[240px]'}
          ${!mobileDrawerVisible && !isIpad ? 'lg:fixed lg:inset-y-0 lg:left-0 lg:z-30' : ''}
        `}
      >
        <Sider
          width={240}
          collapsedWidth={60}
          collapsed={isCollapsed && !mobileDrawerVisible}
          trigger={null}
          style={{
            height: '100%',
            background: 'var(--sidebar, #FFFFFF)',
            borderRight: '1px solid var(--border, #E5E5EA)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
          className="antd-sider"
        >
          {/* Logo header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: isCollapsed && !mobileDrawerVisible ? '12px 0' : '10px 14px',
              borderBottom: '1px solid var(--border, #E5E5EA)',
              gap: 10,
            }}
          >
            {/* Shop logo */}
            {systemSettings?.shopLogoUrl ? (
              <img
                src={systemSettings.shopLogoUrl}
                alt="Logo"
                style={{
                  width: isCollapsed && !mobileDrawerVisible ? 34 : 36,
                  height: isCollapsed && !mobileDrawerVisible ? 34 : 36,
                  borderRadius: 10,
                  objectFit: 'contain',
                  background: '#fff',
                  border: '1px solid var(--border, #E5E5EA)',
                  padding: 2,
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: isCollapsed && !mobileDrawerVisible ? 34 : 36,
                  height: isCollapsed && !mobileDrawerVisible ? 34 : 36,
                  borderRadius: 10,
                  background: '#0071E3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CircleDot size={20} color="#fff" />
              </div>
            )}

            {/* Title (expanded only) */}
            {(!isCollapsed || mobileDrawerVisible) && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: 13, color: 'var(--text-main, #1D1D1F)', display: 'block', lineHeight: 1.3 }}>
                  {systemSettings?.shopName || 'i35 ERP'}
                </Text>
                <Text type="secondary" style={{ fontSize: 10, display: 'block', lineHeight: 1.2 }}>
                  Repair operations
                </Text>
              </div>
            )}

            {/* Collapse button (desktop) */}
            <Button
              type="text"
              size="small"
              icon={isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              onClick={toggleCollapsed}
              className="hidden lg:inline-flex"
              style={{ color: 'var(--text-muted, #616161)', flexShrink: 0 }}
            />

            {/* Mobile close button */}
            <Button
              type="text"
              size="small"
              icon={<X size={20} />}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden"
              style={{ color: 'var(--text-muted, #616161)', flexShrink: 0 }}
            />
          </div>

          {/* New Intake Ticket button */}
          {isModuleEnabled(disabledModules, 'intake') && (
            <div style={{ padding: '10px 10px 4px' }}>
              <Button
                type="primary"
                block
                size="middle"
                icon={<Plus size={16} />}
                onClick={() => {
                  onOpenNewWorkOrder();
                  setIsMobileMenuOpen(false);
                }}
                style={{
                  fontWeight: 700,
                  fontSize: 12,
                  height: 40,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {(!isCollapsed || mobileDrawerVisible) && 'Intake Ticket'}
              </Button>
            </div>
          )}

          {/* Navigation Menu */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 8px' }}>
            <Menu
              mode="inline"
              selectedKeys={[activeTab]}
              onClick={handleMenuClick}
              items={menuItems}
              inlineIndent={16}
              style={{
                background: 'transparent',
                borderInlineEnd: 'none',
                fontSize: 13,
              }}
            />
          </div>

          {/* Footer */}
          {(!isCollapsed || mobileDrawerVisible) && (
            <div
              style={{
                padding: '8px 14px',
                borderTop: '1px solid var(--border, #E5E5EA)',
                background: 'var(--surface, #F5F5F7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted, #616161)' }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: isOnline ? '#34C759' : '#FF3B30',
                  }}
                />
                <span style={{ fontWeight: 500 }}>{isOnline ? 'System online' : 'Offline'}</span>
              </span>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  background: 'var(--border, #E5E5EA)',
                  padding: '1px 6px',
                  borderRadius: 4,
                  color: 'var(--text-main, #1D1D1F)',
                }}
              >
                {APP_VERSION}
              </span>
            </div>
          )}
        </Sider>
      </div>
    </>
  );
};