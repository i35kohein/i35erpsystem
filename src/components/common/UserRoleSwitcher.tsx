import React, { useState } from 'react';
import { Shield, HardHat, UserCheck, ChevronDown, Check, UserPlus} from 'lucide-react';
import { AppUser, UserRole } from '../../types';

interface UserRoleSwitcherProps {
  currentUser: AppUser;
  users: AppUser[];
  onSwitchUser: (user: AppUser) => void;
  onOpenUserManagement?: () => void;
  compact?: boolean;
}

export const UserRoleSwitcher: React.FC<UserRoleSwitcherProps> = ({
  currentUser,
  users,
  onSwitchUser,
  onOpenUserManagement,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'Admin':
        return {
          label: 'Admin',
          bgColor: 'bg-purple/15 text-purple border-purple/30',
          icon: Shield,
        };
      case 'Technician':
        return {
          label: 'Technician',
          bgColor: 'bg-brand/15 text-brand border-brand/30',
          icon: HardHat,
        };
      case 'Reception':
        return {
          label: 'Reception',
          bgColor: 'bg-warning/15 text-warning border-warning/30',
          icon: UserCheck,
        };
      default:
        return {
          label: role,
          bgColor: 'bg-surface text-muted border-line',
          icon: UserCheck,
        };
    }
  };

  const currentBadge = getRoleBadge(currentUser.role);
  const CurrentIcon = currentBadge.icon;

  return (
    <div className="relative inline-block w-full min-w-0 text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 rounded-xl border transition-all cursor-pointer shadow-2xs active:scale-95 w-full min-w-0 ${
          currentUser.role === 'Admin'
            ? 'bg-purple/10/80 hover:bg-purple/15/90 border-purple/30 text-purple'
            : currentUser.role === 'Technician'
            ? 'bg-brand-soft/80 hover:bg-brand/15/90 border-brand/30 text-brand-deep'
            : 'bg-warning/10/80 hover:bg-warning/15/90 border-warning/30 text-warning'
        } ${compact ? 'p-2 justify-center' : 'px-3 py-2 text-xs font-bold justify-between'}`}
        title={`Active User: ${currentUser.name} (${currentUser.role}) - Click to switch`}
      >
        <div className="flex items-center space-x-2 min-w-0">
          <div className={`p-1 rounded-lg ${currentBadge.bgColor} shrink-0`}>
            <CurrentIcon className="w-3.5 h-3.5" />
          </div>

          {!compact && (
            <div className="text-left min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold truncate flex-1 min-w-0">
                  {currentUser.name}
                </span>
                <span className={`px-1.5 py-0.5 rounded-md text-xs font-extrabold border ${currentBadge.bgColor}`}>
                  {currentUser.role}
                </span>
              </div>
            </div>
          )}
        </div>

        {!compact && (
          <ChevronDown className={`w-3.5 h-3.5 text-muted shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            role="presentation"
            aria-hidden="true"
          />
          <div className={`absolute z-50 w-56 max-w-[calc(100vw-1rem)] rounded-2xl bg-white border border-line-strong shadow-2xl p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-150 ${
            compact ? 'left-full bottom-0 ml-2' : 'left-0 bottom-full mb-2'
          }`}>
            <div className="px-3 py-2 border-b border-line">
              <span className="text-xs font-extrabold text-muted uppercase tracking-wider block">
                Switch User / Operating Role
              </span>
              <p className="text-xs text-ink font-medium mt-0.5">
                Current: <strong className="text-brand">{currentUser.name}</strong> ({currentUser.role})
              </p>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {users.map((usr) => {
                const badge = getRoleBadge(usr.role);
                const Icon = badge.icon;
                const isSelected = usr.id === currentUser.id;

                return (
                  <button
                    key={usr.id}
                    type="button"
                    onClick={() => {
                      onSwitchUser(usr);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-brand-soft border-brand text-brand font-bold shadow-2xs'
                        : 'bg-white border-transparent hover:bg-surface text-ink'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg border ${badge.bgColor} shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-extrabold block truncate text-ink">{usr.name}</span>
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold border ${badge.bgColor}`}>
                            {usr.role}
                          </span>
                          {usr.role === 'Technician' && usr.technicianName && (
                            <span className="text-xs text-muted truncate">
                              • {usr.technicianName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-brand shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Admin User Management Button */}
            {currentUser.role === 'Admin' && onOpenUserManagement && (
              <div className="pt-1 border-t border-line">
                <button
                  type="button"
                  onClick={() => {
                    onOpenUserManagement();
                    setIsOpen(false);
                  }}
                  className="w-full py-2 px-3 bg-surface hover:bg-line text-brand font-extrabold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Manage Users & Permissions</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
