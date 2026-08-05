import React, { useMemo, useRef, useState } from 'react';
import { 
  Sliders, 
  Users, 
  FileText, 
  DollarSign, 
  Boxes, 
  Printer, 
  ShieldCheck, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  RotateCcw, 
  UserPlus, 
  Phone, 
  Mail, 
  Award, 
  X,
  Building2,
  Tag,
  Hash,
  Palette,
  Check,
  Square,
  Circle,
  Store,
  Upload,
  Image as ImageIcon,
  Globe,
  MapPin,
  CreditCard,
  QrCode,
  Wallet,
  ToggleLeft,
  ToggleRight,
  Landmark,
  CheckSquare,
  User,
  Smartphone,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  ExternalLink,
  Scissors,
  BellRing,
  Send,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Truck,
  ChevronDown,
  ChevronRight,
  Search,
  ArrowLeft
} from 'lucide-react';
import { Technician, SystemSettings, TechnicianLevel, PaymentMethodConfig, WorkOrder, NotificationTemplate, AppUser, UserRole, UserPermissions, PartItem, PartQualityTier, Supplier } from '../../types';
import { DEFAULT_PAYMENT_METHODS, getActivePaymentMethods, DEFAULT_NOTIFICATION_TEMPLATES } from '../../data/seedData';
import { Button } from '../ui';
import { useTheme, THEME_PRESETS, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { CustomDropdownMenu } from '../common/CustomDropdownMenu';
import { QRCodeSVG } from 'qrcode.react';
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
  const { theme, setTheme, geometry, setGeometry } = useTheme();
  const { t, language, setLanguage } = useLanguage();
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
      <div className="bg-[#F5F5F7] p-2.5 rounded-2xl border border-[#E5E5EA] space-y-2.5 shadow-2xs">
        {/* Settings search filter */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
          <input
            type="text"
            value={settingsTabQuery}
            onChange={(e) => setSettingsTabQuery(e.target.value)}
            placeholder="Search settings…"
            className="w-full bg-white border border-[#E5E5EA] text-xs text-[#1D1D1F] placeholder-[#86868B] pl-8 pr-7 py-2 rounded-xl focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
          />
          {settingsTabQuery && (
            <button
              type="button"
              onClick={() => setSettingsTabQuery('')}
              aria-label="Clear settings search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] rounded-full hover:bg-[#F5F5F7] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
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
            Business: 'bg-[#EAF4FF] text-[#0071E3]',
            Staff: 'bg-[#E8F7EF] text-[#16A34A]',
            Operations: 'bg-[#F3EFFF] text-[#7C3AED]',
            System: 'bg-[#FFF4E5] text-[#F59E0B]',
          };
          const q = settingsTabQuery.trim().toLowerCase();
          let visibleCount = 0;
          const rendered = groups.map((group) => {
            const tabs = group.ids.map((id) => defById.get(id)!).filter((t) => !q || t.label.toLowerCase().includes(q));
            if (tabs.length === 0) return null;
            visibleCount += tabs.length;
            const accent = accentByGroup[group.label] || 'bg-[#F0F6FF] text-[#0071E3]';
            return (
              <div key={group.label}>
                <p className="px-1 pb-1.5 text-[9px] font-extrabold uppercase tracking-wider text-[#86868B]">
                  {group.label}
                </p>
                <div className="flex flex-col gap-1 md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 md:gap-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeSubTab === tab.id;
                    return (
                      <button
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
                        className={`relative flex flex-row md:flex-col items-center justify-start md:justify-center gap-2.5 md:gap-2 px-3 py-2.5 md:px-2 md:py-4 w-full text-left md:text-center text-[11px] md:text-[11px] font-extrabold rounded-xl md:rounded-2xl transition-all cursor-pointer border select-none active:scale-95 shrink-0 ${
                          isActive
                            ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
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
                            className={`absolute top-1.5 right-1.5 px-1.5 rounded-full text-[8px] font-mono font-bold leading-[13px] ${
                              isActive ? 'bg-white/20 text-white' : 'bg-[#E5E5EA] text-[#1D1D1F]'
                            }`}
                          >
                            {tab.badge}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 ml-auto md:hidden shrink-0 text-[#C7C7CC]" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          });
          if (q && visibleCount === 0) {
            return <p className="text-center text-xs font-bold text-[#86868B] py-3">No settings match “{settingsTabQuery}”</p>;
          }
          return rendered;
        })()}
      </div>
      )}

      {/* Drilled-in tab view — one tab at a time with a Back bar */}
      {settingsDrilledIn && (
        <>
        {/* Back navigation bar */}
        <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-[#E5E5EA] shadow-2xs">
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
            <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-amber-600">
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
      )}{activeSubTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5EA]">
              <div>
                <h3 className="text-base font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                  <UserPlus className="w-5 h-5 text-[#0071E3]" />
                  <span>System Users & Role Access Control</span>
                </h3>
                <p className="text-xs text-[#86868B] mt-1">
                  Manage accounts for Admin, Technicians, and Reception staff. Control granular deletion and access permissions.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleOpenAddUser}
                className="bg-[#0071E3] hover:bg-[#0051B3] text-white shrink-0 flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add New User Account</span>
              </Button>
            </div>

            {/* Role Rules Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-purple-50/80 rounded-2xl border border-purple-200 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">👑</span>
                  <span className="font-extrabold text-sm text-purple-900">Admin Role</span>
                </div>
                <p className="text-xs text-purple-800 leading-relaxed">
                  Full control over system settings, finance, price catalog, user management, and <strong>sole permission to delete items</strong> (tickets, parts, logs).
                </p>
              </div>

              <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">🔧</span>
                  <span className="font-extrabold text-sm text-blue-900">Technician Role</span>
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Mobile-first view for assigned repair pipeline only, QA diagnostic checklists, adding repair logs/status changes, and device repair history. Cannot delete anything.
                </p>
              </div>

              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">📋</span>
                  <span className="font-extrabold text-sm text-amber-900">Reception Role</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Access to intake ticketing, pipeline, inventory, POS invoicing, CRM customers, and QA. Excludes system settings. Cannot delete anything.
                </p>
              </div>
            </div>

            {/* Users Table / Card List */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-extrabold text-[#1D1D1F] uppercase tracking-wider">
                Active System Users ({users.length})
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map((usr) => {
                  const isAdmin = usr.role === 'Admin';
                  const isTech = usr.role === 'Technician';
                  const isReception = usr.role === 'Reception';

                  return (
                    <div
                      key={usr.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        usr.id === currentUser?.id
                          ? 'bg-blue-50/40 border-[#0071E3] shadow-xs'
                          : 'bg-white border-[#E5E5EA] hover:border-[#D2D2D7]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-black shrink-0 ${
                            isAdmin
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : isTech
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {isAdmin ? '👑' : isTech ? '🔧' : '📋'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <h5 className="font-extrabold text-sm text-[#1D1D1F] truncate">{usr.name}</h5>
                              {usr.id === currentUser?.id && (
                                <span className="px-1.5 py-0.2 bg-[#0071E3] text-white text-[9px] font-extrabold rounded-md">
                                  YOU
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#86868B] truncate">{usr.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(usr)}
                            className="p-1.5 text-[#0071E3] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit User & Permissions"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {usr.id !== 'usr-admin-1' && usr.id !== currentUser?.id && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete user account "${usr.name}"?`)) {
                                  onDeleteUser?.(usr.id);
                                }
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete User Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#E5E5EA]/80 flex flex-wrap items-center justify-between text-xs gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${
                          isAdmin
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : isTech
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          Role: {usr.role}
                        </span>

                        {usr.phone && (
                          <span className="text-[11px] text-[#6E6E73] font-medium">
                            📞 {usr.phone}
                          </span>
                        )}
                      </div>

                      {/* Permissions Tags */}
                      <div className="bg-[#F5F5F7] p-2 rounded-xl text-[10px] text-[#6E6E73] space-y-1">
                        <div className="font-extrabold text-[#1D1D1F] flex items-center justify-between">
                          <span>Key Permissions:</span>
                          <span className={usr.permissions?.canDeleteWorkOrders ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                            {usr.permissions?.canDeleteWorkOrders ? 'Can Delete Items' : 'No Delete Access'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {isAdmin && <span className="bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">All Settings</span>}
                          {isReception && <span className="bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">All Ops Except Settings</span>}
                          {isTech && <span className="bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">Assigned Pipeline & QA Only</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Shop Settings & Logo */}
            {activeSubTab === 'shop' && (
        <Suspense fallback={<ModuleLoadingSkeleton />}>
          <TabShopLazy formData={formData} setFormData={setFormData} handleSaveSettings={handleSaveSettings} />
        </Suspense>
      )}      {activeSubTab === 'theme' && (
        <Suspense fallback={<ModuleLoadingSkeleton />}>
          <TabThemeLazy />
        </Suspense>
      )}{activeSubTab === 'technicians' && (
        <div className="space-y-6">
          {/* Default Assignment Card */}
          <div className="bg-white p-5 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#1D1D1F]">Default Technician Auto-Assignment</h3>
                <p className="text-xs text-[#86868B]">
                  Select the default technician assigned when creating new intake tickets or B2B repairs.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={formData.defaultTechnicianId}
                  onChange={(e) => setFormData({ ...formData, defaultTechnicianId: e.target.value })}
                  className="px-3 py-2 bg-[#F5F5F7] text-xs font-bold text-[#1D1D1F] border border-[#D2D2D7] rounded-xl focus:outline-none focus:border-[#0071E3]"
                >
                  {technicians.length > 0 ? (
                    technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.level})
                      </option>
                    ))
                  ) : (
                    <option value="">No Technicians Registered</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Technician Roster Section */}
          <div className="bg-white p-5 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5EA] pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                  <span>Active Technical Staff Roster</span>
                  <span className="px-2 py-0.5 bg-[#0071E3]/10 text-[#0071E3] text-xs font-black rounded-full">
                    {technicians.length}
                  </span>
                </h3>
                <p className="text-xs text-[#86868B]">
                  Add, modify, or adjust technician skill levels, contact numbers, and repair commissions.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  onClick={handleOpenAddTech}
                  className="bg-[#0071E3] hover:bg-[#0051B3] text-white shrink-0 flex items-center space-x-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add New Technician</span>
                </Button>
              </div>
            </div>

            {/* Technicians Grid / Empty State */}
            {technicians.length === 0 ? (
              <div className="p-8 bg-[#F8F9FA] border-2 border-dashed border-[#D2D2D7] rounded-2xl text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#0071E3] flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-[#1D1D1F]">No Technical Staff Records Found</h4>
                  <p className="text-xs text-[#86868B] max-w-sm mx-auto mt-1">
                    There are currently no technician profiles in the system roster. Add a technician account when you are ready.
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-3 pt-2">
                  <Button
                    type="button"
                    onClick={handleOpenAddTech}
                    variant="outline"
                    className="text-[#1D1D1F] border-[#D2D2D7] hover:bg-[#F5F5F7] flex items-center space-x-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#0071E3]" />
                    <span>Add Technician</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {technicians.map((tech) => (
                  <div
                    key={tech.id}
                    className="p-4 bg-[#F8F9FA] border border-[#E5E5EA] rounded-2xl space-y-3 relative hover:border-[#0071E3]/50 transition-all shadow-2xs"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-[#0071E3] text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-2xs">
                          {tech.name ? tech.name.charAt(0).toUpperCase() : 'T'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-xs text-[#1D1D1F] flex items-center space-x-1.5 truncate">
                            <span className="truncate">{tech.name || 'Unnamed Tech'}</span>
                            {formData.defaultTechnicianId === tech.id && (
                              <span className="px-1.5 py-0.2 bg-blue-100 text-[#0071E3] text-[9px] font-extrabold rounded-md shrink-0">
                                DEFAULT
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-[#86868B] flex items-center space-x-1 mt-0.5">
                            <Award className="w-3 h-3 text-[#0071E3] shrink-0" />
                            <span className="font-semibold text-[#0071E3] truncate">{tech.level}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditTech(tech)}
                          className="p-1.5 text-[#86868B] hover:text-[#0071E3] hover:bg-white rounded-lg transition-all cursor-pointer"
                          title="Edit Technician"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(tech.id)}
                          className="p-1.5 text-[#86868B] hover:text-rose-600 hover:bg-white rounded-lg transition-all cursor-pointer"
                          title="Delete Technician"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Specialty / Status */}
                    <div className="space-y-1.5 text-xs border-t border-[#E5E5EA] pt-2.5">
                      {tech.specialty && (
                        <p className="text-[11px] text-[#1D1D1F] font-medium truncate">
                          <span className="text-[#86868B]">Specialty:</span> {tech.specialty}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#86868B] flex items-center space-x-1 truncate max-w-[160px]">
                          <Mail className="w-3 h-3 text-[#86868B] shrink-0" />
                          <span className="truncate">{tech.email}</span>
                        </span>
                        <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                          {tech.status || 'Active'}
                        </span>
                      </div>
                      {tech.phone && (
                        <div className="text-[11px] text-[#86868B] flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-[#86868B] shrink-0" />
                          <span>{tech.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats Bar */}
                    <div className="grid grid-cols-3 gap-1 pt-2 bg-white p-2 rounded-xl border border-[#E5E5EA] text-center text-[10px]">
                      <div>
                        <p className="text-[#86868B] font-semibold">Active Jobs</p>
                        <p className="font-extrabold text-[#0071E3] text-xs">{tech.activeJobsCount || 0}</p>
                      </div>
                      <div>
                        <p className="text-[#86868B] font-semibold">Done / Mo</p>
                        <p className="font-extrabold text-[#34C759] text-xs">{tech.completedThisMonth || 0}</p>
                      </div>
                      <div>
                        <p className="text-[#86868B] font-semibold">Commission</p>
                        <p className="font-extrabold text-[#1D1D1F] text-xs">
                          {(tech.commissionRateParts ?? tech.commissionRate ?? 10)}% SP · {(tech.commissionRateHardware ?? tech.commissionRate ?? 10)}% HW
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Work Orders & Intake Settings */}
            {activeSubTab === 'intake' && (
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
      )}{activeSubTab === 'inventory' && (
        <div className="bg-white p-5 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-extrabold text-[#1D1D1F]">Inventory System Data & Quality Settings</h3>
            <p className="text-xs text-[#86868B]">
              Create simple names for physical stock parts, then define stock alerts and vendor rules.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-[#E5E5EA] pb-3">
            {([
              ['categories', 'Categories'],
              ['suppliers', 'Suppliers'],
              ['tiers', 'Quality Tiers'],
              ['bins', 'Storage Bins'],
              ['rules', 'Stock Rules'],
            ] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setInventoryDataTab(id)} className={`rounded-lg px-3 py-1.5 text-xs font-extrabold ${inventoryDataTab === id ? 'bg-[#0071E3] text-white' : 'bg-[#F5F5F7] text-[#6E6E73] hover:bg-[#E5E5EA]'}`}>
                {label}
              </button>
            ))}
          </div>

          <section className={`${inventoryDataTab === 'categories' ? 'space-y-3' : 'hidden'} border-y border-[#E5E5EA] py-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-extrabold text-[#1D1D1F]">Inventory Categories</h4>
                <p className="text-[11px] text-[#86868B]">For stock parts only. Price List repair services stay separate.</p>
              </div>
              <span className="rounded-full bg-[#0071E3]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#0071E3]">
                {inventoryCategories.length} categories
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={categoryDraft}
                onChange={(event) => setCategoryDraft(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleAddInventoryCategory(); } }}
                placeholder="New category, e.g. Camera"
                className="h-9 min-w-0 flex-1 rounded-xl border border-[#D2D2D7] bg-[#F5F5F7] px-3 text-xs font-medium text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white"
              />
              <button
                type="button"
                onClick={handleAddInventoryCategory}
                disabled={!categoryDraft.trim()}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#0071E3] px-3 text-xs font-extrabold text-white transition-colors hover:bg-[#0051B3] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>

            <div className="divide-y divide-[#E5E5EA] overflow-hidden rounded-xl border border-[#E5E5EA] bg-[#F8F9FA]">
              {inventoryCategories.map((category) => (
                <div key={category} className="flex items-center gap-2 px-3 py-2">
                  {editingCategoryKey === category ? (
                    <input
                      autoFocus
                      value={editingCategoryLabel}
                      onChange={(event) => setEditingCategoryLabel(event.target.value)}
                      onKeyDown={(event) => { if (event.key === 'Enter') handleSaveInventoryCategory(category); if (event.key === 'Escape') setEditingCategoryKey(null); }}
                      className="h-7 min-w-0 flex-1 rounded-lg border border-[#0071E3] bg-white px-2 text-xs font-semibold outline-none"
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#1D1D1F]">{category}</span>
                  )}
                  {editingCategoryKey === category ? (
                    <button type="button" onClick={() => handleSaveInventoryCategory(category)} className="text-[11px] font-extrabold text-[#0071E3]">Save</button>
                  ) : (
                    <button type="button" onClick={() => { setEditingCategoryKey(category); setEditingCategoryLabel(category); }} className="text-[11px] font-extrabold text-[#0071E3]">Edit</button>
                  )}
                  <button
                    type="button"
                    onClick={() => { if (window.confirm(`Delete category “${category}”? It will no longer appear for new inventory parts.`)) { const nextCategories = inventoryCategories.filter((item) => item !== category); onUpdateInventoryCategories?.(nextCategories); setFormData((current) => ({ ...current, inventoryCategories: nextCategories })); } }}
                    className="text-[11px] font-extrabold text-rose-600"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className={`${inventoryDataTab === 'suppliers' ? 'space-y-3' : 'hidden'} border-b border-[#E5E5EA] pb-5`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-extrabold text-[#1D1D1F]">Supplier Name Data</h4>
                <p className="text-[11px] text-[#86868B]">Supplier records used when registering stock parts and RMA claims.</p>
              </div>
              <span className="rounded-full bg-[#0071E3]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#0071E3]">{suppliers.length} suppliers</span>
            </div>

            <form onSubmit={handleAddInventorySupplier} className="grid grid-cols-1 gap-2 rounded-xl border border-[#E5E5EA] bg-[#F8F9FA] p-3 sm:grid-cols-2 lg:grid-cols-5">
              <input required value={supplierDraft.name} onChange={(event) => setSupplierDraft({ ...supplierDraft, name: event.target.value })} placeholder="Supplier name" className="h-9 rounded-lg border border-[#D2D2D7] bg-white px-2.5 text-xs font-semibold outline-none focus:border-[#0071E3]" />
              <input required value={supplierDraft.code} onChange={(event) => setSupplierDraft({ ...supplierDraft, code: event.target.value })} placeholder="Code" className="h-9 rounded-lg border border-[#D2D2D7] bg-white px-2.5 font-mono text-xs outline-none focus:border-[#0071E3]" />
              <input value={supplierDraft.phone} onChange={(event) => setSupplierDraft({ ...supplierDraft, phone: event.target.value })} placeholder="Phone" className="h-9 rounded-lg border border-[#D2D2D7] bg-white px-2.5 text-xs outline-none focus:border-[#0071E3]" />
              <input type="number" min="1" value={supplierDraft.avgRmaTurnaroundDays} onChange={(event) => setSupplierDraft({ ...supplierDraft, avgRmaTurnaroundDays: Number(event.target.value) })} placeholder="RMA days" className="h-9 rounded-lg border border-[#D2D2D7] bg-white px-2.5 text-xs outline-none focus:border-[#0071E3]" />
              <button type="submit" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#0071E3] px-3 text-xs font-extrabold text-white hover:bg-[#0051B3]"><Plus className="h-3.5 w-3.5" /> Add supplier</button>
            </form>

            {editingInventorySupplier && (
              <form onSubmit={(event) => { event.preventDefault(); onUpdateSupplier?.(editingInventorySupplier); setEditingInventorySupplier(null); }} className="grid grid-cols-1 gap-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3 sm:grid-cols-2 lg:grid-cols-5">
                <input required value={editingInventorySupplier.name} onChange={(event) => setEditingInventorySupplier({ ...editingInventorySupplier, name: event.target.value })} className="h-9 rounded-lg border border-blue-200 bg-white px-2.5 text-xs font-semibold outline-none focus:border-[#0071E3]" />
                <input required value={editingInventorySupplier.code} onChange={(event) => setEditingInventorySupplier({ ...editingInventorySupplier, code: event.target.value })} className="h-9 rounded-lg border border-blue-200 bg-white px-2.5 font-mono text-xs outline-none focus:border-[#0071E3]" />
                <input value={editingInventorySupplier.phone} onChange={(event) => setEditingInventorySupplier({ ...editingInventorySupplier, phone: event.target.value })} className="h-9 rounded-lg border border-blue-200 bg-white px-2.5 text-xs outline-none focus:border-[#0071E3]" />
                <input type="number" min="1" value={editingInventorySupplier.avgRmaTurnaroundDays} onChange={(event) => setEditingInventorySupplier({ ...editingInventorySupplier, avgRmaTurnaroundDays: Number(event.target.value) })} className="h-9 rounded-lg border border-blue-200 bg-white px-2.5 text-xs outline-none focus:border-[#0071E3]" />
                <div className="flex gap-2"><button type="submit" className="h-9 flex-1 rounded-lg bg-[#0071E3] text-xs font-extrabold text-white">Save</button><button type="button" onClick={() => setEditingInventorySupplier(null)} className="h-9 rounded-lg border border-[#D2D2D7] px-3 text-xs font-bold">Cancel</button></div>
              </form>
            )}

            <div className="divide-y divide-[#E5E5EA] overflow-hidden rounded-xl border border-[#E5E5EA] bg-white">
              {suppliers.length ? suppliers.map((supplier) => (
                <div key={supplier.id} className="flex items-center gap-3 px-3 py-2.5 text-xs">
                  <Truck className="h-4 w-4 shrink-0 text-[#0071E3]" />
                  <span className="min-w-0 flex-1 truncate font-extrabold text-[#1D1D1F]">{supplier.name}</span>
                  <span className="font-mono text-[10px] text-[#86868B]">{supplier.code}</span>
                  <span className="hidden text-[10px] text-[#86868B] sm:inline">{supplier.avgRmaTurnaroundDays} days</span>
                  <button type="button" onClick={() => setEditingInventorySupplier(supplier)} className="text-[11px] font-extrabold text-[#0071E3]">Edit</button>
                  <button type="button" onClick={() => { if (window.confirm(`Delete supplier “${supplier.name}”?`)) onDeleteSupplier?.(supplier.id); }} className="text-[11px] font-extrabold text-rose-600">Delete</button>
                </div>
              )) : <p className="px-3 py-4 text-center text-xs text-[#86868B]">No suppliers yet.</p>}
            </div>
          </section>

          <section className={`${inventoryDataTab === 'tiers' ? 'space-y-3' : 'hidden'} border-b border-[#E5E5EA] pb-5`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-extrabold text-[#1D1D1F]">Quality Tiers</h4>
                <p className="text-[11px] text-[#86868B]">Shared quality options for every physical inventory part.</p>
              </div>
              <span className="rounded-full bg-purple-100 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-700">{inventoryQualityTiers.length} tiers</span>
            </div>
            <div className="flex gap-2">
              <input value={qualityTierDraft} onChange={(event) => setQualityTierDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleAddInventoryQualityTier(); } }} placeholder="New quality tier" className="h-9 min-w-0 flex-1 rounded-xl border border-[#D2D2D7] bg-[#F5F5F7] px-3 text-xs font-medium outline-none focus:border-[#0071E3] focus:bg-white" />
              <button type="button" onClick={handleAddInventoryQualityTier} disabled={!qualityTierDraft.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-purple-600 px-3 text-xs font-extrabold text-white hover:bg-purple-700 disabled:opacity-45"><Plus className="h-3.5 w-3.5" /> Add</button>
            </div>
            <div className="divide-y divide-[#E5E5EA] overflow-hidden rounded-xl border border-[#E5E5EA] bg-[#F8F9FA]">
              {inventoryQualityTiers.map((tier) => (
                <div key={tier} className="flex items-center gap-2 px-3 py-2">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-purple-600" />
                  {editingQualityTier === tier ? <input autoFocus value={editingQualityTierLabel} onChange={(event) => setEditingQualityTierLabel(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') handleSaveInventoryQualityTier(tier); if (event.key === 'Escape') setEditingQualityTier(null); }} className="h-7 min-w-0 flex-1 rounded-lg border border-purple-300 bg-white px-2 text-xs font-semibold outline-none" /> : <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#1D1D1F]">{tier}</span>}
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#86868B]">{parts.filter((part) => part.qualityTier === tier).length} parts</span>
                  {editingQualityTier === tier ? <button type="button" onClick={() => handleSaveInventoryQualityTier(tier)} className="text-[11px] font-extrabold text-purple-700">Save</button> : <button type="button" onClick={() => { setEditingQualityTier(tier); setEditingQualityTierLabel(tier); }} className="text-[11px] font-extrabold text-[#0071E3]">Edit</button>}
                  <button type="button" onClick={() => handleDeleteInventoryQualityTier(tier)} className="text-[11px] font-extrabold text-rose-600">Delete</button>
                </div>
              ))}
            </div>
          </section>

          <section className={`${inventoryDataTab === 'bins' ? 'space-y-3' : 'hidden'} border-b border-[#E5E5EA] pb-5`}>
            <div className="flex items-center justify-between gap-2">
              <div><h4 className="text-xs font-extrabold text-[#1D1D1F]">Storage Bin Names</h4><p className="text-[11px] text-[#86868B]">Saved bin names appear when registering or editing inventory parts.</p></div>
              <span className="rounded-full bg-[#0071E3]/10 px-2 py-0.5 text-[10px] font-bold text-[#0071E3]">{inventoryBinNames.length} bins</span>
            </div>
            <div className="flex gap-2"><input value={binDraft} onChange={(event) => setBinDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleAddInventoryBin(); } }} placeholder="e.g. BIN-A01" className="h-9 min-w-0 flex-1 rounded-xl border border-[#D2D2D7] bg-[#F5F5F7] px-3 text-xs font-mono font-bold outline-none focus:border-[#0071E3] focus:bg-white" /><button type="button" onClick={handleAddInventoryBin} disabled={!binDraft.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0071E3] px-3 text-xs font-extrabold text-white hover:bg-[#0051B3] disabled:opacity-45"><Plus className="h-3.5 w-3.5" /> Add bin</button></div>
            <div className="space-y-2 rounded-xl border border-[#E5E5EA] bg-[#F8F9FA] p-3">
              {inventoryBinNames.length ? inventoryBinNames.map((bin) => {
                const binParts = partsByBin.get(bin) || [];
                const isOpen = expandedBinName === bin;
                return (
                  <div key={bin} className="rounded-lg border border-[#E5E5EA] bg-white">
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setExpandedBinName((current) => current === bin ? null : bin)}
                        className="inline-flex min-w-0 flex-1 items-center gap-2 text-left"
                        aria-expanded={isOpen}
                        aria-label={`Show parts in ${bin}`}
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#0071E3]" />
                        <span className="truncate font-mono text-xs font-bold text-[#1D1D1F]">{bin}</span>
                        <span className="rounded-full bg-[#F5F5F7] px-2 py-0.5 text-[10px] font-bold text-[#86868B]">{binParts.length} parts</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setExpandedBinName((current) => current === bin ? null : bin)} className="rounded-lg p-1 text-[#86868B] hover:bg-[#F5F5F7]" aria-label={isOpen ? `Collapse ${bin}` : `Expand ${bin}`}>
                          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180 text-[#0071E3]' : ''}`} />
                        </button>
                        <button type="button" onClick={() => onUpdateSettings({ ...settings, inventoryBinNames: inventoryBinNames.filter((item) => item !== bin) })} className="text-rose-600" aria-label={`Delete ${bin}`}>×</button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="border-t border-[#E5E5EA] bg-[#FAFAFA] px-3 py-2">
                        {binParts.length ? (
                          <div className="space-y-1.5">
                            {binParts.map((part) => (
                              <div key={part.id} className="flex items-center justify-between gap-2 rounded-md bg-white px-2.5 py-1.5 text-[11px] text-[#1D1D1F] shadow-sm">
                                <div className="min-w-0">
                                  <p className="truncate font-bold">{part.name}</p>
                                  <p className="truncate font-mono text-[10px] text-[#86868B]">{part.sku}</p>
                                </div>
                                <span className="rounded-full bg-[#0071E3]/10 px-2 py-0.5 text-[10px] font-bold text-[#0071E3]">{part.quantityInStock} stock</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-[#86868B]">No parts are assigned to this bin yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              }) : <p className="text-xs text-[#86868B]">No saved bins yet.</p>}
            </div>
          </section>

          <div className={`${inventoryDataTab === 'rules' ? 'grid' : 'hidden'} grid-cols-1 md:grid-cols-2 gap-5 text-xs`}>
            <div className="space-y-1.5">
              <label className="font-extrabold text-[#1D1D1F] flex items-center space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-[#FF9500]" />
                <span>Global Low Stock Warning Threshold</span>
              </label>
              <input
                type="number"
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: Number(e.target.value) })}
                min="1"
                max="20"
                className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
              />
              <p className="text-[11px] text-[#86868B]">
                Parts with quantity equal to or below this count will trigger amber warning badges across the inventory matrix.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-extrabold text-[#1D1D1F] flex items-center space-x-1.5">
                <Boxes className="w-3.5 h-3.5 text-[#5856D6]" />
                <span>Default Vendor RMA Turnaround (Days)</span>
              </label>
              <input
                type="number"
                value={formData.defaultSupplierSlaDays}
                onChange={(e) => setFormData({ ...formData, defaultSupplierSlaDays: Number(e.target.value) })}
                min="1"
                max="30"
                className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
              />
            </div>

            <div className="md:col-span-2 space-y-3 pt-3 border-t border-[#E5E5EA]">
              <label className="flex items-center space-x-3 cursor-pointer p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] hover:border-[#0071E3] transition-all">
                <input
                  type="checkbox"
                  checked={formData.autoReserveOnAssignment}
                  onChange={(e) => setFormData({ ...formData, autoReserveOnAssignment: e.target.checked })}
                  className="w-4 h-4 text-[#0071E3] rounded focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-extrabold text-[#1D1D1F] text-xs block">Auto-Reserve Parts on Ticket Assignment</span>
                  <span className="text-[11px] text-[#86868B]">Automatically increment reserved part quantities when added to active work orders.</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: POS & Voucher Print Layout */}
      {activeSubTab === 'pos' && (
        <div className="space-y-6">
          {/* Top Banner Header */}
          <div className="bg-gradient-to-r from-[#0071E3]/10 via-[#0071E3]/5 to-transparent p-5 rounded-2xl border border-[#0071E3]/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#0071E3] text-white flex items-center justify-center shrink-0 shadow-md">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-extrabold text-[#1D1D1F]">POS & Document Print Layout Settings</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0071E3] text-white uppercase tracking-wider">
                    A4 & 3"x2" Tag Ready
                  </span>
                </div>
                <p className="text-xs text-[#526375] mt-0.5">
                  Configure official A4 workshop job sheets, customer invoices, and 3"×2" device intake sticker tags for your repair shop.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDeviceTagPrinterOpen(true)}
              className="px-4 py-2 bg-[#0071E3] hover:bg-[#0051B3] text-white font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>Interactive Print Modal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Formats, Branding & Text Fields — collapsible (mobile-friendly) */}
          <div className="bg-white rounded-2xl border border-[#D2D2D7] shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('pos-formats')}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-[#F8F9FA] hover:bg-[#F0F1F4] transition-colors cursor-pointer"
              aria-expanded={isSectionOpen('pos-formats')}
            >
              <span className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                <Printer className="w-4 h-4 text-[#0071E3]" />
                <span>Formats, Branding & Text Fields</span>
              </span>
              <ChevronDown className={`w-4 h-4 text-[#86868B] transition-transform ${isSectionOpen('pos-formats') ? '' : 'rotate-180'}`} />
            </button>
            {isSectionOpen('pos-formats') && (
            <div className="space-y-6 p-4">
            {/* Connected Store Branding Status Card — sourced only from Shop Settings. */}
            <div className="bg-white p-4 rounded-2xl border border-[#D2D2D7] shadow-2xs flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start space-x-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#F8FBFD] border border-[#D8E5ED] p-1 flex items-center justify-center shrink-0 shadow-2xs">
                  {formData.shopLogoUrl ? (
                    <img
                      src={formData.shopLogoUrl}
                      alt="Shop Logo"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <Store className="w-6 h-6 text-[#0071E3]" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-extrabold text-[#86868B] uppercase tracking-wider">Connected Store Branding</span>
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700">Shop Settings source</span>
                  </div>
                  <p className="font-extrabold text-sm text-[#1D1D1F]">{formData.shopName || 'AppleRepair Pro'}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-[#86868B]">
                    {visibleStorePhones.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0 text-[#0071E3]" />
                        <span>{visibleStorePhones.join(' • ')}</span>
                      </span>
                    )}
                    {formData.shopEmail && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3 shrink-0 text-[#0071E3]" />
                        <span>{formData.shopEmail}</span>
                      </span>
                    )}
                    {formData.shopWebsite && (
                      <span className="inline-flex items-center gap-1">
                        <Globe className="h-3 w-3 shrink-0 text-[#0071E3]" />
                        <span>{formData.shopWebsite}</span>
                      </span>
                    )}
                    {formData.shopAddress && (
                      <span className="inline-flex min-w-0 basis-full items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0 text-[#0071E3]" />
                        <span className="truncate">{formData.shopAddress}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubTab('shop')}
                className="px-3 py-1.5 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#0071E3] font-extrabold text-xs rounded-xl border border-[#D2D2D7] transition-all flex items-center space-x-1 shrink-0 cursor-pointer"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Edit Shop Profile</span>
              </button>
            </div>

            {/* Standard Format Selection Cards */}
            <div className="bg-white p-5 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-[#1D1D1F] text-xs flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-[#0071E3]" />
                  <span>Primary Print Layout Standards</span>
                </label>
                <span className="text-[10px] font-bold text-[#86868B]">No thermal printer required</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Option 1: A4 Document */}
                <div 
                  className="p-4 rounded-xl border-2 border-[#0071E3] bg-[#F8FBFD] transition-all relative space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center font-bold">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#0071E3] text-white uppercase">
                      Active Standard
                    </span>
                  </div>
                  <div>
                    <span className="font-extrabold text-[#1D1D1F] block text-xs">Standard A4 Workshop Sheet</span>
                    <p className="text-[11px] text-[#526375] mt-1 leading-snug">
                      Itemized job sheets, diagnostic reports, and customer tax invoices on standard A4 paper.
                    </p>
                  </div>
                  <div className="pt-1 flex items-center space-x-2 text-[10px] font-bold text-[#0071E3]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Full 21-Point QA & Signatures</span>
                  </div>
                </div>

                {/* Option 2: 3"x2" Sticker Tag */}
                <div 
                  onClick={() => setIsDeviceTagPrinterOpen(true)}
                  className="p-4 rounded-xl border border-[#D2D2D7] bg-white hover:border-[#0071E3] hover:bg-[#F8FBFD] transition-all cursor-pointer space-y-2 group shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:bg-[#0071E3]/10 group-hover:text-[#0071E3] transition-all">
                      <Tag className="w-4 h-4" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                      Intake Tag
                    </span>
                  </div>
                  <div>
                    <span className="font-extrabold text-[#1D1D1F] block text-xs group-hover:text-[#0071E3] transition-colors">3" × 2" Device Sticker Label</span>
                    <p className="text-[11px] text-[#7F7F7F] mt-1 leading-snug">
                      Compact label sticker format with QR code and barcode for physical hardware tagging.
                    </p>
                  </div>
                  <div className="pt-1 flex items-center space-x-2 text-[10px] font-bold text-slate-600 group-hover:text-[#0071E3]">
                    <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Scannable IMEI & QR Tracking</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Text Fields: Receipt Header & Disclaimer */}
            <div className="bg-white p-5 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-4">
              <h4 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider">
                Voucher Text & Disclaimer Customization
              </h4>
              <p className="text-[11px] text-[#86868B] -mt-2">
                Used by POS receipts and every A4 Device Intake Print Voucher after you save all settings.
              </p>

              <div className="grid grid-cols-1 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-extrabold text-[#1D1D1F]">Receipt & Voucher Header Subtitle</label>
                  <input
                    type="text"
                    value={formData.receiptHeaderTitle}
                    onChange={(e) => setFormData({ ...formData, receiptHeaderTitle: e.target.value })}
                    className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3.5 py-2.5 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3] transition-all"
                    placeholder="e.g. Official ACMT Certified Service Voucher"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-[#1D1D1F]">Receipt Footer Terms & Warranty Note</label>
                  <textarea
                    ref={receiptFooterEditorRef}
                    value={formData.receiptFooterNote}
                    onChange={(e) => handleReceiptFooterChange(e.target.value, e.currentTarget)}
                    onClick={(e) => updateSelectedFooterLines(e.currentTarget)}
                    onKeyUp={(e) => updateSelectedFooterLines(e.currentTarget)}
                    onSelect={(e) => updateSelectedFooterLines(e.currentTarget)}
                    rows={2.5}
                    className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3.5 py-2.5 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3] transition-all"
                    placeholder="e.g. Thank you for choosing AppleRepair! All repairs covered by warranty under standard terms."
                  />
                  <p className="text-[10px] text-[#86868B]">Plain text only. Select text in a line (or place the cursor there), then choose its alignment. Line breaks and text size are kept in the A4 print.</p>

                  <div className="flex flex-col gap-1.5 rounded-lg border border-[#E5E5EA] bg-[#F8F9FA] p-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-1">
                      <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-[#526375]">
                        <AlignLeft className="h-3 w-3" />
                        Selected line
                      </span>
                      <div className="flex rounded-md border border-[#D2D2D7] bg-white p-0.5">
                        {RECEIPT_FOOTER_ALIGNMENT_OPTIONS.map(({ value, label, Icon }) => {
                          const isActive = selectedFooterAlignment === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => applyReceiptFooterAlignment(value)}
                              style={{ height: 24, minHeight: 24, fontSize: 9, lineHeight: 1 }}
                              className={`flex h-6 items-center gap-0.5 rounded px-1.5 text-[9px] font-bold transition-colors ${
                                isActive ? 'bg-[#0071E3] text-white' : 'text-[#526375] hover:bg-[#F5F5F7]'
                              }`}
                              aria-pressed={isActive}
                              title={`Align selected line(s) ${label}`}
                            >
                              <Icon className="h-2.5 w-2.5" />
                              <span>{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="flex items-center gap-0.5 text-[9px] font-extrabold text-[#526375]">
                        <Type className="h-3 w-3" />
                        Text size
                      </span>
                      <div className="flex rounded-md border border-[#D2D2D7] bg-white p-0.5">
                        {RECEIPT_FOOTER_SIZE_OPTIONS.map(({ value, label }) => {
                          const isActive = (formData.receiptFooterFontSize || 'medium') === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => applyReceiptFooterTextSize(value)}
                              style={{ height: 24, minHeight: 24, fontSize: 9, lineHeight: 1 }}
                              className={`h-6 rounded px-1.5 text-[9px] font-bold transition-colors ${
                                isActive ? 'bg-[#0071E3] text-white' : 'text-[#526375] hover:bg-[#F5F5F7]'
                              }`}
                              aria-pressed={isActive}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div
                    data-testid="receipt-footer-live-preview"
                    className="min-h-[72px] rounded-lg border border-dashed border-[#D2D2D7] bg-white px-3 py-2.5 shadow-inner"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-[9px] font-extrabold uppercase tracking-wide text-[#86868B]">
                      <span>Live A4 footer preview</span>
                      <span>Updates as you edit</span>
                    </div>
                    <div className="min-h-8 text-[#1D1D1F]">
                      {receiptFooterPreviewLines.map((line, lineIndex) => {
                        const lineStart = receiptFooterPreviewLines.slice(0, lineIndex).reduce((offset, previousLine) => offset + previousLine.length + 1, 0);
                        return (
                        <p
                          key={`${lineIndex}-${line}`}
                          className="min-h-3 leading-tight"
                          style={{
                            fontSize: receiptFooterPreviewFontSize,
                            textAlign: formData.receiptFooterLineAlignments?.[lineIndex] || formData.receiptFooterTextAlign || 'left',
                          }}
                        >
                          {line ? splitFooterTextBySize(line, lineStart, formData.receiptFooterTextSizeRanges || [], formData.receiptFooterFontSize || 'medium').map((segment, segmentIndex) => (
                            <span key={`${segmentIndex}-${segment.text}`} style={{ fontSize: ({ small: 10, medium: 11, large: 12 } as const)[segment.size] }}>{segment.text}</span>
                          )) : '\u00A0'}
                        </p>
                      ); })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
            )}
          </div>

          {/* Dedicated A4 Print Voucher & Job Sheet Defaults Block */}
          <div className="bg-white p-5 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-5">
            <div>
              <h4 className="text-xs font-black text-[#1D1D1F] uppercase tracking-wider flex items-center space-x-2">
                <Printer className="w-4 h-4 text-[#0071E3]" />
                <span>A4 Intake Print Voucher & Job Sheet Defaults</span>
              </h4>
              <p className="text-[11px] text-[#86868B] mt-0.5">
                Configure the saved defaults used by every Device Intake Print Voucher. Changes apply after you save all settings.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-[#1D1D1F] block">Default Print Color Palette</label>
                <select
                  value={formData.a4PrintColorMode || 'monochrome'}
                  onChange={(e) => setFormData({ ...formData, a4PrintColorMode: e.target.value as any })}
                  className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
                >
                  <option value="monochrome">Black & White / Grayscale (Ink-Saver)</option>
                  <option value="color">Standard Color</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#1D1D1F] block">Default A4 Sheet Layout</label>
                <select
                  value={formData.a4PrintLayoutDensity || 'compact'}
                  onChange={(e) => setFormData({ ...formData, a4PrintLayoutDensity: e.target.value as any })}
                  className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
                >
                  <option value="standard">Standard Single A4 Page</option>
                  <option value="compact">Compact Single A4 Page</option>
                  <option value="dual_voucher">Dual Cut Voucher (Cust + Shop Copy)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#1D1D1F] block">Voucher Header Subtitle</label>
                <input
                  type="text"
                  value={formData.a4CustomHeaderNote || 'Official Device Intake & Hardware Diagnostic Voucher'}
                  onChange={(e) => setFormData({ ...formData, a4CustomHeaderNote: e.target.value })}
                  className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#1D1D1F] block">21-Point Diagnostic Layout</label>
                <select
                  value={formData.a4DiagnosticDisplayFormat || 'comparison_table'}
                  onChange={(e) => setFormData({ ...formData, a4DiagnosticDisplayFormat: e.target.value as SystemSettings['a4DiagnosticDisplayFormat'] })}
                  className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
                >
                  <option value="comparison_table">Before vs After Table</option>
                  <option value="dual_grid">Before & After Dual Cards</option>
                  <option value="before_only">Before Repair Only</option>
                  <option value="after_only">After QA Pass Only</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <label className="flex items-center space-x-2.5 p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] cursor-pointer hover:border-[#0071E3] transition-all">
                <input
                  type="checkbox"
                  checked={formData.a4ShowDiagnosticsTable ?? true}
                  onChange={(e) => setFormData({ ...formData, a4ShowDiagnosticsTable: e.target.checked })}
                  className="w-4 h-4 text-[#0071E3] rounded focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-[#1D1D1F] text-xs block">Include 21-Point Diagnostics</span>
                  <span className="text-[10px] text-[#86868B]">Print pre-repair diagnostic inspection grid.</span>
                </div>
              </label>

              <label className="flex items-center space-x-2.5 p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] cursor-pointer hover:border-[#0071E3] transition-all">
                <input
                  type="checkbox"
                  checked={formData.a4ShowPricingTable ?? true}
                  onChange={(e) => setFormData({ ...formData, a4ShowPricingTable: e.target.checked })}
                  className="w-4 h-4 text-[#0071E3] rounded focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-[#1D1D1F] text-xs block">Include Service & Price Matrix</span>
                  <span className="text-[10px] text-[#86868B]">Print requested repair charges & subtotal.</span>
                </div>
              </label>

              <label className="flex items-center space-x-2.5 p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] cursor-pointer hover:border-[#0071E3] transition-all">
                <input
                  type="checkbox"
                  checked={formData.a4ShowTermsDisclaimer ?? true}
                  onChange={(e) => setFormData({ ...formData, a4ShowTermsDisclaimer: e.target.checked })}
                  className="w-4 h-4 text-[#0071E3] rounded focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-[#1D1D1F] text-xs block">Include Terms & Signatures</span>
                  <span className="text-[10px] text-[#86868B]">Print disclaimer and authorization lines.</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab: SMS & Telegram Notification Templates */}
            {activeSubTab === 'notifications' && (
        <Suspense fallback={<ModuleLoadingSkeleton />}>
          <TabNotificationsLazy formData={formData} setFormData={setFormData} isSectionOpen={isSectionOpen} toggleSection={toggleSection} currentNotificationTemplates={currentNotificationTemplates} handleUpdateTemplateField={handleUpdateTemplateField} handleInsertVariable={handleInsertVariable} handleAddCustomNotificationTemplate={handleAddCustomNotificationTemplate} handleDeleteNotificationTemplate={handleDeleteNotificationTemplate} handleResetNotificationTemplates={handleResetNotificationTemplates} samplePrintWorkOrder={SAMPLE_PRINT_WORK_ORDER} />
        </Suspense>
      )}      {activeSubTab === 'qa' && (
        <Suspense fallback={<ModuleLoadingSkeleton />}>
          <TabQaLazy formData={formData} setFormData={setFormData} />
        </Suspense>
      )}{activeSubTab === 'recycle' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E5E5EA] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5EA]">
            <div>
              <h3 className="text-base font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                <Trash2 className="w-5 h-5 text-[#FF3B30]" />
                <span>Recycle Bin & Archive Management</span>
              </h3>
              <p className="text-xs text-[#86868B] mt-1">
                Manage deleted repair work orders and archived customer records. Restore accidentally deleted items or permanently purge them.
              </p>
            </div>

            {onOpenRecycleBin && (
              <button
                type="button"
                onClick={onOpenRecycleBin}
                className="px-4 py-2.5 bg-[#FF3B30] hover:bg-[#D70015] text-white font-extrabold text-xs rounded-xl transition-all shadow-2xs flex items-center space-x-2 shrink-0 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Open Recycle Bin ({archivedCount})</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#F5F5F7] rounded-xl border border-[#E5E5EA] space-y-1">
              <span className="text-xs text-[#86868B] font-bold block">Archived Work Orders</span>
              <span className="text-2xl font-black text-[#1D1D1F]">{archivedCount}</span>
              <p className="text-[11px] text-[#86868B]">Tickets currently held in the trash vault.</p>
            </div>

            <div className="p-4 bg-[#F5F5F7] rounded-xl border border-[#E5E5EA] space-y-1">
              <span className="text-xs text-[#86868B] font-bold block">Restoration Policy</span>
              <span className="text-sm font-extrabold text-[#34C759]">Instant Recovery</span>
              <p className="text-[11px] text-[#86868B]">Restored tickets return seamlessly to their active pipeline stage.</p>
            </div>

            <div className="p-4 bg-[#F5F5F7] rounded-xl border border-[#E5E5EA] space-y-1">
              <span className="text-xs text-[#86868B] font-bold block">Action Manager</span>
              {onOpenRecycleBin ? (
                <button
                  type="button"
                  onClick={onOpenRecycleBin}
                  className="mt-2 text-xs font-bold text-[#0071E3] hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <span>Launch Recycle Bin Modal →</span>
                </button>
              ) : (
                <span className="text-xs text-[#86868B]">No items pending action</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Technician Modal */}
      {techModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 border border-[#D2D2D7] shadow-2xl animate-scale-in my-8">
            <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-purple-50 text-[#AF52DE] rounded-lg">
                  <Award className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-[#1D1D1F]">
                    {editingTech ? 'Edit Technician Record' : 'Add New Technical Staff'}
                  </h3>
                  <p className="text-[11px] text-[#86868B]">
                    {editingTech ? 'Update staff details and commission rates' : 'Register a new technician on the roster'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTechModalOpen(false)}
                className="p-1.5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTechSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#1D1D1F] block mb-1.5">Technician Full Name *</label>
                <input
                  type="text"
                  required
                  value={techFormData.name}
                  onChange={(e) => setTechFormData({ ...techFormData, name: e.target.value })}
                  placeholder="e.g. Alex Rivera"
                  className="w-full h-10 bg-[#F5F5F7] text-[#1D1D1F] font-medium px-3 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-[#86868B] uppercase tracking-wider">Contact Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#1D1D1F] block mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={techFormData.email}
                      onChange={(e) => setTechFormData({ ...techFormData, email: e.target.value })}
                      placeholder="alex@applerepairpro.com"
                      className="w-full h-10 bg-[#F5F5F7] text-[#1D1D1F] font-medium px-3 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#1D1D1F] block mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      value={techFormData.phone}
                      onChange={(e) => setTechFormData({ ...techFormData, phone: e.target.value })}
                      placeholder="+95 9 700 000 000"
                      className="w-full h-10 bg-[#F5F5F7] text-[#1D1D1F] font-medium px-3 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-[#86868B] uppercase tracking-wider">Role & Status</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#1D1D1F] block mb-1.5">Skill Tier Level</label>
                    <CustomDropdownMenu
                      value={techFormData.level}
                      onChange={(level) => setTechFormData({ ...techFormData, level: level as TechnicianLevel })}
                      options={[
                        { value: 'Level 1 Spareparts', label: 'Level 1 Spareparts' },
                        { value: 'Level 2 Spareparts + Hardware', label: 'Level 2 Spareparts + Hardware' },
                        { value: 'Level 3 Master', label: 'Level 3 Master' },
                      ]}
                      className="w-full"
                      buttonClassName="!w-full !h-10 !rounded-xl !border-[#D2D2D7] !bg-[#F5F5F7] !px-3"
                      menuAlign="left"
                      size="md"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#1D1D1F] block mb-1.5">Status</label>
                    <select
                      value={techFormData.status}
                      onChange={(e) => setTechFormData({ ...techFormData, status: e.target.value as any })}
                      className="w-full h-10 bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
                    >
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1D1D1F] block mb-1.5">Specialty / Hardware Focus</label>
                <input
                  type="text"
                  value={techFormData.specialty}
                  onChange={(e) => setTechFormData({ ...techFormData, specialty: e.target.value })}
                  placeholder="e.g. MacBook Logic Boards, Display Repair"
                  className="w-full h-10 bg-[#F5F5F7] text-[#1D1D1F] font-medium px-3 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-[#86868B] uppercase tracking-wider">Commission Rates</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-xl p-3">
                    <label className="font-bold text-[#1D1D1F] block mb-1.5">Spareparts Change (%)</label>
                    <input
                      type="number"
                      value={techFormData.commissionRateParts}
                      onChange={(e) => setTechFormData({ ...techFormData, commissionRateParts: Number(e.target.value) })}
                      min="0"
                      max="50"
                      className="w-full h-9 bg-white text-[#1D1D1F] font-bold px-3 rounded-lg border border-[#D2D2D7] focus:outline-none focus:border-[#0071E3]"
                    />
                    <p className="text-[10px] text-[#86868B] mt-1.5">Standard Modular (parts-swap) jobs</p>
                  </div>

                  <div className="bg-[#F8F9FA] border border-[#E5E5EA] rounded-xl p-3">
                    <label className="font-bold text-[#1D1D1F] block mb-1.5">Hardware Repair (%)</label>
                    <input
                      type="number"
                      value={techFormData.commissionRateHardware}
                      onChange={(e) => setTechFormData({ ...techFormData, commissionRateHardware: Number(e.target.value) })}
                      min="0"
                      max="50"
                      className="w-full h-9 bg-white text-[#1D1D1F] font-bold px-3 rounded-lg border border-[#D2D2D7] focus:outline-none focus:border-[#0071E3]"
                    />
                    <p className="text-[10px] text-[#86868B] mt-1.5">Micro-Soldering (board-level) jobs</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={() => setTechModalOpen(false)}
                  className="px-4 py-2 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0071E3] hover:bg-[#0051B3] text-white font-extrabold rounded-xl shadow-2xs cursor-pointer active:scale-95"
                >
                  {editingTech ? 'Update Record' : 'Save Technician'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Technician Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 border border-[#D2D2D7] shadow-xl animate-scale-in">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-extrabold text-sm text-[#1D1D1F]">Delete Technician?</h3>
            </div>
            <p className="text-xs text-[#86868B]">
              Are you sure you want to remove this technician from the system roster? Active tickets assigned to them will remain in the pipeline.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 bg-[#F5F5F7] text-[#1D1D1F] font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteTech(deleteConfirmId)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-2xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 border border-[#D2D2D7] shadow-2xl animate-scale-in my-8">
            <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-blue-50 text-[#0071E3] rounded-lg">
                  <UserPlus className="w-5 h-5" />
                </span>
                <h3 className="font-extrabold text-base text-[#1D1D1F]">
                  {editingUser ? 'Edit User Account & Permissions' : 'Add New System User'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="p-1 text-[#86868B] hover:text-[#1D1D1F] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* User Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#1D1D1F] block">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    placeholder="e.g. Mg Mg or Daw Thin"
                    className="w-full px-3 py-2 rounded-xl border border-[#D2D2D7] focus:outline-none focus:border-[#0071E3] font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#1D1D1F] block">Email Address</label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="user@applerepairpro.com"
                    className="w-full px-3 py-2 rounded-xl border border-[#D2D2D7] focus:outline-none focus:border-[#0071E3] font-medium"
                  />
                </div>
              </div>

              {/* Phone & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#1D1D1F] block">Phone Number</label>
                  <input
                    type="text"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    placeholder="+95 9 123 456 789"
                    className="w-full px-3 py-2 rounded-xl border border-[#D2D2D7] focus:outline-none focus:border-[#0071E3] font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#1D1D1F] block">Account Status</label>
                  <select
                    value={userFormData.status}
                    onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-[#D2D2D7] focus:outline-none focus:border-[#0071E3] font-bold bg-white"
                  >
                    <option value="Active">Active User</option>
                    <option value="Inactive">Inactive / Suspended</option>
                  </select>
                </div>
              </div>

              {/* Role Selector */}
              <div className="space-y-2 pt-2 border-t border-[#E5E5EA]">
                <label className="font-extrabold text-[#1D1D1F] block">
                  Select User Role <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
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
                        : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:bg-purple-50/50'
                    }`}
                  >
                    <div className="text-base mb-0.5">👑</div>
                    <div>Admin</div>
                  </button>

                  <button
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
                        : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="text-base mb-0.5">🔧</div>
                    <div>Technician</div>
                  </button>

                  <button
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
                        : 'bg-white border-[#D2D2D7] text-[#1D1D1F] hover:bg-amber-50/50'
                    }`}
                  >
                    <div className="text-base mb-0.5">📋</div>
                    <div>Reception</div>
                  </button>
                </div>
              </div>

              {/* Technician Link (If Technician Role selected) */}
              {userFormData.role === 'Technician' && (
                <div className="space-y-1 p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                  <label className="font-extrabold text-blue-900 block">
                    Link to Technician Profile (For Ticket Assignment & Payouts)
                  </label>
                  <select
                    value={userFormData.technicianId}
                    onChange={(e) => setUserFormData({ ...userFormData, technicianId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-blue-300 focus:outline-none focus:border-[#0071E3] font-bold bg-white text-blue-950"
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
              <div className="space-y-2 pt-2 border-t border-[#E5E5EA]">
                <label className="font-extrabold text-[#1D1D1F] block">
                  Permissions & Capabilities
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#F5F5F7] p-3 rounded-xl border border-[#E5E5EA]">
                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-[#1D1D1F]">
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
                      className="rounded text-[#0071E3] focus:ring-[#0071E3]"
                    />
                    <span>Delete Work Orders & Tasks</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-[#1D1D1F]">
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
                      className="rounded text-[#0071E3] focus:ring-[#0071E3]"
                    />
                    <span>Delete Parts & Stock</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-[#1D1D1F]">
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
                      className="rounded text-[#0071E3] focus:ring-[#0071E3]"
                    />
                    <span>Delete Customer Records</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-[#1D1D1F]">
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
                      className="rounded text-[#0071E3] focus:ring-[#0071E3]"
                    />
                    <span>Access System Settings</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-[#1D1D1F]">
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
                      className="rounded text-[#0071E3] focus:ring-[#0071E3]"
                    />
                    <span>Access Finance & P&L</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-[#1D1D1F]">
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
                      className="rounded text-[#0071E3] focus:ring-[#0071E3]"
                    />
                    <span>Modify Price Catalog</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 border-t border-[#E5E5EA] pt-3">
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="px-4 py-2 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveUser}
                className="px-4 py-2 bg-[#0071E3] hover:bg-[#0051B3] text-white font-extrabold text-xs rounded-xl shadow-2xs cursor-pointer active:scale-95"
              >
                {editingUser ? 'Save Changes' : 'Create User Account'}
              </button>
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
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E5EA] bg-white/95 backdrop-blur-sm px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
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
              className="flex-1 bg-[#0071E3] hover:bg-[#0051B3] text-white"
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
