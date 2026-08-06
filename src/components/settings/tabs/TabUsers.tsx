import React from 'react';
import {Edit2, Plus, Trash2, UserPlus} from 'lucide-react';
import { Button } from '../../ui';

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
}

const UsersTab: React.FC<UsersTabProps> = ({ users, currentUser, handleOpenAddUser, handleOpenEditUser, onDeleteUser }) => {
  return (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-line-strong shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
              <div>
                <h3 className="text-base font-extrabold text-ink flex items-center space-x-2">
                  <UserPlus className="w-5 h-5 text-brand" />
                  <span>System Users & Role Access Control</span>
                </h3>
                <p className="text-xs text-muted mt-1">
                  Manage accounts for Admin, Technicians, and Reception staff. Control granular deletion and access permissions.
                </p>
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
                          ? 'bg-blue-50/40 border-brand shadow-xs'
                          : 'bg-white border-line hover:border-line-strong'
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
                              <h5 className="font-extrabold text-sm text-ink truncate">{usr.name}</h5>
                              {usr.id === currentUser?.id && (
                                <span className="px-1.5 py-0.2 bg-brand text-white text-xs font-extrabold rounded-md">
                                  YOU
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted truncate">{usr.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <Button
                            type="button"
                            onClick={() => handleOpenEditUser(usr)}
                            className="p-1.5 text-brand hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit User & Permissions"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {usr.id !== 'usr-admin-1' && usr.id !== currentUser?.id && (
                            <Button
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
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-line/80 flex flex-wrap items-center justify-between text-xs gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-extrabold border ${
                          isAdmin
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : isTech
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          Role: {usr.role}
                        </span>

                        {usr.phone && (
                          <span className="text-xs text-faint font-medium">
                            📞 {usr.phone}
                          </span>
                        )}
                      </div>

                      {/* Permissions Tags */}
                      <div className="bg-surface p-2 rounded-xl text-xs text-faint space-y-1">
                        <div className="font-extrabold text-ink flex items-center justify-between">
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
  );
};

export default UsersTab;
