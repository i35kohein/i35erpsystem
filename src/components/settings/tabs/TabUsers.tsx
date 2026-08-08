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
                          <Button
                            type="button"
                            onClick={() => handleOpenEditUser(usr)}
                            className="p-1.5 text-brand hover:bg-brand-soft rounded-lg transition-colors cursor-pointer"
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

                      {/* Permissions Tags */}
                      <div className="bg-surface p-2 rounded-xl text-xs text-faint space-y-1">
                        <div className="font-extrabold text-ink flex items-center justify-between">
                          <span>Key Permissions:</span>
                          <span className={usr.permissions?.canDeleteWorkOrders ? 'text-success font-bold' : 'text-muted'}>
                            {usr.permissions?.canDeleteWorkOrders ? 'Can Delete Items' : 'No Delete Access'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {isAdmin && <span className="bg-purple/15 text-purple px-1.5 py-0.5 rounded">All Settings</span>}
                          {isReception && <span className="bg-warning/15 text-warning px-1.5 py-0.5 rounded">All Ops Except Settings</span>}
                          {isTech && <span className="bg-brand/15 text-brand-deep px-1.5 py-0.5 rounded">Assigned Pipeline & QA Only</span>}
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
