import React from 'react';
import { Award, Edit2, Mail, Phone, Trash2, UserPlus, Users } from 'lucide-react';
import { Button } from '../../ui';
import type { Technician } from '../../../types';
import type { SystemSettings } from '../../../types';

interface TechniciansTabProps {
  formData: SystemSettings;
  setFormData: React.Dispatch<React.SetStateAction<SystemSettings>>;
  technicians: Technician[];
  handleOpenAddTech: () => void;
  handleOpenEditTech: (tech: Technician) => void;
  setDeleteConfirmId: (id: string | null) => void;
}

const TechniciansTab: React.FC<TechniciansTabProps> = ({ formData, setFormData, technicians, handleOpenAddTech, handleOpenEditTech, setDeleteConfirmId }) => {
  return (
        <div className="space-y-6">
          {/* Default Assignment Card */}
          <div className="bg-white p-5 rounded-2xl border border-line-strong shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-ink">Default Technician Auto-Assignment</h3>
                <p className="text-xs text-muted">
                  Select the default technician assigned when creating new intake tickets or B2B repairs.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={formData.defaultTechnicianId}
                  onChange={(e) => setFormData({ ...formData, defaultTechnicianId: e.target.value })}
                  className="px-3 py-2 bg-surface text-xs font-bold text-ink border border-line-strong rounded-xl focus:outline-none focus:border-brand"
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
          <div className="bg-white p-5 rounded-2xl border border-line-strong shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-ink flex items-center space-x-2">
                  <span>Active Technical Staff Roster</span>
                  <span className="px-2 py-0.5 bg-brand/10 text-brand-deep text-xs font-black rounded-full">
                    {technicians.length}
                  </span>
                </h3>
                <p className="text-xs text-muted">
                  Add, modify, or adjust technician skill levels, contact numbers, and repair commissions.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  onClick={handleOpenAddTech}
                  className="bg-brand hover:bg-brand-deep text-white shrink-0 flex items-center space-x-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add New Technician</span>
                </Button>
              </div>
            </div>

            {/* Technicians Grid / Empty State */}
            {technicians.length === 0 ? (
              <div className="p-8 bg-surface border-2 border-dashed border-line-strong rounded-2xl text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-brand/15 text-brand flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-ink">No Technical Staff Records Found</h4>
                  <p className="text-xs text-muted max-w-sm mx-auto mt-1">No technicians yet — add one to get started.</p>
                </div>
                <div className="flex items-center justify-center space-x-3 pt-2">
                  <Button
                    type="button"
                    onClick={handleOpenAddTech}
                    variant="outline"
                    className="text-ink border-line-strong hover:bg-surface flex items-center space-x-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-brand" />
                    <span>Add Technician</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {technicians.map((tech) => (
                  <div
                    key={tech.id}
                    className="p-4 bg-surface border border-line rounded-2xl space-y-3 relative hover:border-brand/50 transition-all shadow-2xs"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-brand text-white flex items-center justify-center font-extrabold text-sm shrink-0 shadow-2xs">
                          {tech.name ? tech.name.charAt(0).toUpperCase() : 'T'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-xs text-ink flex items-center space-x-1.5 truncate">
                            <span className="truncate">{tech.name || 'Unnamed Tech'}</span>
                            {formData.defaultTechnicianId === tech.id && (
                              <span className="px-1.5 py-0.5 bg-brand/15 text-brand text-xs font-extrabold rounded-md shrink-0">
                                DEFAULT
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-muted flex items-center space-x-1 mt-0.5">
                            <Award className="w-3 h-3 text-brand shrink-0" />
                            <span className="font-semibold text-brand truncate">{tech.level}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <Button
                          type="button"
                          onClick={() => handleOpenEditTech(tech)}
                          className="p-1.5 text-muted hover:text-brand hover:bg-white rounded-lg transition-all cursor-pointer"
                          title="Edit Technician"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setDeleteConfirmId(tech.id)}
                          className="p-1.5 text-muted hover:text-danger hover:bg-white rounded-lg transition-all cursor-pointer"
                          title="Delete Technician"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Specialty / Status */}
                    <div className="space-y-1.5 text-xs border-t border-line pt-2.5">
                      {tech.specialty && (
                        <p className="text-xs text-ink font-medium truncate">
                          <span className="text-muted">Specialty:</span> {tech.specialty}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted flex items-center space-x-1 truncate max-w-[160px]">
                          <Mail className="w-3 h-3 text-muted shrink-0" />
                          <span className="truncate">{tech.email}</span>
                        </span>
                        <span className="font-extrabold text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/30 shrink-0">
                          {tech.status || 'Active'}
                        </span>
                      </div>
                      {tech.phone && (
                        <div className="text-xs text-muted flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-muted shrink-0" />
                          <span>{tech.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats Bar */}
                    <div className="grid grid-cols-3 gap-1 pt-2 bg-white p-2 rounded-xl border border-line text-center text-xs">
                      <div>
                        <p className="text-muted font-semibold">Active Jobs</p>
                        <p className="font-extrabold text-brand text-xs">{tech.activeJobsCount || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted font-semibold">Done / Mo</p>
                        <p className="font-extrabold text-success text-xs">{tech.completedThisMonth || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted font-semibold">Commission</p>
                        <p className="font-extrabold text-ink text-xs">
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
  );
};

export default TechniciansTab;
