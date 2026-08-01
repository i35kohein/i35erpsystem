import React, { useRef, useState } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { Technician, SystemSettings, TechnicianLevel, PaymentMethodConfig, WorkOrder, NotificationTemplate, AppUser, UserRole, UserPermissions } from '../../types';
import { DEFAULT_PAYMENT_METHODS, getActivePaymentMethods, DEFAULT_NOTIFICATION_TEMPLATES } from '../../data/seedData';
import { useTheme, THEME_PRESETS, ThemeMode } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { CustomDropdownMenu } from '../common/CustomDropdownMenu';
import { QRCodeSVG } from 'qrcode.react';
import { DeviceTagPrinterModal } from '../common/DeviceTagPrinterModal';
import { RepairCategoryDef } from '../../types/priceCatalog';

interface SystemManagementSettingsModuleProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  technicians: Technician[];
  onAddTechnician: (tech: Technician) => void;
  onUpdateTechnician: (tech: Technician) => void;
  onDeleteTechnician: (id: string) => void;
  repairCategories?: RepairCategoryDef[];
  onAddRepairCategory?: (key: string, label: string, group: RepairCategoryDef['group']) => void;
  onUpdateRepairCategory?: (key: string, label: string) => void;
  onDeleteRepairCategory?: (key: string) => void;
  users?: AppUser[];
  onAddUser?: (user: AppUser) => void;
  onUpdateUser?: (user: AppUser) => void;
  onDeleteUser?: (id: string) => void;
  currentUser?: AppUser;
  onOpenRecycleBin?: () => void;
  archivedCount?: number;
  onRegisterActions?: (actions: { reset: () => void; save: () => void }) => void;
  initialSubTab?: 'users' | 'ai';
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
  repairCategories = [],
  onAddRepairCategory,
  onUpdateRepairCategory,
  onDeleteRepairCategory,
  users = [],
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  currentUser,
  onOpenRecycleBin,
  archivedCount = 0,
  onRegisterActions,
  initialSubTab,
}) => {
  const { theme, setTheme, geometry, setGeometry } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'shop' | 'theme' | 'users' | 'technicians' | 'intake' | 'pricing' | 'payment' | 'inventory' | 'pos' | 'notifications' | 'qa' | 'recycle' | 'ai'>(initialSubTab || 'users');

  
  // Local settings draft state
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [isSavedBanner, setIsSavedBanner] = useState(false);
  const [isDeviceTagPrinterOpen, setIsDeviceTagPrinterOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState('');
  const [categoryGroup, setCategoryGroup] = useState<RepairCategoryDef['group']>('Display');
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [editingCategoryLabel, setEditingCategoryLabel] = useState('');
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
      alert('You must keep at least one notification template.');
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
      alert('Please enter user name.');
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
  }>({
    name: '',
    email: '',
    phone: '',
    level: 'Level 1 Spareparts',
    specialty: '',
    status: 'Active',
    commissionRate: 10,
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
    if (!label || !onAddRepairCategory) return;
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    onAddRepairCategory(key, label, categoryGroup);
    setCategoryDraft('');
  };

  const handleSaveInventoryCategory = (key: string) => {
    const label = editingCategoryLabel.trim();
    if (!label || !onUpdateRepairCategory) return;
    onUpdateRepairCategory(key, label);
    setEditingCategoryKey(null);
    setEditingCategoryLabel('');
  };

  return (
    <div className="space-y-3">
      {/* Save Toast Notification */}
      {isSavedBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Settings saved and sent to Supabase. The header database icon shows any pending offline sync.</span>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs - Grid Display showing ALL available menus */}
      <div className="bg-[#F5F5F7] p-2 rounded-2xl border border-[#E5E5EA] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2 w-full text-xs shadow-2xs">
        {[
          { id: 'users', label: 'User Roles & Permissions', icon: UserPlus, badge: users.length },
          { id: 'shop', label: 'Shop Settings & Logo', icon: Store },
          { id: 'theme', label: 'Theme & Color Palette', icon: Palette },
          { id: 'technicians', label: 'Technicians & Staff', icon: Users, badge: technicians.length },
          { id: 'intake', label: 'Work Orders & Intake', icon: FileText },
          { id: 'pricing', label: 'Pricing & Currency', icon: DollarSign },
          { id: 'payment', label: 'Payment Methods & MM QR', icon: CreditCard },
          { id: 'inventory', label: 'Inventory & Stock Alerts', icon: Boxes },
          { id: 'pos', label: 'POS & Receipt Layout', icon: Printer },
          { id: 'notifications', label: 'SMS & Telegram Alerts', icon: BellRing },
          { id: 'ai', label: 'AI Assistant & API', icon: Sparkles },
          { id: 'qa', label: 'QA & Diagnostic Rules', icon: ShieldCheck },
          { id: 'recycle', label: 'Recycle Bin & Trash', icon: Trash2, badge: archivedCount },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-start space-x-2 cursor-pointer border select-none active:scale-95 w-full ${
                isActive
                  ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ml-auto shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#E5E5EA] text-[#1D1D1F]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab: AI Assistant Provider */}
      {activeSubTab === 'ai' && (
        <div className="bg-white p-6 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-5">
          <div className="pb-4 border-b border-[#E5E5EA]">
            <h3 className="text-base font-extrabold text-[#1D1D1F] flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-[#0071E3]" />
              <span>ERP AI Assistant & API Provider</span>
            </h3>
            <p className="text-xs text-[#86868B] mt-1">
              Connect a mainstream model or any OpenAI-compatible endpoint. Local Analysis works without an API key.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5 text-xs font-bold text-[#1D1D1F]">
              <span>Provider</span>
              <select
                value={formData.aiProvider || 'local'}
                onChange={(event) => {
                  const aiProvider = event.target.value as SystemSettings['aiProvider'];
                  setFormData({ ...formData, aiProvider, aiApiKey: aiProvider === 'deepseek' ? '' : formData.aiApiKey });
                }}
                className="w-full p-2.5 border border-[#E5E5EA] rounded-xl bg-white"
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

            <label className="space-y-1.5 text-xs font-bold text-[#1D1D1F]">
              <span>Model</span>
              <input
                value={formData.aiModel || ''}
                onChange={(event) => setFormData({ ...formData, aiModel: event.target.value })}
                placeholder={formData.aiProvider === 'deepseek' ? 'deepseek-chat (default)' : 'Leave blank for provider default'}
                className="w-full p-2.5 border border-[#E5E5EA] rounded-xl bg-white"
              />
            </label>

            {formData.aiProvider === 'deepseek' ? (
              <div className="space-y-1.5 text-xs font-bold text-[#1D1D1F]">
                <span>DeepSeek API Key</span>
                <div className="min-h-[42px] px-3 py-2.5 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-xl flex items-center">
                  Server environment key in use — no browser key required.
                </div>
              </div>
            ) : (
              <label className="space-y-1.5 text-xs font-bold text-[#1D1D1F]">
                <span>API Key</span>
                <input
                  type="password"
                  value={formData.aiApiKey || ''}
                  onChange={(event) => setFormData({ ...formData, aiApiKey: event.target.value })}
                  placeholder={formData.aiProvider === 'local' ? 'Not required for Local Analysis' : 'Provider API key'}
                  disabled={formData.aiProvider === 'local'}
                  autoComplete="off"
                  className="w-full p-2.5 border border-[#E5E5EA] rounded-xl bg-white disabled:opacity-50"
                />
              </label>
            )}

            <label className="space-y-1.5 text-xs font-bold text-[#1D1D1F]">
              <span>Custom Base URL</span>
              <input
                value={formData.aiBaseUrl || ''}
                onChange={(event) => setFormData({ ...formData, aiBaseUrl: event.target.value })}
                placeholder="https://your-api.example.com/v1"
                className="w-full p-2.5 border border-[#E5E5EA] rounded-xl bg-white"
              />
            </label>
          </div>

          <label className="block space-y-1.5 text-xs font-bold text-[#1D1D1F]">
            <span>Assistant Instructions</span>
            <textarea
              rows={3}
              value={formData.aiSystemPrompt || ''}
              onChange={(event) => setFormData({ ...formData, aiSystemPrompt: event.target.value })}
              className="w-full p-2.5 border border-[#E5E5EA] rounded-xl bg-white resize-y"
            />
          </label>

          <div className="p-3 bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl text-[11px] text-[#86868B]">
            The assistant sends a compact live operational summary to the selected provider. API credentials are used only for requests initiated from this ERP assistant. For shared production use, keep keys in server-side secrets instead of browser-synced settings.
          </div>
        </div>
      )}

      {/* Tab: User Roles & Permissions */}
      {activeSubTab === 'users' && (
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

              <button
                type="button"
                onClick={handleOpenAddUser}
                className="px-4 py-2 bg-[#0071E3] hover:bg-[#0051B3] text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add New User Account</span>
              </button>
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

        <div className="space-y-6">
          {/* Shop Branding & Logo Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E5EA] shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-extrabold text-[#2C3E50] flex items-center space-x-2">
                <Store className="w-5 h-5 text-[#0071E3]" />
                <span>Shop Identity & Logo Settings</span>
              </h3>
              <p className="text-xs text-[#7F7F7F] mt-1">
                Customize your store name and upload a shop logo. Saved details apply globally across the sidebar navigation, header, vouchers, invoices, and POS receipts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Logo Upload & Preview Box (4 cols) */}
              <div className="md:col-span-4 bg-[#F8FBFD] p-5 rounded-2xl border border-[#D8E5ED] space-y-4 text-center">
                <label className="block text-xs font-bold text-[#2C3E50]">Shop Logo Preview</label>
                
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-[#0071E3]/40 p-2 flex items-center justify-center shadow-xs relative group overflow-hidden">
                    {formData.shopLogoUrl ? (
                      <img
                        src={formData.shopLogoUrl}
                        alt="Shop Logo Preview"
                        className="w-full h-full object-contain rounded-xl"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[#86868B] space-y-1">
                        <ImageIcon className="w-8 h-8 text-[#0071E3]/60" />
                        <span className="text-[10px] font-bold">No Logo Set</span>
                      </div>
                    )}
                  </div>

                  {formData.shopLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, shopLogoUrl: '' })}
                      className="text-[11px] font-bold text-red-500 hover:text-red-700 flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove Logo</span>
                    </button>
                  )}
                </div>

                {/* Upload File Input */}
                <div className="space-y-2">
                  <label className="w-full py-2.5 px-3 bg-[#0071E3] hover:bg-[#0051B3] text-white font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center justify-center space-x-2 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Upload Logo Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData({ ...formData, shopLogoUrl: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  <p className="text-[10px] text-[#86868B]">PNG, JPG, SVG or WEBP up to 2MB</p>
                </div>
              </div>

              {/* Logo URL & Shop Name Inputs (8 cols) */}
              <div className="md:col-span-8 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#2C3E50] mb-1.5">
                    Shop Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.shopName || ''}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    placeholder="e.g. AppleRepair Pro Lab"
                    className="w-full p-2.5 bg-white border border-[#E5E5EA] rounded-xl text-xs font-bold text-[#1D1D1F] focus:outline-none focus:border-[#0071E3]"
                  />
                  <p className="text-[10px] text-[#86868B] mt-1">
                    Appears in top sidebar brand header, repair tickets, and customer documents.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2C3E50] mb-1.5">
                    Shop Logo Image URL (Alternative to File Upload)
                  </label>
                  <input
                    type="text"
                    value={formData.shopLogoUrl || ''}
                    onChange={(e) => setFormData({ ...formData, shopLogoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png or data:image/png..."
                    className="w-full p-2.5 bg-white border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:outline-none focus:border-[#0071E3]"
                  />
                </div>

                {/* Quick Preset Logos */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#526375]">
                    Quick Preset Icons / Badges:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ 
                        ...formData, 
                        shopLogoUrl: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=120&auto=format&fit=crop&q=80' 
                      })}
                      className="px-2.5 py-1 bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#D2D2D7] rounded-lg text-[11px] font-bold text-[#1D1D1F] transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span> Apple Metallic Badge</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ 
                        ...formData, 
                        shopLogoUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=120&auto=format&fit=crop&q=80' 
                      })}
                      className="px-2.5 py-1 bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#D2D2D7] rounded-lg text-[11px] font-bold text-[#1D1D1F] transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span>⚡ Tech Circuit Chip</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ 
                        ...formData, 
                        shopLogoUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=120&auto=format&fit=crop&q=80' 
                      })}
                      className="px-2.5 py-1 bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#D2D2D7] rounded-lg text-[11px] font-bold text-[#1D1D1F] transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span>🛡️ Cyber Lab Shield</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shop Contact & Store Location Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E5EA] shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-[#2C3E50] flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-[#0071E3]" />
                <span>Store Contact & Location Information</span>
              </h3>
              <p className="text-xs text-[#7F7F7F] mt-1">
                Store details displayed on customer receipts, thermal vouchers, SMS notifications, and official invoices.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Multiple Store Phone Numbers Section */}
              <div className="sm:col-span-2 lg:col-span-3 space-y-2.5 bg-[#F8F9FA] p-4 rounded-xl border border-[#E5E5EA]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#34C759]" />
                    <span>Store Contact Phone Lines (Multiple Numbers Supported)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const currentPhones = formData.shopPhones && formData.shopPhones.length > 0 
                        ? [...formData.shopPhones] 
                        : [formData.shopPhone || ''];
                      const updated = [...currentPhones, ''];
                      setFormData({
                        ...formData,
                        shopPhones: updated,
                        shopPhone: updated[0] || '',
                      });
                    }}
                    className="px-2.5 py-1 bg-[#0071E3] hover:bg-[#0051B3] text-white font-extrabold text-[11px] rounded-lg transition-all flex items-center space-x-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Contact Phone Number</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {((formData.shopPhones && formData.shopPhones.length > 0) 
                    ? formData.shopPhones 
                    : [formData.shopPhone || '']
                  ).map((phoneNum, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <span className="text-[10px] font-extrabold font-mono text-[#86868B] w-20 shrink-0">
                        {idx === 0 ? 'Primary Line:' : `Line #${idx + 1}:`}
                      </span>
                      <input
                        type="text"
                        value={phoneNum}
                        onChange={(e) => {
                          const currentPhones = formData.shopPhones && formData.shopPhones.length > 0 
                            ? [...formData.shopPhones] 
                            : [formData.shopPhone || ''];
                          currentPhones[idx] = e.target.value;
                          setFormData({
                            ...formData,
                            shopPhones: currentPhones,
                            shopPhone: currentPhones[0] || '',
                          });
                        }}
                        placeholder={idx === 0 ? "+95 9 790 000 000 (Primary Customer Service)" : "+95 9 440 000 000 (Hotline / Viber / WhatsApp)"}
                        className="flex-1 p-2.5 bg-white border border-[#E5E5EA] rounded-xl text-xs font-bold text-[#1D1D1F] focus:outline-none focus:border-[#0071E3]"
                      />
                      {((formData.shopPhones?.length || 1) > 1) && (
                        <button
                          type="button"
                          onClick={() => {
                            const currentPhones = formData.shopPhones && formData.shopPhones.length > 0 
                              ? [...formData.shopPhones] 
                              : [formData.shopPhone || ''];
                            currentPhones.splice(idx, 1);
                            setFormData({
                              ...formData,
                              shopPhones: currentPhones,
                              shopPhone: currentPhones[0] || '',
                            });
                          }}
                          className="p-2 text-[#86868B] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Remove Phone Line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[#86868B]">
                  Primary phone is used as main contact line. Additional lines appear on job vouchers, sticker tags, receipts, and invoices.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E50] mb-1 flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-[#0071E3]" />
                  <span>Shop Support Email Address</span>
                </label>
                <input
                  type="email"
                  value={formData.shopEmail || ''}
                  onChange={(e) => setFormData({ ...formData, shopEmail: e.target.value })}
                  placeholder="support@applerepairpro.com"
                  className="w-full p-2.5 bg-white border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:outline-none focus:border-[#0071E3]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E50] mb-1 flex items-center space-x-1">
                  <Globe className="w-3.5 h-3.5 text-[#0071E3]" />
                  <span>Shop Official Website URL</span>
                </label>
                <input
                  type="text"
                  value={formData.shopWebsite || ''}
                  onChange={(e) => setFormData({ ...formData, shopWebsite: e.target.value })}
                  placeholder="www.applerepairpro.com"
                  className="w-full p-2.5 bg-white border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:outline-none focus:border-[#0071E3]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C3E50] mb-1 flex items-center space-x-1">
                  <Hash className="w-3.5 h-3.5 text-[#0071E3]" />
                  <span>Tax ID / Business Reg No</span>
                </label>
                <input
                  type="text"
                  value={formData.taxId || ''}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  placeholder="MMK-TAX-90210"
                  className="w-full p-2.5 bg-white border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:outline-none focus:border-[#0071E3]"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-bold text-[#2C3E50] mb-1 flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-[#0071E3]" />
                  <span>Store Physical Address</span>
                </label>
                <input
                  type="text"
                  value={formData.shopAddress || ''}
                  onChange={(e) => setFormData({ ...formData, shopAddress: e.target.value })}
                  placeholder="No. 123 Sule Pagoda Road, Downtown Tech Plaza, Yangon"
                  className="w-full p-2.5 bg-white border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:outline-none focus:border-[#0071E3]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C3E50] mb-1">
                Shop Business Info & Operating Hours / Disclaimer Note
              </label>
              <textarea
                rows={3}
                value={formData.shopInfo || ''}
                onChange={(e) => setFormData({ ...formData, shopInfo: e.target.value })}
                placeholder="Authorized Apple Hardware Repair Center. Open Mon-Sat 9:00 AM - 6:30 PM."
                className="w-full p-2.5 bg-white border border-[#E5E5EA] rounded-xl text-xs text-[#1D1D1F] focus:outline-none focus:border-[#0071E3]"
              />
            </div>
          </div>

          {/* Live ERP Preview Banner */}
          <div className="bg-[#F8FBFD] p-5 rounded-2xl border border-[#D8E5ED] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-[#0071E3] tracking-widest flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                <span>Live Navigation & Header Preview</span>
              </span>
              <span className="text-[10px] font-bold text-[#86868B]">Synced with active settings</span>
            </div>

            <div className="p-4 bg-white rounded-xl border border-[#E5E5EA] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {formData.shopLogoUrl ? (
                  <img
                    src={formData.shopLogoUrl}
                    alt="Logo"
                    className="w-9 h-9 rounded-xl object-contain bg-white border border-[#E5E5EA] p-0.5 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-[#0071E3] flex items-center justify-center text-white shrink-0 font-bold text-sm">
                    
                  </div>
                )}
                <div>
                  <h4 className="font-extrabold text-sm text-[#1D1D1F]">
                    {formData.shopName || 'AppleRepair Pro'}
                  </h4>
                  <p className="text-[10px] text-[#86868B] font-medium">
                    {formData.shopPhone} • {formData.shopAddress}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-[#0071E3] hover:bg-[#0051B3] text-white font-extrabold text-xs rounded-xl transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Save Shop Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Theme & Color Palette Settings */}
      {activeSubTab === 'theme' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E5E5EA] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[#2C3E50] flex items-center space-x-2">
                  <Palette className="w-5 h-5 text-[#27B1AE]" />
                  <span>Application Visual Theme & Typography</span>
                </h3>
                <p className="text-xs text-[#7F7F7F] mt-1">
                  Choose your shop's visual theme and color palette. All modules, navigation bars, badges, and controls will update instantly.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              {THEME_PRESETS.map((preset) => {
                const isSelected = theme === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => setTheme(preset.id)}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                      isSelected
                        ? 'border-[#27B1AE] bg-[#F8FBFD] shadow-md ring-2 ring-[#27B1AE]/20'
                        : 'border-[#E5E5EA] bg-white hover:border-[#136F9A]/40 shadow-xs'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2C3E50] text-white">
                          {preset.fontName}
                        </span>
                        {isSelected ? (
                          <span className="flex items-center space-x-1 text-xs font-extrabold text-[#27B1AE]">
                            <Check className="w-4 h-4" />
                            <span>Active Theme</span>
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-[#7F7F7F]">Click to apply</span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-black text-[#2C3E50]">{preset.name}</h4>
                        <p className="text-xs text-[#7F7F7F] mt-1 leading-relaxed">{preset.description}</p>
                      </div>

                      {/* Swatch Preview Grid */}
                      <div className="pt-2 space-y-2">
                        <span className="text-[10px] font-extrabold text-[#7F7F7F] uppercase tracking-wider block">Palette Colors</span>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="space-y-1 text-center">
                            <div className="h-9 rounded-xl border border-black/10 shadow-2xs flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: preset.colors.primary }}>
                              Blue
                            </div>
                            <span className="text-[9px] font-mono text-[#7F7F7F] block">{preset.colors.primary}</span>
                          </div>

                          <div className="space-y-1 text-center">
                            <div className="h-9 rounded-xl border border-black/10 shadow-2xs flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: preset.colors.secondary }}>
                              Turquoise
                            </div>
                            <span className="text-[9px] font-mono text-[#7F7F7F] block">{preset.colors.secondary}</span>
                          </div>

                          <div className="space-y-1 text-center">
                            <div className="h-9 rounded-xl border border-black/10 shadow-2xs flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: preset.colors.orange }}>
                              Orange
                            </div>
                            <span className="text-[9px] font-mono text-[#7F7F7F] block">{preset.colors.orange}</span>
                          </div>

                          <div className="space-y-1 text-center">
                            <div className="h-9 rounded-xl border border-black/10 shadow-2xs flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: preset.colors.darkBlue }}>
                              Navy
                            </div>
                            <span className="text-[9px] font-mono text-[#7F7F7F] block">{preset.colors.darkBlue}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTheme(preset.id);
                      }}
                      className={`w-full py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center space-x-2 ${
                        isSelected
                          ? 'bg-[#27B1AE] text-white shadow-xs'
                          : 'bg-[#2C3E50] hover:bg-[#136F9A] text-white'
                      }`}
                    >
                      {isSelected ? 'Currently Selected' : `Activate ${preset.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Component Geometry & Design System Architecture Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E5EA] shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-[#2C3E50] flex items-center space-x-2">
                <Square className="w-5 h-5 text-[#0071E3]" />
                <span>Component Geometry & Design System Architecture</span>
              </h3>
              <p className="text-xs text-[#7F7F7F] mt-1">
                Choose between a high-density Square / Rectangular Design System or a Soft Curved Geometry for all UI elements, cards, inputs, buttons, and tables.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div
                onClick={() => setGeometry('square')}
                className={`p-5 rounded-none border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  geometry === 'square'
                    ? 'border-[#0071E3] bg-[#F0F6FF] ring-2 ring-[#0071E3]/20 shadow-xs'
                    : 'border-[#E5E5EA] bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Square className="w-5 h-5 text-[#0071E3]" />
                    <span className="font-extrabold text-sm text-[#2C3E50]">Square / Rectangular Design System</span>
                  </div>
                  {geometry === 'square' && (
                    <span className="text-xs font-black px-2.5 py-0.5 bg-[#0071E3] text-white rounded-none">Active</span>
                  )}
                </div>
                <p className="text-xs text-[#526375] leading-relaxed">
                  Crisp 0px sharp rectangular borders for high-density engineering, maximum screen utilization, and modern structural architecture across all ERP modules.
                </p>
              </div>

              <div
                onClick={() => setGeometry('curved')}
                className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  geometry === 'curved'
                    ? 'border-[#0071E3] bg-[#F0F6FF] ring-2 ring-[#0071E3]/20 shadow-xs'
                    : 'border-[#E5E5EA] bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Circle className="w-5 h-5 text-[#34C759]" />
                    <span className="font-extrabold text-sm text-[#2C3E50]">Curved Soft Geometry</span>
                  </div>
                  {geometry === 'curved' && (
                    <span className="text-xs font-black px-2.5 py-0.5 bg-[#34C759] text-white rounded-full">Active</span>
                  )}
                </div>
                <p className="text-xs text-[#526375] leading-relaxed">
                  Classic soft 12px-24px rounded corners and pill buttons for a smooth, relaxed interface appearance.
                </p>
              </div>
            </div>
          </div>

          {/* Language Selection Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E5EA] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[#2C3E50] flex items-center space-x-2">
                  <span className="text-xl">🇲🇲</span>
                  <span>System Language & Localization (ဘာသာစကား)</span>
                </h3>
                <p className="text-xs text-[#7F7F7F] mt-1">
                  Select your preferred system interface language. Supports English and Burmese (မြန်မာဘာသာ).
                </p>
              </div>
              <LanguageSwitcher variant="pills" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div
                onClick={() => setLanguage('en')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  language === 'en'
                    ? 'border-[#0071E3] bg-[#F0F6FF] ring-2 ring-[#0071E3]/20'
                    : 'border-[#E5E5EA] bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🇺🇸</span>
                  <div>
                    <h4 className="text-sm font-extrabold text-[#1D1D1F]">English (US)</h4>
                    <p className="text-xs text-[#86868B]">Standard English interface for ERP & Work Orders</p>
                  </div>
                </div>
                {language === 'en' && <Check className="w-5 h-5 text-[#0071E3]" />}
              </div>

              <div
                onClick={() => setLanguage('mm')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  language === 'mm'
                    ? 'border-[#0071E3] bg-[#F0F6FF] ring-2 ring-[#0071E3]/20'
                    : 'border-[#E5E5EA] bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🇲🇲</span>
                  <div>
                    <h4 className="text-sm font-extrabold text-[#1D1D1F]">မြန်မာစာ (Myanmar / Burmese)</h4>
                    <p className="text-xs text-[#86868B]">ပြုပြင်ရေး ERP စနစ်တစ်ခုလုံး မြန်မာဘာသာဖြင့် သုံးစွဲရန်</p>
                  </div>
                </div>
                {language === 'mm' && <Check className="w-5 h-5 text-[#0071E3]" />}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Tab 1: Technicians & Staff Management */}
      {activeSubTab === 'technicians' && (
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
                <button
                  type="button"
                  onClick={handleOpenAddTech}
                  className="px-3.5 py-2 bg-[#0071E3] hover:bg-[#0051B3] text-white font-extrabold text-xs rounded-xl transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer shrink-0 active:scale-95"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add New Technician</span>
                </button>
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
                  <button
                    type="button"
                    onClick={handleOpenAddTech}
                    className="px-4 py-2 bg-white text-[#1D1D1F] border border-[#D2D2D7] font-extrabold text-xs rounded-xl hover:bg-[#F5F5F7] transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#0071E3]" />
                    <span>Add Technician</span>
                  </button>
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
                        <p className="font-extrabold text-[#1D1D1F] text-xs">{tech.commissionRate || 10}%</p>
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
        <div className="bg-white p-5 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-extrabold text-[#1D1D1F]">Work Order & Ticket Intake Rules</h3>
            <p className="text-xs text-[#86868B]">
              Customize ticket number formatting, default warranty terms, and mandatory customer intake flags.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Voucher Prefix */}
            <div className="space-y-1.5">
              <label className="font-extrabold text-[#1D1D1F] flex items-center space-x-1.5">
                <Hash className="w-3.5 h-3.5 text-[#0071E3]" />
                <span>Ticket / Voucher Prefix Format</span>
              </label>
              <input
                type="text"
                value={formData.ticketPrefix}
                onChange={(e) => setFormData({ ...formData, ticketPrefix: e.target.value })}
                placeholder="WO-"
                className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
              />
              <p className="text-[11px] text-[#86868B]">e.g. WO- generates vouchers like WO-2026-1001.</p>
            </div>

            {/* Default Warranty */}
            <div className="space-y-1.5">
              <label className="font-extrabold text-[#1D1D1F] flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#34C759]" />
                <span>Default Service Warranty Coverage (Days)</span>
              </label>
              <select
                value={formData.defaultWarrantyDays}
                onChange={(e) => setFormData({ ...formData, defaultWarrantyDays: Number(e.target.value) })}
                className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
              >
                <option value={30}>30 Days (Standard Modular)</option>
                <option value={60}>60 Days (Extended)</option>
                <option value={90}>90 Days (Recommended Apple Lab Standard)</option>
                <option value={180}>180 Days (Half-Year Warranty)</option>
                <option value={365}>365 Days (1 Full Year)</option>
              </select>
            </div>

            {/* Checkbox Toggles */}
            <div className="md:col-span-2 space-y-3 pt-3 border-t border-[#E5E5EA]">
              <label className="flex items-center space-x-3 cursor-pointer p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] hover:border-[#0071E3] transition-all">
                <input
                  type="checkbox"
                  checked={formData.requirePasscodeIntake}
                  onChange={(e) => setFormData({ ...formData, requirePasscodeIntake: e.target.checked })}
                  className="w-4 h-4 text-[#0071E3] rounded focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-extrabold text-[#1D1D1F] text-xs block">Require Device Passcode / PIN at Intake</span>
                  <span className="text-[11px] text-[#86868B]">Prompt technicians to record screen passcodes for post-repair diagnostic testing.</span>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] hover:border-[#0071E3] transition-all">
                <input
                  type="checkbox"
                  checked={formData.requireFindMyCheck}
                  onChange={(e) => setFormData({ ...formData, requireFindMyCheck: e.target.checked })}
                  className="w-4 h-4 text-[#0071E3] rounded focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-extrabold text-[#1D1D1F] text-xs block">Mandatory Find My / iCloud Lock Check</span>
                  <span className="text-[11px] text-[#86868B]">Verify that Find My iPhone / Mac activation lock status is checked during work order creation.</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Pricing & Currency Settings */}
      {activeSubTab === 'pricing' && (
        <div className="bg-white p-5 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-extrabold text-[#1D1D1F]">Global Currency & Pricing Matrix Settings</h3>
            <p className="text-xs text-[#86868B]">
              Configure shop-wide currency symbols, tax rules, and default labor discounts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
            {/* Currency Symbol */}
            <div className="space-y-1.5">
              <label className="font-extrabold text-[#1D1D1F] flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-[#0071E3]" />
                <span>Default Currency Symbol / Unit</span>
              </label>
              <select
                value={formData.currencySymbol}
                onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
              >
                <option value="MMK">MMK (Myanmar Kyat)</option>
                <option value="USD">USD ($ United States Dollar)</option>
                <option value="THB">THB (฿ Thai Baht)</option>
                <option value="SGD">SGD (S$ Singapore Dollar)</option>
                <option value="EUR">EUR (€ Euro)</option>
              </select>
            </div>

            {/* Tax Percentage */}
            <div className="space-y-1.5">
              <label className="font-extrabold text-[#1D1D1F] flex items-center space-x-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#34C759]" />
                <span>Sales Tax / Commercial VAT (%)</span>
              </label>
              <input
                type="number"
                value={formData.taxPercentage}
                onChange={(e) => setFormData({ ...formData, taxPercentage: Number(e.target.value) })}
                min="0"
                max="30"
                step="0.5"
                className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
              />
            </div>

            {/* Default Discount */}
            <div className="space-y-1.5">
              <label className="font-extrabold text-[#1D1D1F] flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-[#AF52DE]" />
                <span>Default Labor Discount (%)</span>
              </label>
              <input
                type="number"
                value={formData.defaultLaborDiscountPercent}
                onChange={(e) => setFormData({ ...formData, defaultLaborDiscountPercent: Number(e.target.value) })}
                min="0"
                max="50"
                className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
              />
            </div>
          </div>

          {/* Quick Jump Banner for Payment Methods */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="p-2 bg-blue-100 text-[#0071E3] rounded-xl">
                <CreditCard className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-extrabold text-xs text-[#1D1D1F]">Manage Active Payment Gateways & Myanmar Banks</h4>
                <p className="text-[11px] text-[#86868B]">Enable or disable Cash, KBZ Pay, UAB Pay, AYA Pay, MMQR, CB Bank, Yoma Bank, Wave Money, etc.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab('payment')}
              className="px-3.5 py-2 bg-[#0071E3] hover:bg-[#0051B3] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              Configure Payment Gateways →
            </button>
          </div>
        </div>
      )}

      {/* Tab: Payment Methods & Myanmar Banks */}
      {activeSubTab === 'payment' && (
        <div className="bg-white p-6 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5EA] pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-[#0071E3]" />
                <span>Global Payment Gateways & Myanmar Banking Settings</span>
              </h3>
              <p className="text-xs text-[#86868B] mt-1">
                Configure enabled payment methods across your store (Cash, KBZ Pay, UAB Pay, AYA Pay, MMQR, CB Bank, Yoma Bank, Wave Money, etc.). Disabled payment options will be hidden automatically during POS checkout, Work Order intake, and invoicing.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSetAllPaymentMethodsState(true)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-all flex items-center space-x-1 cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Enable All</span>
              </button>
              <button
                type="button"
                onClick={handleAddCustomPaymentMethod}
                className="px-3 py-1.5 bg-[#0071E3] hover:bg-[#0051B3] text-white font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Gateway</span>
              </button>
              <button
                type="button"
                onClick={handleResetPaymentMethods}
                className="px-3 py-1.5 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] font-bold text-xs rounded-xl border border-[#D2D2D7] transition-all flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#86868B]" />
                <span>Reset Defaults</span>
              </button>
            </div>
          </div>

          {/* Quick Summary Badge Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                title: 'Total Configured',
                count: currentPaymentMethods.length,
                color: 'bg-blue-50 text-[#0071E3] border-blue-200',
              },
              {
                title: 'Active Gateways',
                count: currentPaymentMethods.filter((m) => m.enabled).length,
                color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              },
              {
                title: 'Myanmar Mobile & MMQR',
                count: currentPaymentMethods.filter((m) => m.category === 'Myanmar Mobile Pay').length,
                color: 'bg-purple-50 text-purple-700 border-purple-200',
              },
              {
                title: 'Myanmar Bank Accounts',
                count: currentPaymentMethods.filter((m) => m.category === 'Myanmar Banks').length,
                color: 'bg-amber-50 text-amber-700 border-amber-200',
              },
            ].map((stat, idx) => (
              <div key={idx} className={`p-3 rounded-xl border ${stat.color} flex items-center justify-between`}>
                <span className="text-xs font-bold">{stat.title}</span>
                <span className="text-sm font-extrabold font-mono">{stat.count}</span>
              </div>
            ))}
          </div>

          {/* Payment Methods Table / Grid */}
          <div className="space-y-6">
            {(['Cash', 'Myanmar Mobile Pay', 'Myanmar Banks', 'Card & Digital'] as const).map((cat) => {
              const categoryItems = currentPaymentMethods.filter((m) => m.category === cat);
              if (categoryItems.length === 0) return null;

              const categoryTitles: Record<string, { title: string; icon: any; desc: string }> = {
                'Cash': { title: 'Cash Counter Payments', icon: DollarSign, desc: 'Physical currency and cash drawer payments' },
                'Myanmar Mobile Pay': { title: 'Myanmar Mobile Wallets & MMQR', icon: QrCode, desc: 'KBZ Pay, UAB Pay, AYA Pay, Wave Money & Universal MMQR QR' },
                'Myanmar Banks': { title: 'Myanmar Bank Transfers (iBanking / mBanking)', icon: Landmark, desc: 'CB Bank, Yoma Bank, KBZ Bank, AYA Bank direct transfers' },
                'Card & Digital': { title: 'Credit Cards & Contactless NFC', icon: CreditCard, desc: 'Visa/Mastercard POS terminals and Apple Pay / NFC' },
              };

              const CatIcon = categoryTitles[cat]?.icon || Wallet;

              return (
                <div key={cat} className="space-y-3">
                  <div className="flex items-center space-x-2 border-b border-[#E5E5EA] pb-2">
                    <span className="p-1.5 bg-[#F5F5F7] rounded-lg text-[#0071E3]">
                      <CatIcon className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-extrabold text-[#1D1D1F] uppercase tracking-wider">
                        {categoryTitles[cat]?.title || cat}
                      </h4>
                      <p className="text-[11px] text-[#86868B]">
                        {categoryTitles[cat]?.desc}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryItems.map((method) => (
                      <div
                        key={method.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          method.enabled
                            ? 'bg-white border-[#E5E5EA] shadow-2xs hover:border-[#0071E3]'
                            : 'bg-[#F8F9FA] border-[#E5E5EA] opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F7]">
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-extrabold text-xs text-[#1D1D1F] block">{method.name}</span>
                            </div>
                            <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-md ${
                              method.enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {method.enabled ? 'ENABLED globally' : 'DISABLED'}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleTogglePaymentMethod(method.id)}
                              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                                method.enabled
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                  : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                              }`}
                              title={method.enabled ? 'Click to Disable' : 'Click to Enable'}
                            >
                              {method.enabled ? (
                                <ToggleRight className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-slate-400" />
                              )}
                            </button>

                            {/* Quick Toggle Button */}
                            <button
                              type="button"
                              onClick={() => handleTogglePaymentMethod(method.id)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                                method.enabled
                                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {method.enabled ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </div>

                        {/* Editable details for Mobile Wallet / Bank Account */}
                        <div className="mt-3 space-y-2 text-xs">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-[#86868B] block mb-0.5">Gateway / Bank Name</label>
                              <input
                                type="text"
                                value={method.name}
                                onChange={(e) => handleUpdatePaymentMethodField(method.id, 'name', e.target.value)}
                                className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg px-2 py-1 text-xs font-bold text-[#1D1D1F]"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-[#86868B] block mb-0.5">Account / Phone No.</label>
                              <input
                                type="text"
                                value={method.accountNumber || ''}
                                onChange={(e) => handleUpdatePaymentMethodField(method.id, 'accountNumber', e.target.value)}
                                placeholder="e.g. 09790000000 or Account #"
                                className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#0071E3]"
                              />
                            </div>
                          </div>

                          {method.category !== 'Cash' && method.category !== 'Card & Digital' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-[#86868B] block mb-0.5">Account Beneficiary Name</label>
                                <input
                                  type="text"
                                  value={method.accountName || ''}
                                  onChange={(e) => handleUpdatePaymentMethodField(method.id, 'accountName', e.target.value)}
                                  placeholder="e.g. AppleRepair Pro Ltd"
                                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg px-2 py-1 text-xs font-bold text-[#1D1D1F]"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-[#86868B] block mb-0.5">Receipt / Note Reference</label>
                                <input
                                  type="text"
                                  value={method.notes || ''}
                                  onChange={(e) => handleUpdatePaymentMethodField(method.id, 'notes', e.target.value)}
                                  placeholder="e.g. Scan QR at counter"
                                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg px-2 py-1 text-xs text-[#86868B]"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Inventory & Stock Alerts */}
      {activeSubTab === 'inventory' && (
        <div className="bg-white p-5 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-extrabold text-[#1D1D1F]">Parts Inventory & Stock Matrix Alerts</h3>
            <p className="text-xs text-[#86868B]">
              Define reorder triggers, stock reservation policies, and vendor SLA targets.
            </p>
          </div>

          <section className="space-y-3 border-y border-[#E5E5EA] py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-extrabold text-[#1D1D1F]">Inventory Categories</h4>
                <p className="text-[11px] text-[#86868B]">Shared with Price List. Categories are available when adding a stock part.</p>
              </div>
              <span className="rounded-full bg-[#0071E3]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#0071E3]">
                {repairCategories.length} categories
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_190px_auto]">
              <input
                type="text"
                value={categoryDraft}
                onChange={(event) => setCategoryDraft(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleAddInventoryCategory(); } }}
                placeholder="New category, e.g. Camera"
                className="h-9 w-full rounded-xl border border-[#D2D2D7] bg-[#F5F5F7] px-3 text-xs font-medium text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white"
              />
              <CustomDropdownMenu
                value={categoryGroup}
                onChange={(group) => setCategoryGroup(group as RepairCategoryDef['group'])}
                options={['Battery', 'Display', 'Housing', 'Charging', 'Audio', 'Logic Board', 'Network', 'Sensors & Keys'].map((group) => ({ value: group, label: group }))}
                className="w-full"
                buttonClassName="!h-9 !w-full !rounded-xl !border-[#D2D2D7] !bg-[#F5F5F7]"
                menuAlign="left"
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

            <div className="max-h-52 divide-y divide-[#E5E5EA] overflow-y-auto rounded-xl border border-[#E5E5EA] bg-[#F8F9FA]">
              {repairCategories.map((category) => (
                <div key={category.key} className="flex items-center gap-2 px-3 py-2">
                  {editingCategoryKey === category.key ? (
                    <input
                      autoFocus
                      value={editingCategoryLabel}
                      onChange={(event) => setEditingCategoryLabel(event.target.value)}
                      onKeyDown={(event) => { if (event.key === 'Enter') handleSaveInventoryCategory(category.key); if (event.key === 'Escape') setEditingCategoryKey(null); }}
                      className="h-7 min-w-0 flex-1 rounded-lg border border-[#0071E3] bg-white px-2 text-xs font-semibold outline-none"
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#1D1D1F]">{category.label}</span>
                  )}
                  <span className="hidden rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#86868B] sm:inline">{category.group}</span>
                  {editingCategoryKey === category.key ? (
                    <button type="button" onClick={() => handleSaveInventoryCategory(category.key)} className="text-[11px] font-extrabold text-[#0071E3]">Save</button>
                  ) : (
                    <button type="button" onClick={() => { setEditingCategoryKey(category.key); setEditingCategoryLabel(category.label); }} className="text-[11px] font-extrabold text-[#0071E3]">Edit</button>
                  )}
                  <button
                    type="button"
                    onClick={() => { if (window.confirm(`Delete category “${category.label}”? It will no longer appear for new inventory parts.`)) onDeleteRepairCategory?.(category.key); }}
                    className="text-[11px] font-extrabold text-rose-600"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
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

          {/* Formats, Branding & Text Fields */}
          <div className="space-y-6">
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
        <div className="space-y-6">
          {/* Main Config Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5EA]">
              <div>
                <h3 className="text-base font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                  <BellRing className="w-5 h-5 text-[#0071E3]" />
                  <span>Automatic SMS & Telegram Notification Templates</span>
                </h3>
                <p className="text-xs text-[#86868B] mt-1">
                  Customize automatic notification templates sent to customers for repair milestones (Finished, Ready for Pickup, Needs Attention, Pending Parts, Intake).
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetNotificationTemplates}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-[#1D1D1F] font-bold text-xs rounded-xl transition-all border border-[#D2D2D7] flex items-center space-x-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#86868B]" />
                  <span>Reset Defaults</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomNotificationTemplate}
                  className="px-3.5 py-2 bg-[#0071E3] hover:bg-[#0051B3] text-white font-extrabold text-xs rounded-xl transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Template</span>
                </button>
              </div>
            </div>

            {/* Global Dispatch Channels & Triggers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#F5F5F7] rounded-2xl border border-[#E5E5EA] space-y-3">
                <label className="text-xs font-extrabold text-[#1D1D1F] block flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-[#0071E3]" />
                  <span>Default Preferred Dispatch Channel</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Viber', label: 'Viber', color: 'bg-[#7360F2]' },
                    { id: 'SMS', label: 'Direct SMS', color: 'bg-[#34C759]' },
                    { id: 'Telegram', label: 'Telegram', color: 'bg-[#229ED9]' },
                  ].map((ch) => {
                    const isSelected = (formData.defaultNotificationChannel || 'Viber') === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, defaultNotificationChannel: ch.id as any })}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                          isSelected
                            ? `${ch.color} text-white border-transparent shadow-2xs`
                            : 'bg-white text-[#1D1D1F] border-[#D2D2D7] hover:bg-slate-100'
                        }`}
                      >
                        <span>{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-[#F5F5F7] rounded-2xl border border-[#E5E5EA] space-y-3 flex flex-col justify-center">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoPromptNotificationModal ?? true}
                    onChange={(e) => setFormData({ ...formData, autoPromptNotificationModal: e.target.checked })}
                    className="w-4 h-4 text-[#0071E3] rounded focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-extrabold text-[#1D1D1F] text-xs block">Auto-Prompt Notification Window on Status Change</span>
                    <span className="text-[11px] text-[#86868B]">Automatically open dispatch dialog when ticket moves to Finished, Ready, or Pending Parts.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Telegram Bot Integration Config */}
            <div className="p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-2xl border border-blue-200 space-y-3">
              <div className="flex items-center space-x-2">
                <Send className="w-4 h-4 text-[#229ED9]" />
                <h4 className="text-xs font-extrabold text-[#1D1D1F]">Telegram Bot & Store Alerts Integration</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-[#86868B] mb-1">Telegram Bot Token</label>
                  <input
                    type="text"
                    placeholder="e.g. 7890123456:AAFx..."
                    value={formData.telegramBotToken || ''}
                    onChange={(e) => setFormData({ ...formData, telegramBotToken: e.target.value })}
                    className="w-full bg-white border border-[#D2D2D7] rounded-xl px-3 py-2 text-xs font-mono text-[#1D1D1F] focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#86868B] mb-1">Telegram Admin Chat ID / Channel ID</label>
                  <input
                    type="text"
                    placeholder="e.g. @applerepair_updates or -100123456789"
                    value={formData.telegramChatId || ''}
                    onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                    className="w-full bg-white border border-[#D2D2D7] rounded-xl px-3 py-2 text-xs font-mono text-[#1D1D1F] focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Templates Cards List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-[#86868B] uppercase tracking-wider">
                Configured Message Templates ({currentNotificationTemplates.length})
              </h4>
              <span className="text-[11px] text-[#0071E3] font-bold">
                Click variable buttons to insert tags into text
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {currentNotificationTemplates.map((tmpl) => {
                const sampleOutput = (tmpl.templateText || '')
                  .replace(/\{customerName\}/g, SAMPLE_PRINT_WORK_ORDER.customerName)
                  .replace(/\{deviceModel\}/g, SAMPLE_PRINT_WORK_ORDER.deviceModel)
                  .replace(/\{ticketNumber\}/g, SAMPLE_PRINT_WORK_ORDER.orderNumber)
                  .replace(/\{totalAmount\}/g, SAMPLE_PRINT_WORK_ORDER.totalAmount.toLocaleString())
                  .replace(/\{shopName\}/g, formData.shopName || 'AppleRepair Pro Lab')
                  .replace(/\{shopPhone\}/g, formData.shopPhone || '+95 9 790 000 000');

                return (
                  <div
                    key={tmpl.id}
                    className="bg-white p-5 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-4 hover:border-[#0071E3]/50 transition-all"
                  >
                    {/* Template Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5EA]">
                      <div className="flex items-center space-x-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tmpl.enabled ?? true}
                            onChange={(e) => handleUpdateTemplateField(tmpl.id, 'enabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#34C759]"></div>
                        </label>
                        <div>
                          <input
                            type="text"
                            value={tmpl.title}
                            onChange={(e) => handleUpdateTemplateField(tmpl.id, 'title', e.target.value)}
                            className="font-extrabold text-sm text-[#1D1D1F] bg-transparent border-b border-transparent hover:border-[#D2D2D7] focus:border-[#0071E3] focus:outline-none px-1"
                          />
                          {tmpl.description && (
                            <p className="text-[11px] text-[#86868B] px-1">{tmpl.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 bg-blue-50 text-[#0071E3] font-mono text-[10px] font-bold rounded-lg border border-blue-200">
                          Key: {tmpl.key}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteNotificationTemplate(tmpl.id)}
                          className="p-2 text-slate-400 hover:text-[#FF3B30] hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Delete Template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Variable Shortcut Insert Pills */}
                    <div>
                      <span className="text-[10px] font-extrabold text-[#86868B] uppercase tracking-wider block mb-1.5">
                        Insert Dynamic Tag Shortcut:
                      </span>
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        {[
                          { tag: '{customerName}', label: 'Customer Name' },
                          { tag: '{deviceModel}', label: 'Device Model' },
                          { tag: '{ticketNumber}', label: 'Ticket Number' },
                          { tag: '{totalAmount}', label: 'Total Price' },
                          { tag: '{shopName}', label: 'Shop Name' },
                          { tag: '{shopPhone}', label: 'Shop Phone' },
                        ].map((v) => (
                          <button
                            key={v.tag}
                            type="button"
                            onClick={() => handleInsertVariable(tmpl.id, v.tag)}
                            className="px-2.5 py-1 bg-[#F5F5F7] hover:bg-blue-50 text-[#1D1D1F] hover:text-[#0071E3] font-mono font-bold text-[11px] rounded-lg border border-[#E5E5EA] transition-all cursor-pointer flex items-center space-x-1"
                          >
                            <Plus className="w-3 h-3 text-[#0071E3]" />
                            <span>{v.tag}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Template Textarea */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#86868B] mb-1">
                        Template Message Text (မြန်မာဘာသာ / English):
                      </label>
                      <textarea
                        rows={3}
                        value={tmpl.templateText}
                        onChange={(e) => handleUpdateTemplateField(tmpl.id, 'templateText', e.target.value)}
                        className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-3 text-xs text-[#1D1D1F] font-sans leading-relaxed focus:bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 resize-none"
                      />
                    </div>

                    {/* Real-time Render Preview Box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#86868B]">
                        <span className="flex items-center space-x-1">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>Live Customer Preview (Daw Khin Than • iPhone 15 Pro):</span>
                        </span>
                        <span>{sampleOutput.length} characters</span>
                      </div>
                      <p className="text-xs text-[#1D1D1F] font-sans leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                        {sampleOutput}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Quality Assurance Rules */}
      {activeSubTab === 'qa' && (
        <div className="bg-white p-5 rounded-2xl border border-[#D2D2D7] shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-extrabold text-[#1D1D1F]">QA & Diagnostic Workflow Governance</h3>
            <p className="text-xs text-[#86868B]">
              Enforce mandatory quality assurance inspection gates before marking tickets as completed.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center space-x-3 cursor-pointer p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] hover:border-[#0071E3] transition-all">
              <input
                type="checkbox"
                checked={formData.mandatoryQaChecklist}
                onChange={(e) => setFormData({ ...formData, mandatoryQaChecklist: e.target.checked })}
                className="w-4 h-4 text-[#0071E3] rounded focus:ring-0 cursor-pointer"
              />
              <div>
                <span className="font-extrabold text-[#1D1D1F] text-xs block">Mandatory QA Checklist Verification</span>
                <span className="text-[11px] text-[#86868B]">Require a passing QA inspection before ticket status can be transitioned to "Ready for Pickup".</span>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E5EA] hover:border-[#0071E3] transition-all">
              <input
                type="checkbox"
                checked={formData.requireMicroSolderingLog}
                onChange={(e) => setFormData({ ...formData, requireMicroSolderingLog: e.target.checked })}
                className="w-4 h-4 text-[#0071E3] rounded focus:ring-0 cursor-pointer"
              />
              <div>
                <span className="font-extrabold text-[#1D1D1F] text-xs block">Require Diode/Thermal Log for Level 3 Board Repairs</span>
                <span className="text-[11px] text-[#86868B]">Require multimeter diode readings and IC replacement logs for L3 micro-soldering work orders.</span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Tab: Recycle Bin & Trash */}
      {activeSubTab === 'recycle' && (
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 border border-[#D2D2D7] shadow-xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3">
              <h3 className="font-extrabold text-sm text-[#1D1D1F]">
                {editingTech ? 'Edit Technician Record' : 'Add New Technical Staff'}
              </h3>
              <button
                type="button"
                onClick={() => setTechModalOpen(false)}
                className="p-1 text-[#86868B] hover:text-[#1D1D1F] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTechSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1D1D1F] block mb-1">Technician Full Name *</label>
                <input
                  type="text"
                  required
                  value={techFormData.name}
                  onChange={(e) => setTechFormData({ ...techFormData, name: e.target.value })}
                  placeholder="e.g. Alex Rivera"
                  className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-medium px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1D1D1F] block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={techFormData.email}
                    onChange={(e) => setTechFormData({ ...techFormData, email: e.target.value })}
                    placeholder="alex@applerepairpro.com"
                    className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-medium px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1D1D1F] block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={techFormData.phone}
                    onChange={(e) => setTechFormData({ ...techFormData, phone: e.target.value })}
                    placeholder="+95 9 700 000 000"
                    className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-medium px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1D1D1F] block mb-1">Skill Tier Level</label>
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
                  <label className="font-bold text-[#1D1D1F] block mb-1">Status</label>
                  <select
                    value={techFormData.status}
                    onChange={(e) => setTechFormData({ ...techFormData, status: e.target.value as any })}
                    className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1D1D1F] block mb-1">Specialty / Hardware Focus</label>
                  <input
                    type="text"
                    value={techFormData.specialty}
                    onChange={(e) => setTechFormData({ ...techFormData, specialty: e.target.value })}
                    placeholder="e.g. MacBook Logic Boards, Display Repair"
                    className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-medium px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#1D1D1F] block mb-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    value={techFormData.commissionRate}
                    onChange={(e) => setTechFormData({ ...techFormData, commissionRate: Number(e.target.value) })}
                    min="0"
                    max="50"
                    className="w-full bg-[#F5F5F7] text-[#1D1D1F] font-bold px-3 py-2 rounded-xl border border-[#D2D2D7] focus:bg-white focus:outline-none focus:border-[#0071E3]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E5E5EA]">
                <button
                  type="button"
                  onClick={() => setTechModalOpen(false)}
                  className="px-3 py-2 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0071E3] hover:bg-[#0051B3] text-white font-extrabold rounded-xl shadow-2xs cursor-pointer active:scale-95"
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

      {/* Interactive Device Intake Print Voucher & Tag Printer Modal */}
      {isDeviceTagPrinterOpen && (
        <DeviceTagPrinterModal
          workOrder={SAMPLE_PRINT_WORK_ORDER}
          systemSettings={formData}
          onClose={() => setIsDeviceTagPrinterOpen(false)}
        />
      )}
    </div>
  );
};
