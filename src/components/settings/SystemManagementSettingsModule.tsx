import React, { useMemo, useRef, useState } from 'react';
import {
  Users, 
  FileText, 
  DollarSign, 
  Boxes, 
  Printer, 
  ShieldCheck, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  RotateCcw, 
  UserPlus, 
  Award, 
  X,
  Palette,
  Store,
  CreditCard,
  AlignLeft,
  AlignCenter,
  AlignRight,
  BellRing,
  Sparkles,
  ChevronRight,
  Search,
  ArrowLeft} from 'lucide-react';
import { Technician, SystemSettings, TechnicianLevel, PaymentMethodConfig, WorkOrder, NotificationTemplate, AppUser, UserRole, UserPermissions, PartItem, PartQualityTier, Supplier } from '../../types';
import {DEFAULT_PAYMENT_METHODS, DEFAULT_NOTIFICATION_TEMPLATES} from '../../data/seedData';
import { Button } from '../ui';

import { CustomDropdownMenu } from '../common/CustomDropdownMenu';

import { DeviceTagPrinterModal } from '../common/DeviceTagPrinterModal';
import { toast } from '../../lib/toast';

import { Suspense } from 'react';
import { ModuleLoadingSkeleton } from '../common/ModuleLoadingSkeleton';

const TabQaLazy = React.lazy(() => import('./tabs/TabQa').then((m) => ({ default: m.default })));
const TabNotificationsLazy = React.lazy(() => import('./tabs/TabNotifications').then((m) => ({ default: m.default })));
const TabPaymentLazy = React.lazy(() => import('./tabs/TabPayment').then((m) => ({ default: m.default })));
const TabPricingLazy = React.lazy(() => import('./tabs/TabPricing').then((m) => ({ default: m.default })));
const TabIntakeLazy = React.lazy(() => import('./tabs/TabIntake').then((m) => ({ default: m.default })));
const TabThemeLazy = React.lazy(() => import('./tabs/TabTheme').then((m) => ({ default: m.default })));
const TabShopLazy = React.lazy(() => import('./tabs/TabShop').then((m) => ({ default: m.default })));
const TabAiLazy = React.lazy(() => import('./tabs/TabAi').then((m) => ({ default: m.default })));

const TabRecycleLazy = React.lazy(() => import('./tabs/TabRecycle').then((m) => ({ default: m.default })));
const TabPosLazy = React.lazy(() => import('./tabs/TabPos').then((m) => ({ default: m.default })));
const TabInventoryLazy = React.lazy(() => import('./tabs/TabInventory').then((m) => ({ default: m.default })));
const TabTechniciansLazy = React.lazy(() => import('./tabs/TabTechnicians').then((m) => ({ default: m.default })));
const TabUsersLazy = React.lazy(() => import('./tabs/TabUsers').then((m) => ({ default: m.default })));

interface SystemManagementSettingsModuleProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  technicians: Technician[];
  onAddTechnician: (tech: Technician) => void;
  onUpdateTechnician: (tech: Technician) => void;
  onDeleteTechnician: (id: string) => void;
  inventoryCategories?: string[];
  onUpdateInventoryCategories?: (categories: string[]) => void;
  parts?: PartItem[];
  suppliers?: Supplier[];
  onAddSupplier?: (supplier: Supplier) => void;
  onUpdateSupplier?: (supplier: Supplier) => void;
  onDeleteSupplier?: (id: string) => void;
  onUpdatePart?: (part: PartItem) => void;
  users?: AppUser[];
  onAddUser?: (user: AppUser) => void;
  onUpdateUser?: (user: AppUser) => void;
  onDeleteUser?: (id: string) => void;
  currentUser?: AppUser;
  onOpenRecycleBin?: () => void;
  archivedCount?: number;
  onRegisterActions?: (actions: { reset: () => void; save: () => void }) => void;
  initialSubTab?: 'users' | 'ai';
  onAiRescanTickets?: () => Promise<{ classified: number; failed: number }>;
}

const RECEIPT_FOOTER_ALIGNMENT_OPTIONS = [
  { value: 'left', label: 'Left', Icon: AlignLeft },
  { value: 'center', label: 'Center', Icon: AlignCenter },
  { value: 'right', label: 'Right', Icon: AlignRight },
] as const;

const RECEIPT_FOOTER_SIZE_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
] as const;

// Quick-select model presets per provider (OpenRouter IDs verified against
// openrouter.ai/api/v1/models on 2026-08-05).


const splitFooterTextBySize = (text: string, start: number, ranges: Array<{ start: number; end: number; size: 'small' | 'medium' | 'large' }>, fallback: 'small' | 'medium' | 'large') => {
  const end = start + text.length;
  const boundaries = new Set([start, end]);
  ranges.forEach((range) => { if (range.start < end && range.end > start) { boundaries.add(Math.max(start, range.start)); boundaries.add(Math.min(end, range.end)); } });
  const points = [...boundaries].sort((a, b) => a - b);
  return points.slice(0, -1).map((point, index) => {
    const next = points[index + 1];
    return { text: text.slice(point - start, next - start), size: ranges.find((range) => range.start <= point && range.end >= next)?.size || fallback };
  });
};

const getSelectedFooterLineIndexes = (text: string, selectionStart: number, selectionEnd: number) => {
  const rangeStart = Math.max(0, Math.min(selectionStart, selectionEnd));
  // A non-empty selection ending immediately after a newline includes the
  // preceding line, not an accidental next empty line.
  const rangeEnd = selectionStart === selectionEnd
    ? rangeStart
    : Math.max(rangeStart, Math.max(selectionStart, selectionEnd) - 1);
  const startLine = text.slice(0, rangeStart).split('\n').length - 1;
  const endLine = text.slice(0, rangeEnd).split('\n').length - 1;

  return Array.from({ length: endLine - startLine + 1 }, (_, index) => startLine + index);
};

