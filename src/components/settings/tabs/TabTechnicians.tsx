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
  );
};

export default TechniciansTab;
