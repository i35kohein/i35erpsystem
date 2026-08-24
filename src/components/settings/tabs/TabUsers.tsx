import React from 'react';
import {Edit2, Plus, Trash2, UserPlus, LogOut, AlertTriangle, ShieldAlert} from 'lucide-react';
import { Button } from '../../ui';
import { toast } from '../../../lib/toast';
import { confirmDialog } from '../../common/ConfirmDialog';

import type { SystemSettings } from '../../../types';
import type { AppUser } from '../../../types';

interface UsersTabProps {
  formData: SystemSettings;
  setFormData: React.Dispatch<React.SetStateAction<SystemSettings>>;
  users: AppUser[];
  currentUser?: AppUser;
  handleOpenAddUser: () => void;
  handleOpenEditUser: (usr: AppUser) => void;
  onDeleteUser?: (id: string) => void;
  /** Navigate to the Recycle Bin tab (Danger Zone action, Ko Hein 2026-08-24). */
  onNavigateToRecycle?: () => void;
}

const UsersTab: React.FC<UsersTabProps> = ({ users, currentUser, handleOpenAddUser, handleOpenEditUser, onDeleteUser, onNavigateToRecycle }) => {
  // Sensitive-permission chip: red when granted, muted when denied (Ko Hein 2026-08-24).
  const PermBadge = ({ on, label }: { on: boolean; label: string }) => (
    <span
      className={`px-1.5 py-0.5 rounded font-bold border ${
        on ? 'bg-danger/10 text-danger border-danger/25' : 'bg-white text-muted border-line'
      }`}
      title={on ? `${label} access granted` : `No ${label.toLowerCase()} access`}
    >
      {on ? '✓ ' : '— '}{label}
    </span>
  );
  // Sign out every logged-in device except the current one (bug #8).
  const handleLogoutAllDevices = async () => {
    const token = localStorage.getItem('i35_session_token');
    if (!token) {
      toast('No active session found.', 'info', 'Sign Out All Devices');
      return;
    }
    const ok = await confirmDialog({
      title: 'Sign Out All Devices',
      message: 'Sign out all other devices? Every session except this one will be revoked immediately.',
      confirmLabel: 'Sign Out All',
    });
    if (!ok) return;
    try {
      const res = await fetch('/api/auth/logout-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': token },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast(data.error || 'Request failed.', 'error', 'Sign Out All Devices');
        return;
      }
      toast(`Revoked ${data.revoked ?? 0} other session(s). This device stays signed in.`, 'success', 'Devices Signed Out');
    } catch {
      toast('Cannot reach server — check connection.', 'error', 'Sign Out All Devices');
    }
  };

  return (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-line-strong shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
              <div>
                <h3 className="text-base font-extrabold text-ink flex items-center space-x-2">
                  <UserPlus className="w-5 h-5 text-brand" />
                  <span>System Users & Role Access Control</span>
                </h3>
                <p className="text-xs text-muted mt-1">Manage Admin, Technician, and Reception accounts.</p>
              </div>

              <Button
                type="button"
                onClick={handleOpenAddUser}
                className="bg-brand hover:bg-brand-deep text-white shrink-0 flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add New User Account</span>
              </Button>
            </div>

            {/* Role Rules Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-purple/10/80 rounded-2xl border border-purple/30 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-purple/15 text-purple rounded-lg">👑</span>
                  <span className="font-extrabold text-sm text-purple">Admin Role</span>
                </div>
                <p className="text-xs text-purple leading-relaxed">
                  Full control over system settings, finance, price catalog, user management, and <strong>sole permission to delete items</strong> (tickets, parts, logs).
                </p>
              </div>

              <div className="p-4 bg-brand-soft/80 rounded-2xl border border-brand/30 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-brand/15 text-brand rounded-lg">🔧</span>
                  <span className="font-extrabold text-sm text-brand-deep">Technician Role</span>
                </div>
                <p className="text-xs text-brand-deep leading-relaxed">Mobile view: pipeline, QA checklists, logs, status changes.</p>
              </div>

              <div className="p-4 bg-warning/10/80 rounded-2xl border border-warning/30 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-warning/15 text-warning rounded-lg">📋</span>
                  <span className="font-extrabold text-sm text-warning">Reception Role</span>
                </div>
                <p className="text-xs text-warning leading-relaxed">Full access except system settings.</p>
              </div>
            </div>

            {/* Users Table / Card List */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-extrabold text-ink uppercase tracking-wider">
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
                          ? 'bg-brand-soft/40 border-brand shadow-xs'
                          : 'bg-white border-line hover:border-line-strong'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-black shrink-0 ${
                            isAdmin
                              ? 'bg-purple/15 text-purple border border-purple/30'
                              : isTech
                              ? 'bg-brand/15 text-brand border border-brand/30'
                              : 'bg-warning/15 text-warning border border-warning/30'
                          }`}>
                            {isAdmin ? '👑' : isTech ? '🔧' : '📋'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <h5 className="font-extrabold text-sm text-ink truncate">{usr.name}</h5>
                              {usr.id === currentUser?.id && (
                                <span className="px-1.5 py-0.5 bg-brand text-white text-xs font-extrabold rounded-md">
                                  YOU
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted truncate">{usr.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <Button variant="ghost"
                            type="button"
                            onClick={() => handleOpenEditUser(usr)}
                            className="p-1.5 text-brand hover:bg-brand-soft rounded-lg transition-colors cursor-pointer"
                            title="Edit User & Permissions"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {usr.id !== 'usr-admin-1' && usr.id !== currentUser?.id && (
                            <Button variant="ghost"
                              type="button"
                              onClick={async () => {
                                if (await confirmDialog({ title: 'Delete User Account', message: `Delete user account "${usr.name}"? This cannot be undone.`, confirmLabel: 'Delete User', danger: true })) {
                                  onDeleteUser?.(usr.id);
                                }
                              }}
                              className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
                              title="Delete User Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-line/80 flex flex-wrap items-center justify-between text-xs gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-extrabold border ${
                          isAdmin
                            ? 'bg-purple/10 text-purple border-purple/30'
                            : isTech
                            ? 'bg-brand-soft text-brand border-brand/30'
                            : 'bg-warning/10 text-warning border-warning/30'
                        }`}>
                          Role: {usr.role}
                        </span>

                        {usr.phone && (
                          <span className="text-xs text-faint font-medium">
                            📞 {usr.phone}
                          </span>
                        )}
                      </div>

                      {/* Key Permissions — sensitive caps shown as compact badges (Ko Hein 2026-08-24) */}
                      <div className="bg-surface p-2 rounded-xl text-xs text-faint space-y-1">
                        <div className="font-extrabold text-ink flex items-center justify-between">
                          <span>Key Permissions:</span>
                          <span className={usr.permissions?.canDeleteWorkOrders ? 'text-success font-bold' : 'text-muted'}>
                            {usr.permissions?.canDeleteWorkOrders ? 'Can Delete Items' : 'No Delete Access'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {isAdmin && <span className="bg-danger/10 text-danger px-1.5 py-0.5 rounded border border-danger/20">Full access — all sensitive permissions</span>}
                          {isReception && <span className="bg-warning/15 text-warning px-1.5 py-0.5 rounded">All Ops Except Settings</span>}
                          {isTech && <span className="bg-brand/15 text-brand-deep px-1.5 py-0.5 rounded">Assigned Pipeline & QA Only</span>}
                          {!isAdmin && (
                            <>
                              <PermBadge
                                on={Boolean(usr.permissions?.canDeleteWorkOrders || usr.permissions?.canDeleteInventory || usr.permissions?.canDeleteCustomers || usr.permissions?.canDeleteLogs)}
                                label="Delete"
                              />
                              <PermBadge on={Boolean(usr.permissions?.canAccessFinance)} label="Finance" />
                              <PermBadge on={Boolean(usr.permissions?.canEditPrices)} label="Price edit" />
                              <PermBadge on={Boolean(usr.permissions?.canAccessSettings)} label="Settings" />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Danger Zone — high-risk admin actions grouped with impact notes (Ko Hein 2026-08-24) */}
          {currentUser?.role === 'Admin' && (
            <div className="rounded-2xl border-2 border-danger/40 bg-danger/5 p-5 space-y-4">
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-danger text-white rounded-xl shadow-2xs">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-danger">Danger Zone</h3>
                  <p className="text-xs text-muted">High-risk actions that affect every staff member or permanently remove data. Each action asks for confirmation before running.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-danger/25 p-3.5 space-y-2">
                  <p className="font-extrabold text-sm text-ink flex items-center space-x-1.5">
                    <LogOut className="w-4 h-4 text-danger" />
                    <span>Sign Out All Devices</span>
                  </p>
                  <p className="text-xs text-muted leading-relaxed">Revoke every logged-in session across all staff devices. Everyone must sign in again — useful after a suspected credential leak.</p>
                  <Button
                    type="button"
                    onClick={handleLogoutAllDevices}
                    className="w-full bg-danger hover:bg-danger-deep text-white text-xs font-extrabold rounded-xl flex items-center justify-center space-x-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out All Devices</span>
                  </Button>
                </div>

                <div className="bg-white rounded-xl border border-danger/25 p-3.5 space-y-2">
                  <p className="font-extrabold text-sm text-ink flex items-center space-x-1.5">
                    <Trash2 className="w-4 h-4 text-danger" />
                    <span>Delete User Accounts</span>
                  </p>
                  <p className="text-xs text-muted leading-relaxed">Permanently remove a staff account and its access. Use the red delete button on each user card above — this cannot be undone.</p>
                  <p className="text-[11px] font-bold text-danger bg-danger/10 border border-danger/20 rounded-lg px-2 py-1.5">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    Only the owner account cannot be deleted.
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-danger/25 p-3.5 space-y-2">
                  <p className="font-extrabold text-sm text-ink flex items-center space-x-1.5">
                    <Trash2 className="w-4 h-4 text-danger" />
                    <span>Recycle Bin & Trash</span>
                  </p>
                  <p className="text-xs text-muted leading-relaxed">Restore or permanently delete trashed tickets, parts, customers and logs. Permanent deletion is final.</p>
                  <Button
                    type="button"
                    onClick={() => onNavigateToRecycle?.()}
                    className="w-full bg-white border border-danger/40 text-danger hover:bg-danger/10 text-xs font-extrabold rounded-xl flex items-center justify-center space-x-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Open Recycle Bin</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
  );
};

export default UsersTab;