export const SystemManagementSettingsModule: React.FC<SystemManagementSettingsModuleProps> = ({
  settings,
  onUpdateSettings,
  technicians,
  onAddTechnician,
  onUpdateTechnician,
  onDeleteTechnician,
  inventoryCategories = [],
  onUpdateInventoryCategories,
  parts = [],
  suppliers = [],
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onUpdatePart,
  users = [],
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  currentUser,
  onOpenRecycleBin,
  archivedCount = 0,
  onRegisterActions,
  initialSubTab,
  onAiRescanTickets,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'shop' | 'theme' | 'users' | 'technicians' | 'intake' | 'pricing' | 'payment' | 'inventory' | 'pos' | 'notifications' | 'qa' | 'recycle' | 'ai'>(initialSubTab || 'users');
  // Two-level navigation: launcher menu → drilled-in tab view (Back returns).
  // App only sets initialSubTab='ai' when jumping from the dashboard AI shortcut — drill in then.
  const [settingsDrilledIn, setSettingsDrilledIn] = useState(initialSubTab === 'ai');
  const [inventoryDataTab, setInventoryDataTab] = useState<'categories' | 'suppliers' | 'tiers' | 'bins' | 'rules'>('categories');

  
  // Local settings draft state
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [isSavedBanner, setIsSavedBanner] = useState(false);
  // Settings tab navigation: search + dirty tracking
  const [settingsTabQuery, setSettingsTabQuery] = useState('');
  const isDirty = JSON.stringify(formData) !== JSON.stringify(settings);
  // Collapsible long sections (mobile-friendly) — keyed by section id, default open
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) =>
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  const isSectionOpen = (key: string) => !collapsedSections[key];
  const [isDeviceTagPrinterOpen, setIsDeviceTagPrinterOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState('');
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [editingCategoryLabel, setEditingCategoryLabel] = useState('');
  const [supplierDraft, setSupplierDraft] = useState({ name: '', code: '', phone: '', contactEmail: '', avgRmaTurnaroundDays: 3 });
  const [editingInventorySupplier, setEditingInventorySupplier] = useState<Supplier | null>(null);
  const [qualityTierDraft, setQualityTierDraft] = useState('');
  const [editingQualityTier, setEditingQualityTier] = useState<string | null>(null);
  const [editingQualityTierLabel, setEditingQualityTierLabel] = useState('');
  const [binDraft, setBinDraft] = useState('');
  const [expandedBinName, setExpandedBinName] = useState<string | null>(null);
  const receiptFooterEditorRef = useRef<HTMLTextAreaElement>(null);
  const [selectedFooterLineIndexes, setSelectedFooterLineIndexes] = useState<number[]>([0]);

  const SAMPLE_PRINT_WORK_ORDER: WorkOrder = {
    id: 'wo-sample-2026',
    orderNumber: 'WO-2026-88201',
    customerId: 'cust-88201',
    customerName: 'Daw Khin Than',
    customerPhone: '09-420192831',
    customerEmail: 'dawkhinthan@gmail.com',
    customerAddress: 'Kamayut Township, Yangon',
    customerType: 'Retail',
    deviceCategory: 'iPhone',
    deviceModel: 'iPhone 15 Pro',
    deviceColor: 'Natural Titanium',
    serialNumber: 'F17X8921LPM',
    passcode: '4920',
    serviceType: 'Standard Modular',
    status: 'In Progress',
    priority: 'Normal',
    assignedTechId: 'tech-001',
    warrantyDays: 90,
    findMyStatus: 'OFF',
    estimatedCompletion: '2026-07-25',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    symptomsReported: 'Display cracked with green line artifacts after accidental drop. Touch non-responsive on lower right.',
    lineItems: [],
    subtotal: 200000,
    depositAmount: 0,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 200000,
    isPaid: false,
    intakePhotos: [],
    intakeChecklist: {
      powerOn: true,
      screenDisplay: false,
      touchGrid: false,
      faceIdOrTouchId: true,
      trueTonePresent: true,
      frontCamera: true,
      rearCamera: true,
      microphones: true,
      speakers: true,
      wifiBluetooth: true,
      cellularSignal: true,
      wirelessCharging: true,
      liquidIndicatorTriggered: false,
      physicalDamageNotes: 'Front Glass Cracked'
    },
    selectedRepairs: [
      { id: 'r1', name: 'Original OLED Display Panel Replacement', basePrice: 180000, discountPercent: 0, finalPrice: 180000 },
      { id: 'r2', name: '21-Point ACMT Hardware Diag & Seal Renewal', basePrice: 200000, discountPercent: 90, finalPrice: 20000 }
    ]
  };

  // Sync formData with settings prop when updated from Firestore
  React.useEffect(() => {
    setFormData(settings);
  }, [settings]);

  // Register navbar actions for Reset Draft and Save All Settings
  React.useEffect(() => {
    if (onRegisterActions) {
      onRegisterActions({
        reset: () => setFormData(settings),
        save: () => {
          onUpdateSettings(formData);
          setIsSavedBanner(true);
          setTimeout(() => setIsSavedBanner(false), 3000);
        },
      });
    }
  }, [formData, settings, onUpdateSettings, onRegisterActions]);

  // Payment Method Helpers
  const currentPaymentMethods = formData.paymentMethods && formData.paymentMethods.length > 0 
    ? formData.paymentMethods 
    : DEFAULT_PAYMENT_METHODS;
  const connectedStorePhones = (formData.shopPhones || [])
    .map((phone) => phone.trim())
    .filter(Boolean);
  const visibleStorePhones = connectedStorePhones.length > 0
    ? connectedStorePhones
    : formData.shopPhone?.trim()
      ? [formData.shopPhone.trim()]
      : [];

  const updateSelectedFooterLines = (editor: HTMLTextAreaElement | null) => {
    if (!editor) return;
    setSelectedFooterLineIndexes(getSelectedFooterLineIndexes(
      editor.value,
      editor.selectionStart,
      editor.selectionEnd,
    ));
  };

  const handleReceiptFooterChange = (value: string, editor: HTMLTextAreaElement) => {
    const lineCount = value.split('\n').length;
    const lineAlignments = Object.fromEntries(
      Object.entries(formData.receiptFooterLineAlignments || {}).filter(([lineIndex]) => Number(lineIndex) < lineCount),
    ) as Record<number, 'left' | 'center' | 'right'>;

    setFormData({ ...formData, receiptFooterNote: value, receiptFooterLineAlignments: lineAlignments });
    updateSelectedFooterLines(editor);
  };

  const applyReceiptFooterAlignment = (alignment: 'left' | 'center' | 'right') => {
    const editor = receiptFooterEditorRef.current;
    const lineIndexes = editor
      ? getSelectedFooterLineIndexes(editor.value, editor.selectionStart, editor.selectionEnd)
      : selectedFooterLineIndexes;
    const lineAlignments = { ...formData.receiptFooterLineAlignments };

    lineIndexes.forEach((lineIndex) => {
      lineAlignments[lineIndex] = alignment;
    });

    setFormData({ ...formData, receiptFooterLineAlignments: lineAlignments });
    setSelectedFooterLineIndexes(lineIndexes);
  };

  const applyReceiptFooterTextSize = (size: 'small' | 'medium' | 'large') => {
    const editor = receiptFooterEditorRef.current;
    if (!editor || editor.selectionStart === editor.selectionEnd) return;
    const start = Math.min(editor.selectionStart, editor.selectionEnd);
    const end = Math.max(editor.selectionStart, editor.selectionEnd);
    const ranges = (formData.receiptFooterTextSizeRanges || [])
      .flatMap((range) => [
        ...(range.start < start ? [{ ...range, end: Math.min(range.end, start) }] : []),
        ...(range.end > end ? [{ ...range, start: Math.max(range.start, end) }] : []),
      ])
      .filter((range) => range.end > range.start);
    setFormData({ ...formData, receiptFooterTextSizeRanges: [...ranges, { start, end, size }] });
  };

  const selectedFooterAlignment = (() => {
    const lineAlignments = formData.receiptFooterLineAlignments || {};
    const alignments = selectedFooterLineIndexes.map(
      (lineIndex) => lineAlignments[lineIndex] || formData.receiptFooterTextAlign || 'left',
    );
    return alignments.every((alignment) => alignment === alignments[0]) ? alignments[0] : undefined;
  })();
  const receiptFooterPreviewLines = formData.receiptFooterNote.split(/\r?\n/);
  const receiptFooterPreviewFontSize = ({ small: 10, medium: 11, large: 12 } as const)[
    formData.receiptFooterFontSize || 'medium'
  ];

  const handleTogglePaymentMethod = (id: string) => {
    const updated = currentPaymentMethods.map((m) =>
      m.id === id ? { ...m, enabled: !m.enabled } : m
    );
    setFormData({ ...formData, paymentMethods: updated });
  };

  const handleUpdatePaymentMethodField = (id: string, field: keyof PaymentMethodConfig, value: any) => {
    const updated = currentPaymentMethods.map((m) =>
      m.id === id ? { ...m, [field]: value } : m
    );
    setFormData({ ...formData, paymentMethods: updated });
  };

  const handleAddCustomPaymentMethod = () => {
    const customName = prompt('Enter New Payment Method Name (e.g., "Aplus Pay" or "KBZ Special Account"):');
    if (!customName || !customName.trim()) return;

    const id = `custom_${Date.now()}`;
    const newMethod: PaymentMethodConfig = {
      id,
      name: customName.trim(),
      category: 'Myanmar Mobile Pay',
      enabled: true,
      accountName: formData.shopName,
      accountNumber: '',
      notes: 'Custom payment gateway',
    };

    setFormData({
      ...formData,
      paymentMethods: [...currentPaymentMethods, newMethod],
    });
  };

  const handleResetPaymentMethods = () => {
    if (window.confirm('Reset all payment gateways to default Myanmar configuration (Cash, KBZ Pay, UAB Pay, AYA Pay, MMQR, Banks)?')) {
      setFormData({ ...formData, paymentMethods: DEFAULT_PAYMENT_METHODS });
    }
  };

  const handleSetAllPaymentMethodsState = (enabled: boolean) => {
    const updated = currentPaymentMethods.map((m) => ({ ...m, enabled }));
    setFormData({ ...formData, paymentMethods: updated });
  };

  // Notification Templates Helpers
  const currentNotificationTemplates = (formData.notificationTemplates && formData.notificationTemplates.length > 0)
    ? formData.notificationTemplates
    : DEFAULT_NOTIFICATION_TEMPLATES;

  const handleUpdateTemplateField = (id: string, field: keyof NotificationTemplate, value: any) => {
    const updated = currentNotificationTemplates.map((t) =>
      t.id === id ? { ...t, [field]: value } : t
    );
    setFormData({ ...formData, notificationTemplates: updated });
  };

  const handleInsertVariable = (templateId: string, variableTag: string) => {
    const updated = currentNotificationTemplates.map((t) => {
      if (t.id === templateId) {
        return { ...t, templateText: (t.templateText ? t.templateText + ' ' : '') + variableTag };
      }
      return t;
    });
    setFormData({ ...formData, notificationTemplates: updated });
  };

  const handleAddCustomNotificationTemplate = () => {
    const title = prompt('Enter Notification Template Title (e.g. "Ready for Pickup", "Needs Attention", "Deposit Received"):');
    if (!title || !title.trim()) return;

    const newId = `tmpl-${Date.now()}`;
    const newTmpl: NotificationTemplate = {
      id: newId,
      key: title.trim().replace(/\s+/g, ''),
      title: title.trim(),
      channel: 'All',
      enabled: true,
      description: 'Custom user notification template',
      templateText: `မင်္ဂလာပါ {customerName} ခင်ဗျာ၊ {shopName} မှ လူကြီးမင်း၏ {deviceModel} (Ticket: #{ticketNumber}) နှင့် ပတ်သက်၍ အကြောင်းကြားအပ်ပါသည်။`,
    };

    setFormData({
      ...formData,
      notificationTemplates: [...currentNotificationTemplates, newTmpl],
    });
  };

  const handleDeleteNotificationTemplate = (id: string) => {
    if (currentNotificationTemplates.length <= 1) {
      toast.error('You must keep at least one notification template.', 'Cannot Delete');
      return;
    }
    if (window.confirm('Are you sure you want to delete this notification template?')) {
      const updated = currentNotificationTemplates.filter((t) => t.id !== id);
      setFormData({ ...formData, notificationTemplates: updated });
    }
  };

  const handleResetNotificationTemplates = () => {
    if (window.confirm('Reset all notification templates to standard Myanmar default templates?')) {
      setFormData({
        ...formData,
        notificationTemplates: DEFAULT_NOTIFICATION_TEMPLATES,
        defaultNotificationChannel: 'Viber',
        autoPromptNotificationModal: true,
      });
    }
  };

  // User Management State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userFormData, setUserFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    technicianId: string;
    status: 'Active' | 'Inactive';
    permissions: UserPermissions;
  }>({
    name: '',
    email: '',
    phone: '',
    role: 'Technician',
    technicianId: '',
    status: 'Active',
    permissions: {
      canDeleteWorkOrders: false,
      canDeleteInventory: false,
      canDeleteCustomers: false,
      canDeleteLogs: false,
      canAccessSettings: false,
      canAccessFinance: false,
      canEditPrices: false,
    },
  });

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserFormData({
      name: '',
      email: '',
      phone: '',
      role: 'Technician',
      technicianId: technicians[0]?.id || '',
      status: 'Active',
      permissions: {
        canDeleteWorkOrders: false,
        canDeleteInventory: false,
        canDeleteCustomers: false,
        canDeleteLogs: false,
        canAccessSettings: false,
        canAccessFinance: false,
        canEditPrices: false,
      },
    });
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (usr: AppUser) => {
    setEditingUser(usr);
    setUserFormData({
      name: usr.name,
      email: usr.email,
      phone: usr.phone || '',
      role: usr.role,
      technicianId: usr.technicianId || '',
      status: usr.status,
      permissions: usr.permissions || {
        canDeleteWorkOrders: usr.role === 'Admin',
        canDeleteInventory: usr.role === 'Admin',
        canDeleteCustomers: usr.role === 'Admin',
        canDeleteLogs: usr.role === 'Admin',
        canAccessSettings: usr.role === 'Admin',
        canAccessFinance: usr.role === 'Admin',
        canEditPrices: usr.role !== 'Technician',
      },
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = () => {
    if (!userFormData.name.trim()) {
      toast.error('Please enter user name.', 'Missing Name');
      return;
    }

    const linkedTech = technicians.find((t) => t.id === userFormData.technicianId || t.name.toLowerCase() === userFormData.name.trim().toLowerCase());

    if (editingUser) {
      const updated: AppUser = {
        ...editingUser,
        name: userFormData.name.trim(),
        email: userFormData.email.trim() || `${userFormData.name.toLowerCase().replace(/\s+/g, '')}@applerepairpro.com`,
        phone: userFormData.phone.trim(),
        role: userFormData.role,
        technicianId: userFormData.role === 'Technician' ? (linkedTech?.id || userFormData.technicianId) : undefined,
        technicianName: userFormData.role === 'Technician' ? (linkedTech?.name || userFormData.name.trim()) : undefined,
        status: userFormData.status,
        permissions: userFormData.permissions,
      };
      onUpdateUser?.(updated);
    } else {
      const techId = userFormData.role === 'Technician' ? (linkedTech?.id || `tech-${Date.now()}`) : undefined;
      const newUser: AppUser = {
        id: `usr-${Date.now()}`,
        name: userFormData.name.trim(),
        email: userFormData.email.trim() || `${userFormData.name.toLowerCase().replace(/\s+/g, '')}@applerepairpro.com`,
        phone: userFormData.phone.trim(),
        role: userFormData.role,
        technicianId: techId,
        technicianName: userFormData.role === 'Technician' ? (linkedTech?.name || userFormData.name.trim()) : undefined,
        status: userFormData.status,
        createdAt: new Date().toISOString().split('T')[0],
        permissions: userFormData.permissions,
      };
      onAddUser?.(newUser);

      // Auto-create Technician record if role is Technician and no linked tech exists
      if (userFormData.role === 'Technician' && !linkedTech && onAddTechnician) {
        const newTech: Technician = {
          id: techId || `tech-${Date.now()}`,
          name: userFormData.name.trim(),
          email: newUser.email,
          phone: userFormData.phone.trim() || '+95 9 700 000 000',
          level: 'Level 2 Spareparts + Hardware',
          specialty: 'Apple Repair Specialist',
          status: 'Active',
          commissionRate: 12,
          commissionRateParts: 12,
          commissionRateHardware: 15,
          activeJobsCount: 0,
          completedThisMonth: 0,
          warrantyReturnCount: 0,
        };
        onAddTechnician(newTech);
      }
    }

    setUserModalOpen(false);
  };


  // Technician Modal states
  const [techModalOpen, setTechModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [techFormData, setTechFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    level: TechnicianLevel;
    specialty: string;
    status: 'Active' | 'On Leave' | 'Inactive';
    commissionRate: number;
    commissionRateParts: number;
    commissionRateHardware: number;
  }>({
    name: '',
    email: '',
    phone: '',
    level: 'Level 1 Spareparts',
    specialty: '',
    status: 'Active',
    commissionRate: 10,
    commissionRateParts: 10,
    commissionRateHardware: 15,
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // AI repair-type re-scan state (Settings → AI Assistant & API)
  const [aiRescanning, setAiRescanning] = useState(false);
  const [aiRescanResult, setAiRescanResult] = useState<string | null>(null);

  const handleAiRescan = async () => {
    if (!onAiRescanTickets || aiRescanning) return;
    setAiRescanning(true);
    setAiRescanResult(null);
    try {
      const result = await onAiRescanTickets();
      setAiRescanResult(
        result.classified > 0 || result.failed > 0
          ? `${result.classified} classified · ${result.failed} skipped/failed`
          : 'Nothing to do — check the AI provider is configured.'
      );
    } catch {
      setAiRescanResult('Re-scan failed — check the AI provider.');
    } finally {
      setAiRescanning(false);
    }
  };

  // Handle Save Settings
  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onUpdateSettings(formData);
    setIsSavedBanner(true);
    setTimeout(() => setIsSavedBanner(false), 3000);
  };

  // Open Add Technician Modal
  const handleOpenAddTech = () => {
    setEditingTech(null);
    setTechFormData({
      name: '',
      email: '',
      phone: '',
      level: 'Level 2 Spareparts + Hardware',
      specialty: '',
      status: 'Active',
      commissionRate: 12,
      commissionRateParts: 12,
      commissionRateHardware: 15,
    });
    setTechModalOpen(true);
  };

  // Open Edit Technician Modal
  const handleOpenEditTech = (tech: Technician) => {
    setEditingTech(tech);
    setTechFormData({
      name: tech.name,
      email: tech.email,
      phone: tech.phone || '',
      level: tech.level,
      specialty: tech.specialty || '',
      status: tech.status || 'Active',
      commissionRate: tech.commissionRate || 10,
      commissionRateParts: tech.commissionRateParts ?? tech.commissionRate ?? 10,
      commissionRateHardware: tech.commissionRateHardware ?? tech.commissionRate ?? 10,
    });
    setTechModalOpen(true);
  };

  // Submit Technician Form
  const handleTechSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!techFormData.name.trim()) return;

    if (editingTech) {
      const updated: Technician = {
        ...editingTech,
        name: techFormData.name.trim(),
        email: techFormData.email.trim(),
        phone: techFormData.phone.trim(),
        level: techFormData.level,
        specialty: techFormData.specialty.trim(),
        status: techFormData.status,
        commissionRate: Number(techFormData.commissionRate) || 0,
        commissionRateParts: Number(techFormData.commissionRateParts) || 0,
        commissionRateHardware: Number(techFormData.commissionRateHardware) || 0,
      };
      onUpdateTechnician(updated);
    } else {
      const newTech: Technician = {
        id: `tech-${Date.now()}`,
        name: techFormData.name.trim(),
        email: techFormData.email.trim() || `${techFormData.name.toLowerCase().replace(/\s+/g, '')}@applerepairpro.com`,
        phone: techFormData.phone.trim() || '+95 9 700 000 000',
        level: techFormData.level,
        specialty: techFormData.specialty.trim() || 'Apple Modular & Logic Repairs',
        status: techFormData.status,
        commissionRate: Number(techFormData.commissionRate) || 10,
        commissionRateParts: Number(techFormData.commissionRateParts) || 10,
        commissionRateHardware: Number(techFormData.commissionRateHardware) || 10,
        activeJobsCount: 0,
        completedThisMonth: 0,
        warrantyReturnCount: 0,
      };
      onAddTechnician(newTech);

      // Auto-create matching AppUser if no user account exists for this technician
      const existingUser = users.find((u) => u.email === newTech.email || u.technicianId === newTech.id);
      if (!existingUser && onAddUser) {
        const newUser: AppUser = {
          id: `usr-${newTech.id}`,
          name: newTech.name,
          email: newTech.email,
          phone: newTech.phone,
          role: 'Technician',
          technicianId: newTech.id,
          technicianName: newTech.name,
          status: 'Active',
          createdAt: new Date().toISOString().split('T')[0],
          permissions: {
            canDeleteWorkOrders: false,
            canDeleteInventory: false,
            canDeleteCustomers: false,
            canDeleteLogs: false,
            canAccessSettings: false,
            canAccessFinance: false,
            canEditPrices: false,
          },
        };
        onAddUser(newUser);
      }
    }

    setTechModalOpen(false);
  };

  // Handle Delete Tech
  const handleConfirmDeleteTech = (id: string) => {
    onDeleteTechnician(id);
    setDeleteConfirmId(null);
  };

  const handleAddInventoryCategory = () => {
    const label = categoryDraft.trim();
    if (!label || !onUpdateInventoryCategories) return;
    if (inventoryCategories.some((category) => category.toLowerCase() === label.toLowerCase())) return;
    const nextCategories = [...inventoryCategories, label];
    onUpdateInventoryCategories(nextCategories);
    setFormData((current) => ({ ...current, inventoryCategories: nextCategories }));
    setCategoryDraft('');
  };

  const handleSaveInventoryCategory = (categoryToReplace: string) => {
    const label = editingCategoryLabel.trim();
    if (!label || !onUpdateInventoryCategories) return;
    if (inventoryCategories.some((category) => category !== categoryToReplace && category.toLowerCase() === label.toLowerCase())) return;
    const nextCategories = inventoryCategories.map((category) => category === categoryToReplace ? label : category);
    onUpdateInventoryCategories(nextCategories);
    setFormData((current) => ({ ...current, inventoryCategories: nextCategories }));
    setEditingCategoryKey(null);
    setEditingCategoryLabel('');
  };

  const inventoryQualityTiers = settings.inventoryQualityTiers?.length
    ? settings.inventoryQualityTiers
    : ['Original', 'OEM', 'Genuine'];

  const saveInventoryQualityTiers = (tiers: string[]) => {
    onUpdateSettings({ ...settings, inventoryQualityTiers: tiers });
  };

  const handleAddInventorySupplier = (event: React.FormEvent) => {
    event.preventDefault();
    const name = supplierDraft.name.trim();
    if (!name || !onAddSupplier) return;
    onAddSupplier({
      id: `sup-${Date.now()}`,
      name,
      code: supplierDraft.code.trim().toUpperCase() || 'SUP',
      phone: supplierDraft.phone.trim() || 'N/A',
      contactEmail: supplierDraft.contactEmail.trim() || 'vendor@example.com',
      website: 'https://supplier.com',
      avgRmaTurnaroundDays: Number(supplierDraft.avgRmaTurnaroundDays) || 3,
      rating: 5,
    });
    setSupplierDraft({ name: '', code: '', phone: '', contactEmail: '', avgRmaTurnaroundDays: 3 });
  };

  const handleAddInventoryQualityTier = () => {
    const tier = qualityTierDraft.trim();
    if (!tier || inventoryQualityTiers.some((item) => item.toLowerCase() === tier.toLowerCase())) return;
    saveInventoryQualityTiers([...inventoryQualityTiers, tier]);
    setQualityTierDraft('');
  };

  const inventoryBinNames = settings.inventoryBinNames || [];
  const partsByBin = useMemo(() => {
    const grouped = new Map<string, PartItem[]>();
    (parts || []).forEach((part) => {
      const bin = part.locationBin?.trim();
      if (!bin) return;
      const current = grouped.get(bin) || [];
      current.push(part);
      grouped.set(bin, current);
    });
    return grouped;
  }, [parts]);
  const handleAddInventoryBin = () => {
    const bin = binDraft.trim().toUpperCase();
    if (!bin || inventoryBinNames.some((item) => item.toLowerCase() === bin.toLowerCase())) return;
    onUpdateSettings({ ...settings, inventoryBinNames: [...inventoryBinNames, bin] });
    setBinDraft('');
  };

  const handleSaveInventoryQualityTier = (tier: string) => {
    const next = editingQualityTierLabel.trim();
    if (!next || (next !== tier && inventoryQualityTiers.some((item) => item.toLowerCase() === next.toLowerCase()))) return;
    saveInventoryQualityTiers(inventoryQualityTiers.map((item) => item === tier ? next : item));
    parts.filter((part) => part.qualityTier === tier).forEach((part) => onUpdatePart?.({ ...part, qualityTier: next as PartQualityTier }));
    setEditingQualityTier(null);
    setEditingQualityTierLabel('');
  };

  const handleDeleteInventoryQualityTier = (tier: string) => {
    const remaining = inventoryQualityTiers.filter((item) => item !== tier);
    if (!remaining.length || !window.confirm(`Delete quality tier “${tier}”? Parts using it will change to “${remaining[0]}”.`)) return;
    saveInventoryQualityTiers(remaining);
    parts.filter((part) => part.qualityTier === tier).forEach((part) => onUpdatePart?.({ ...part, qualityTier: remaining[0] as PartQualityTier }));
  };

  return (
    <div className="space-y-3 pb-20 lg:pb-0">
      {/* Save Toast Notification */}
      {isSavedBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Settings saved to Supabase. The header database icon shows the live connection status.</span>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs — launcher menu (hidden once drilled into a tab) */}
      {!settingsDrilledIn && (
      <div className="bg-surface p-2.5 rounded-2xl border border-line space-y-2.5 shadow-2xs">
        {/* Settings search filter */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={settingsTabQuery}
            onChange={(e) => setSettingsTabQuery(e.target.value)}
            placeholder="Search settings…"
            className="w-full bg-white border border-line text-xs text-ink placeholder-muted pl-8 pr-7 py-2 rounded-xl focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
          />
          {settingsTabQuery && (
            <Button
              type="button"
              onClick={() => setSettingsTabQuery('')}
              aria-label="Clear settings search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-muted hover:text-ink rounded-full hover:bg-surface transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {(() => {
          const tabDefs = [
            { id: 'users', label: 'User Roles & Permissions', icon: UserPlus, badge: users.length },
            { id: 'shop', label: 'Shop Settings & Logo', icon: Store },
            { id: 'theme', label: 'Theme & Color Palette', icon: Palette },
            { id: 'technicians', label: 'Technicians & Staff', icon: Users, badge: technicians.length },
            { id: 'intake', label: 'Work Orders & Intake', icon: FileText },
            { id: 'pricing', label: 'Pricing & Currency', icon: DollarSign },
            { id: 'payment', label: 'Payment Methods & MM QR', icon: CreditCard },
            { id: 'inventory', label: 'Inventory Data & Quality', icon: Boxes, badge: inventoryCategories.length },
            { id: 'pos', label: 'POS & Receipt Layout', icon: Printer },
            { id: 'notifications', label: 'SMS & Telegram Alerts', icon: BellRing },
            { id: 'ai', label: 'AI Assistant & API', icon: Sparkles },
            { id: 'qa', label: 'QA & Diagnostic Rules', icon: ShieldCheck },
            { id: 'recycle', label: 'Recycle Bin & Trash', icon: Trash2, badge: archivedCount },
          ];
          const defById = new Map(tabDefs.map((t) => [t.id, t]));
          const groups = [
            { label: 'Business', ids: ['shop', 'pricing', 'payment', 'pos'] },
            { label: 'Staff', ids: ['users', 'technicians'] },
            { label: 'Operations', ids: ['intake', 'qa', 'inventory', 'notifications'] },
            { label: 'System', ids: ['theme', 'ai', 'recycle'] },
          ];
          // Work-desk accent tints per group (icon tile backgrounds)
          const accentByGroup: Record<string, string> = {
            Business: 'bg-[#EAF4FF] text-brand',
            Staff: 'bg-[#E8F7EF] text-[#15803D]',
            Operations: 'bg-[#F3EFFF] text-[#7C3AED]',
            System: 'bg-[#FFF4E5] text-[#F59E0B]',
          };
          const q = settingsTabQuery.trim().toLowerCase();
          let visibleCount = 0;
          const rendered = groups.map((group) => {
            const tabs = group.ids.map((id) => defById.get(id)!).filter((t) => !q || t.label.toLowerCase().includes(q));
            if (tabs.length === 0) return null;
            visibleCount += tabs.length;
            const accent = accentByGroup[group.label] || 'bg-brand-soft text-brand';
            return (
              <div key={group.label}>
                <p className="px-1 pb-1.5 text-xs font-extrabold uppercase tracking-wider text-muted">
                  {group.label}
                </p>
                <div className="flex flex-col gap-1 md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 md:gap-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeSubTab === tab.id;
                    return (
                      <Button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          if (isDirty && tab.id !== activeSubTab) {
                            if (!window.confirm('You have unsaved changes. Discard them and switch tab?')) return;
                          }
                          setActiveSubTab(tab.id as any);
                          setSettingsDrilledIn(true);
                        }}
                        title={tab.label}
                        className={`relative flex flex-row md:flex-col items-center justify-start md:justify-center gap-2.5 md:gap-2 px-3 py-2.5 md:px-2 md:py-4 w-full text-left md:text-center text-xs md:text-xs font-extrabold rounded-xl md:rounded-2xl transition-all cursor-pointer border select-none active:scale-95 shrink-0 ${
                          isActive
                            ? 'bg-brand text-white border-brand shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-faint hover:text-ink border-line'
                        }`}
                      >
                        {/* Work-desk app-icon tile */}
                        <span
                          className={`flex items-center justify-center w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl shrink-0 transition-colors ${
                            isActive ? 'bg-white/20' : accent
                          }`}
                        >
                          <Icon className="w-5 h-5 md:w-6 md:h-6" />
                        </span>
                        <span className="truncate leading-tight md:leading-snug">{tab.label}</span>
                        {isDirty && isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 absolute top-1.5 right-1.5" title="Unsaved changes" />
                        )}
                        {tab.badge !== undefined && (
                          <span
                            className={`absolute top-1.5 right-1.5 px-1.5 rounded-full text-xs font-mono font-bold leading-[13px] ${
                              isActive ? 'bg-white/20 text-white' : 'bg-line text-ink'
                            }`}
                          >
                            {tab.badge}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 ml-auto md:hidden shrink-0 text-[#C7C7CC]" />
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          });
          if (q && visibleCount === 0) {
            return <p className="text-center text-xs font-bold text-muted py-3">No settings match “{settingsTabQuery}”</p>;
          }
          return rendered;
        })()}
      </div>
      )}

      {/* Drilled-in tab view — one tab at a time with a Back bar */}
      {settingsDrilledIn && (
        <>
        {/* Back navigation bar */}
        <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-line shadow-2xs">
          <Button
            type="button"
            onClick={() => setSettingsDrilledIn(false)}
            variant="outline"
            size="sm"
            className="flex items-center space-x-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Settings Menu</span>
          </Button>
          {isDirty && (
            <span className="flex items-center gap-1.5 text-xs font-extrabold text-amber-600">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Unsaved changes
            </span>
          )}
        </div>

      {/* Tab: AI Assistant Provider */}
            {activeSubTab === 'ai' && (
        <Suspense fallback={<ModuleLoadingSkeleton />}>
          <TabAiLazy formData={formData} setFormData={setFormData} aiRescanning={aiRescanning} aiRescanResult={aiRescanResult} onAiRescanTickets={onAiRescanTickets} handleAiRescan={handleAiRescan} />
        </Suspense>
      )}      {activeSubTab === 'users' && (
        <Suspense fallback={<ModuleLoadingSkeleton />}>
          <TabUsersLazy formData={formData} setFormData={setFormData} users={users} currentUser={currentUser} handleOpenAddUser={handleOpenAddUser} handleOpenEditUser={handleOpenEditUser} onDeleteUser={onDeleteUser} />
        </Suspense>
      )}{activeSubTab === 'shop' && (
        <Suspense fallback={<ModuleLoadingSkeleton />}>
          <TabShopLazy formData={formData} setFormData={setFormData} handleSaveSettings={handleSaveSettings} />
        </Suspense>
      )}      {activeSubTab === 'theme' && (
        <Suspense fallback={<ModuleLoadingSkeleton />}>
          <TabThemeLazy />
        </Suspense>
      )}      {activeSubTab === 'technicians' && (
        <Suspense fallback={<ModuleLoadingSkeleton />}>
          <TabTechniciansLazy formData={formData} setFormData={setFormData} technicians={technicians} handleOpenAddTech={handleOpenAddTech} handleOpenEditTech={handleOpenEditTech} setDeleteConfirmId={setDeleteConfirmId} />
        </Suspense>
      )}{activeSubTab === 'intake' && (
        <Suspense fallback={<ModuleLoadingSkeleton />}>
          <TabIntakeLazy formData={formData} setFormData={setFormData} />
        </Suspense>
      )}      {activeSubTab === 'pricing' && (
        <Suspense fallback={<ModuleLoadingSkeleton />}>
          <TabPricingLazy formData={formData} setFormData={setFormData} setActiveSubTab={setActiveSubTab} />
        </Suspense>
      )}      {activeSubTab === 'payment' && (
        <Suspense fallback={<ModuleLoadingSkeleton />}>
          <TabPaymentLazy formData={formData} setFormData={setFormData} currentPaymentMethods={currentPaymentMethods} handleTogglePaymentMethod={handleTogglePaymentMethod} handleUpdatePaymentMethodField={handleUpdatePaymentMethodField} handleAddCustomPaymentMethod={handleAddCustomPaymentMethod} handleResetPaymentMethods={handleResetPaymentMethods} handleSetAllPaymentMethodsState={handleSetAllPaymentMethodsState} />
        </Suspense>
      )}      {activeSubTab === 'inventory' && (
        <Suspense fallback={<ModuleLoadingSkeleton />}>
          <TabInventoryLazy formData={formData} setFormData={setFormData} parts={parts} suppliers={suppliers} inventoryCategories={inventoryCategories} settings={settings} isSavedBanner={isSavedBanner} onUpdateInventoryCategories={onUpdateInventoryCategories} onUpdateSupplier={onUpdateSupplier} onDeleteSupplier={onDeleteSupplier} onUpdatePart={onUpdatePart} onUpdateSettings={onUpdateSettings} setActiveSubTab={setActiveSubTab} isSectionOpen={isSectionOpen} toggleSection={toggleSection} inventoryDataTab={inventoryDataTab} setInventoryDataTab={setInventoryDataTab} categoryDraft={categoryDraft} setCategoryDraft={setCategoryDraft} editingCategoryKey={editingCategoryKey} setEditingCategoryKey={setEditingCategoryKey} editingCategoryLabel={editingCategoryLabel} setEditingCategoryLabel={setEditingCategoryLabel} supplierDraft={supplierDraft} setSupplierDraft={setSupplierDraft} editingInventorySupplier={editingInventorySupplier} setEditingInventorySupplier={setEditingInventorySupplier} qualityTierDraft={qualityTierDraft} setQualityTierDraft={setQualityTierDraft} editingQualityTier={editingQualityTier} setEditingQualityTier={setEditingQualityTier} editingQualityTierLabel={editingQualityTierLabel} setEditingQualityTierLabel={setEditingQualityTierLabel} binDraft={binDraft} setBinDraft={setBinDraft} expandedBinName={expandedBinName} setExpandedBinName={setExpandedBinName} inventoryQualityTiers={inventoryQualityTiers} inventoryBinNames={inventoryBinNames} partsByBin={partsByBin} handleAddInventoryCategory={handleAddInventoryCategory} handleSaveInventoryCategory={handleSaveInventoryCategory} handleAddInventorySupplier={handleAddInventorySupplier} handleAddInventoryQualityTier={handleAddInventoryQualityTier} handleSaveInventoryQualityTier={handleSaveInventoryQualityTier} handleDeleteInventoryQualityTier={handleDeleteInventoryQualityTier} handleAddInventoryBin={handleAddInventoryBin} />
        </Suspense>
      )}      {activeSubTab === 'pos' && (
        <Suspense fallback={<ModuleLoadingSkeleton />}>
          <TabPosLazy formData={formData} setFormData={setFormData} settings={settings} isSectionOpen={isSectionOpen} toggleSection={toggleSection} setIsDeviceTagPrinterOpen={setIsDeviceTagPrinterOpen} setActiveSubTab={setActiveSubTab} visibleStorePhones={visibleStorePhones} receiptFooterEditorRef={receiptFooterEditorRef} receiptFooterPreviewLines={receiptFooterPreviewLines} receiptFooterPreviewFontSize={receiptFooterPreviewFontSize} selectedFooterAlignment={selectedFooterAlignment} updateSelectedFooterLines={updateSelectedFooterLines} handleReceiptFooterChange={handleReceiptFooterChange} applyReceiptFooterAlignment={applyReceiptFooterAlignment} applyReceiptFooterTextSize={applyReceiptFooterTextSize} RECEIPT_FOOTER_ALIGNMENT_OPTIONS={RECEIPT_FOOTER_ALIGNMENT_OPTIONS} RECEIPT_FOOTER_SIZE_OPTIONS={RECEIPT_FOOTER_SIZE_OPTIONS} splitFooterTextBySize={splitFooterTextBySize} />
        </Suspense>
      )}{activeSubTab === 'notifications' && (
        <Suspense fallback={<ModuleLoadingSkeleton />}>
          <TabNotificationsLazy formData={formData} setFormData={setFormData} isSectionOpen={isSectionOpen} toggleSection={toggleSection} currentNotificationTemplates={currentNotificationTemplates} handleUpdateTemplateField={handleUpdateTemplateField} handleInsertVariable={handleInsertVariable} handleAddCustomNotificationTemplate={handleAddCustomNotificationTemplate} handleDeleteNotificationTemplate={handleDeleteNotificationTemplate} handleResetNotificationTemplates={handleResetNotificationTemplates} samplePrintWorkOrder={SAMPLE_PRINT_WORK_ORDER} />
        </Suspense>
      )}      {activeSubTab === 'qa' && (
        <Suspense fallback={<ModuleLoadingSkeleton />}>
          <TabQaLazy formData={formData} setFormData={setFormData} />
        </Suspense>
      )}      {activeSubTab === 'recycle' && (
        <Suspense fallback={<ModuleLoadingSkeleton />}>
          <TabRecycleLazy formData={formData} setFormData={setFormData} onOpenRecycleBin={onOpenRecycleBin} archivedCount={archivedCount} />
        </Suspense>
      )}{/* Add / Edit Technician Modal */}
      {techModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 border border-line-strong shadow-2xl animate-scale-in my-8">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-purple-50 text-[#AF52DE] rounded-lg">
                  <Award className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-ink">
                    {editingTech ? 'Edit Technician Record' : 'Add New Technical Staff'}
                  </h3>
                  <p className="text-xs text-muted">
                    {editingTech ? 'Update staff details and commission rates' : 'Register a new technician on the roster'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setTechModalOpen(false)}
                className="p-1.5 text-muted hover:text-ink hover:bg-surface rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleTechSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-ink block mb-1.5">Technician Full Name *</label>
                <input
                  type="text"
                  required
                  value={techFormData.name}
                  onChange={(e) => setTechFormData({ ...techFormData, name: e.target.value })}
                  placeholder="e.g. Alex Rivera"
                  className="w-full h-10 bg-surface text-ink font-medium px-3 rounded-xl border border-line-strong focus:bg-white focus:outline-none focus:border-brand"
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-black text-muted uppercase tracking-wider">Contact Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-ink block mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={techFormData.email}
                      onChange={(e) => setTechFormData({ ...techFormData, email: e.target.value })}
                      placeholder="alex@applerepairpro.com"
                      className="w-full h-10 bg-surface text-ink font-medium px-3 rounded-xl border border-line-strong focus:bg-white focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-ink block mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      value={techFormData.phone}
                      onChange={(e) => setTechFormData({ ...techFormData, phone: e.target.value })}
                      placeholder="+95 9 700 000 000"
                      className="w-full h-10 bg-surface text-ink font-medium px-3 rounded-xl border border-line-strong focus:bg-white focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-black text-muted uppercase tracking-wider">Role & Status</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-ink block mb-1.5">Skill Tier Level</label>
                    <CustomDropdownMenu
                      value={techFormData.level}
                      onChange={(level) => setTechFormData({ ...techFormData, level: level as TechnicianLevel })}
                      options={[
                        { value: 'Level 1 Spareparts', label: 'Level 1 Spareparts' },
                        { value: 'Level 2 Spareparts + Hardware', label: 'Level 2 Spareparts + Hardware' },
                        { value: 'Level 3 Master', label: 'Level 3 Master' },
                      ]}
                      className="w-full"
                      buttonClassName="!w-full !h-10 !rounded-xl !border-line-strong !bg-surface !px-3"
                      menuAlign="left"
                      size="md"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-ink block mb-1.5">Status</label>
                    <select aria-label="Active"
                      value={techFormData.status}
                      onChange={(e) => setTechFormData({ ...techFormData, status: e.target.value as any })}
                      className="w-full h-10 bg-surface text-ink font-bold px-3 rounded-xl border border-line-strong focus:bg-white focus:outline-none focus:border-brand"
                    >
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-ink block mb-1.5">Specialty / Hardware Focus</label>
                <input
                  type="text"
                  value={techFormData.specialty}
                  onChange={(e) => setTechFormData({ ...techFormData, specialty: e.target.value })}
                  placeholder="e.g. MacBook Logic Boards, Display Repair"
                  className="w-full h-10 bg-surface text-ink font-medium px-3 rounded-xl border border-line-strong focus:bg-white focus:outline-none focus:border-brand"
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-black text-muted uppercase tracking-wider">Commission Rates</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#F8F9FA] border border-line rounded-xl p-3">
                    <label className="font-bold text-ink block mb-1.5">Spareparts Change (%)</label>
                    <input
                      type="number"
                      value={techFormData.commissionRateParts}
                      onChange={(e) => setTechFormData({ ...techFormData, commissionRateParts: Number(e.target.value) })}
                      min="0"
                      max="50"
                      className="w-full h-9 bg-white text-ink font-bold px-3 rounded-lg border border-line-strong focus:outline-none focus:border-brand"
                    />
                    <p className="text-xs text-muted mt-1.5">Standard Modular (parts-swap) jobs</p>
                  </div>

                  <div className="bg-[#F8F9FA] border border-line rounded-xl p-3">
                    <label className="font-bold text-ink block mb-1.5">Hardware Repair (%)</label>
                    <input
                      type="number"
                      value={techFormData.commissionRateHardware}
                      onChange={(e) => setTechFormData({ ...techFormData, commissionRateHardware: Number(e.target.value) })}
                      min="0"
                      max="50"
                      className="w-full h-9 bg-white text-ink font-bold px-3 rounded-lg border border-line-strong focus:outline-none focus:border-brand"
                    />
                    <p className="text-xs text-muted mt-1.5">Micro-Soldering (board-level) jobs</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-line">
                <Button
                  type="button"
                  onClick={() => setTechModalOpen(false)}
                  variant="outline"
                  className="font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="font-extrabold"
                >
                  {editingTech ? 'Update Record' : 'Save Technician'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Technician Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 border border-line-strong shadow-xl animate-scale-in">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-extrabold text-sm text-ink">Delete Technician?</h3>
            </div>
            <p className="text-xs text-muted">Remove this technician? Their active tickets stay.</p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <Button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 bg-surface text-ink font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => handleConfirmDeleteTech(deleteConfirmId)}
                className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 border border-line-strong shadow-2xl animate-scale-in my-8">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-blue-50 text-brand rounded-lg">
                  <UserPlus className="w-5 h-5" />
                </span>
                <h3 className="font-extrabold text-base text-ink">
                  {editingUser ? 'Edit User Account & Permissions' : 'Add New System User'}
                </h3>
              </div>
              <Button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="p-1 text-muted hover:text-ink rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4 text-xs">
              {/* User Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-ink block">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    placeholder="e.g. Mg Mg or Daw Thin"
                    className="w-full px-3 py-2 rounded-xl border border-line-strong focus:outline-none focus:border-brand font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink block">Email Address</label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="user@applerepairpro.com"
                    className="w-full px-3 py-2 rounded-xl border border-line-strong focus:outline-none focus:border-brand font-medium"
                  />
                </div>
              </div>

              {/* Phone & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-ink block">Phone Number</label>
                  <input
                    type="text"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    placeholder="+95 9 123 456 789"
                    className="w-full px-3 py-2 rounded-xl border border-line-strong focus:outline-none focus:border-brand font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink block">Account Status</label>
                  <select aria-label="Active User"
                    value={userFormData.status}
                    onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-line-strong focus:outline-none focus:border-brand font-bold bg-white"
                  >
                    <option value="Active">Active User</option>
                    <option value="Inactive">Inactive / Suspended</option>
                  </select>
                </div>
              </div>

              {/* Role Selector */}
              <div className="space-y-2 pt-2 border-t border-line">
                <label className="font-extrabold text-ink block">
                  Select User Role <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setUserFormData({
                        ...userFormData,
                        role: 'Admin',
                        permissions: {
                          canDeleteWorkOrders: true,
                          canDeleteInventory: true,
                          canDeleteCustomers: true,
                          canDeleteLogs: true,
                          canAccessSettings: true,
                          canAccessFinance: true,
                          canEditPrices: true,
                        },
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-center font-extrabold transition-all cursor-pointer ${
                      userFormData.role === 'Admin'
                        ? 'bg-purple-100 border-purple-600 text-purple-900 shadow-2xs'
                        : 'bg-white border-line-strong text-ink hover:bg-purple-50/50'
                    }`}
                  >
                    <div className="text-base mb-0.5">👑</div>
                    <div>Admin</div>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      setUserFormData({
                        ...userFormData,
                        role: 'Technician',
                        permissions: {
                          canDeleteWorkOrders: false,
                          canDeleteInventory: false,
                          canDeleteCustomers: false,
                          canDeleteLogs: false,
                          canAccessSettings: false,
                          canAccessFinance: false,
                          canEditPrices: false,
                        },
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-center font-extrabold transition-all cursor-pointer ${
                      userFormData.role === 'Technician'
                        ? 'bg-blue-100 border-blue-600 text-blue-900 shadow-2xs'
                        : 'bg-white border-line-strong text-ink hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="text-base mb-0.5">🔧</div>
                    <div>Technician</div>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      setUserFormData({
                        ...userFormData,
                        role: 'Reception',
                        permissions: {
                          canDeleteWorkOrders: false,
                          canDeleteInventory: false,
                          canDeleteCustomers: false,
                          canDeleteLogs: false,
                          canAccessSettings: false,
                          canAccessFinance: false,
                          canEditPrices: true,
                        },
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-center font-extrabold transition-all cursor-pointer ${
                      userFormData.role === 'Reception'
                        ? 'bg-amber-100 border-amber-600 text-amber-900 shadow-2xs'
                        : 'bg-white border-line-strong text-ink hover:bg-amber-50/50'
                    }`}
                  >
                    <div className="text-base mb-0.5">📋</div>
                    <div>Reception</div>
                  </Button>
                </div>
              </div>

              {/* Technician Link (If Technician Role selected) */}
              {userFormData.role === 'Technician' && (
                <div className="space-y-1 p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                  <label className="font-extrabold text-blue-900 block">
                    Link to Technician Profile (For Ticket Assignment & Payouts)
                  </label>
                  <select aria-label="-- Select Technician Staff Profile --"
                    value={userFormData.technicianId}
                    onChange={(e) => setUserFormData({ ...userFormData, technicianId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-blue-300 focus:outline-none focus:border-brand font-bold bg-white text-blue-950"
                  >
                    <option value="">-- Select Technician Staff Profile --</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name} ({tech.level})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Granular Permission Toggles */}
              <div className="space-y-2 pt-2 border-t border-line">
                <label className="font-extrabold text-ink block">
                  Permissions & Capabilities
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-surface p-3 rounded-xl border border-line">
                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-ink">
                    <input
                      type="checkbox"
                      checked={!!userFormData.permissions?.canDeleteWorkOrders}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          permissions: {
                            ...userFormData.permissions,
                            canDeleteWorkOrders: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-brand focus:ring-brand"
                    />
                    <span>Delete Work Orders & Tasks</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-ink">
                    <input
                      type="checkbox"
                      checked={!!userFormData.permissions?.canDeleteInventory}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          permissions: {
                            ...userFormData.permissions,
                            canDeleteInventory: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-brand focus:ring-brand"
                    />
                    <span>Delete Parts & Stock</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-ink">
                    <input
                      type="checkbox"
                      checked={!!userFormData.permissions?.canDeleteCustomers}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          permissions: {
                            ...userFormData.permissions,
                            canDeleteCustomers: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-brand focus:ring-brand"
                    />
                    <span>Delete Customer Records</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-ink">
                    <input
                      type="checkbox"
                      checked={!!userFormData.permissions?.canAccessSettings}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          permissions: {
                            ...userFormData.permissions,
                            canAccessSettings: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-brand focus:ring-brand"
                    />
                    <span>Access System Settings</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-ink">
                    <input
                      type="checkbox"
                      checked={!!userFormData.permissions?.canAccessFinance}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          permissions: {
                            ...userFormData.permissions,
                            canAccessFinance: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-brand focus:ring-brand"
                    />
                    <span>Access Finance & P&L</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-ink">
                    <input
                      type="checkbox"
                      checked={!!userFormData.permissions?.canEditPrices}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          permissions: {
                            ...userFormData.permissions,
                            canEditPrices: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-brand focus:ring-brand"
                    />
                    <span>Modify Price Catalog</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 border-t border-line pt-3">
              <Button
                type="button"
                onClick={() => setUserModalOpen(false)}
                variant="outline"
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveUser}
                className="px-4 py-2 bg-brand hover:bg-brand-deep text-white font-extrabold text-xs rounded-xl shadow-2xs cursor-pointer active:scale-95"
              >
                {editingUser ? 'Save Changes' : 'Create User Account'}
              </Button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Interactive Device Intake Print Voucher & Tag Printer Modal */}
      {isDeviceTagPrinterOpen && (
        <DeviceTagPrinterModal
          workOrder={SAMPLE_PRINT_WORK_ORDER}
          systemSettings={formData}
          onClose={() => setIsDeviceTagPrinterOpen(false)}
        />
      )}

      {/* Sticky mobile save bar — appears only when the settings draft is dirty */}
      {isDirty && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur-sm px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => setFormData(settings)}
              variant="outline"
              className="flex-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
            <Button
              type="button"
              onClick={() => handleSaveSettings()}
              className="flex-1 bg-brand hover:bg-brand-deep text-white"
            >
              <Save className="w-3.5 h-3.5" />
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
