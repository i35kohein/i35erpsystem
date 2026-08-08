import React, { useState, useMemo } from 'react';
import {
  UserCheck,
} from 'lucide-react';
import { WorkOrder, Technician, SystemSettings, WorkOrderStatus } from '../../types';
import { PriorityBadge } from '../common/PriorityBadge';
import { TicketDetailInspectorModal } from '../common/TicketDetailInspectorModal';

interface TrelloBoardProps {
  workOrders: WorkOrder[];
  technicians: Technician[];
  systemSettings?: SystemSettings;
  currentUser?: any;
  onUpdateWorkOrderStatus: (id: string, status: WorkOrderStatus) => void;
  onSaveWorkOrder?: (wo: WorkOrder) => void;
  onDeleteWorkOrder?: (id: string) => void;
  onSelectPrintTag?: (wo: WorkOrder) => void;
  onOpenAiAssistant?: () => void;
}

const STAGE_COLUMNS: { id: WorkOrderStatus; title: string; dot: string; border: string; headerBg: string }[] = [
  { id: 'Receive', title: 'Received', dot: 'bg-brand', border: 'border-brand/30', headerBg: 'bg-brand/5' },
  { id: 'In Progress', title: 'In Progress', dot: 'bg-purple', border: 'border-purple/30', headerBg: 'bg-purple/5' },
  { id: 'Pending', title: 'Pending', dot: 'bg-warning', border: 'border-warning/40', headerBg: 'bg-warning/5' },
  { id: 'Finished', title: 'Finished', dot: 'bg-success-deep', border: 'border-success/40', headerBg: 'bg-success/5' },
  { id: 'Taken Out', title: 'Taken Out', dot: 'bg-slate-400', border: 'border-line', headerBg: 'bg-surface' },
];

/** Trello-style board for the Repair Ticket Roster.
 *  Cards are grouped into stage columns; drag a card between columns to
 *  change status. Click a card to open the full ticket inspector. */
export const TrelloBoardModule: React.FC<TrelloBoardProps> = ({
  workOrders,
  technicians,
  currentUser,
  onUpdateWorkOrderStatus,
  onSaveWorkOrder,
  onDeleteWorkOrder,
  onSelectPrintTag,
}) => {
  const [detailWo, setDetailWo] = useState<WorkOrder | null>(null);
  const [draggedWoId, setDraggedWoId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<WorkOrderStatus | null>(null);
  const [techAssignOpen, setTechAssignOpen] = useState<string | null>(null);
  const [techAssignWo, setTechAssignWo] = useState<WorkOrder | null>(null);

  const isTechnicianUser = currentUser?.role === 'Technician';
  const myTechId = currentUser?.technicianId || '';
  const myTechName = currentUser?.technicianName || currentUser?.name || '';

  const visibleWorkOrders = useMemo(() => {
    return workOrders
      .filter((wo) => {
        if (isTechnicianUser) {
          const isMine =
            (myTechId && wo.assignedTechId === myTechId) ||
            (myTechName && (wo.assignedTechName || '').toLowerCase() === myTechName.toLowerCase());
          if (!isMine) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [workOrders, isTechnicianUser, myTechId, myTechName]);

  const columns = useMemo(() => {
    return STAGE_COLUMNS.map((col) => ({
      ...col,
      orders: visibleWorkOrders.filter((wo) => wo.status === col.id),
    }));
  }, [visibleWorkOrders]);

  const isStagnant = (wo: WorkOrder) => {
    const created = new Date(wo.createdAt).getTime();
    if (isNaN(created)) return false;
    // Bottleneck applies only to OPEN stages — Finished / Taken Out are terminal,
    // they'd always look 'stale' by age and shouldn't get the red border.
    if (wo.status === 'Finished' || wo.status === 'Taken Out') return false;
    return (Date.now() - created) / (1000 * 60 * 60) >= 48;
  };

  const techName = (wo: WorkOrder) => {
    if (wo.assignedTechName) return wo.assignedTechName.split(' ')[0];
    const t = technicians.find((x) => x.id === wo.assignedTechId);
    return t?.name?.split(' ')[0] || 'Unassigned';
  };

  const handleQuickAssign = (wo: WorkOrder, techId: string) => {
    if (!onSaveWorkOrder) return;
    const tech = technicians.find((t) => t.id === techId);
    onSaveWorkOrder({
      ...wo,
      assignedTechId: techId,
      assignedTechName: tech?.name || wo.assignedTechName,
      updatedAt: new Date().toISOString(),
    });
    setTechAssignOpen(null);
    setTechAssignWo(null);
  };

  const handleDrop = (targetStage: WorkOrderStatus) => {
    if (draggedWoId && draggedWoId !== targetStage) {
      const wo = workOrders.find((w) => w.id === draggedWoId);
      if (wo && wo.status !== targetStage) {
        onUpdateWorkOrderStatus(draggedWoId, targetStage);
      }
    }
    setDraggedWoId(null);
    setDragOverStage(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Board columns — horizontal scroll (kanban style, no grid) */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2 no-scrollbar">
        {columns.map((col) => (
          <div
            key={col.id}
            onDragOver={(e) => { e.preventDefault(); setDragOverStage(col.id); }}
            onDragLeave={() => setDragOverStage((s) => (s === col.id ? null : s))}
            onDrop={(e) => { e.preventDefault(); handleDrop(col.id); }}
            className={`flex min-h-[140px] w-[300px] shrink-0 flex-col rounded-2xl border transition-colors ${
              dragOverStage === col.id ? 'border-brand/60 bg-brand/5' : `${col.border} bg-surface/60`
            }`}
          >
            {/* Column header — tinted with the stage color */}
            <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-2xl border-b border-line/70 ${col.headerBg}`}>
              <div className="flex items-center space-x-2 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${col.dot}`} />
                <span className="text-xs font-extrabold text-ink truncate">{col.title}</span>
                <span className="text-xs font-mono font-black bg-white border border-line px-1.5 py-0.5 rounded-md text-muted">
                  {col.orders.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-2 overflow-y-auto p-2 min-h-[120px]">
              {col.orders.length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-line text-xs text-muted">
                  Drop tickets here
                </div>
              ) : (
                col.orders.map((wo) => {
                  const stagnant = isStagnant(wo);
                  const totalAmt = wo.totalAmount || wo.subtotal || 0;
                  return (
                    <div
                      key={wo.id}
                      draggable
                      onDragStart={() => setDraggedWoId(wo.id)}
                      onClick={() => setDetailWo(wo)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailWo(wo); } }}
                      className={`group cursor-pointer rounded-xl border bg-white p-3 shadow-2xs transition-all hover:shadow-md hover:border-brand/50 select-none ${
                        stagnant ? 'border-l-4 border-l-danger' : 'border-line'
                      }`}
                    >
                      {/* Top row: order # + priority */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-mono text-[11px] font-extrabold text-brand truncate">{wo.orderNumber || wo.id.slice(0, 8)}</span>
                        <PriorityBadge priority={wo.priority} size="xs" />
                      </div>

                      {/* Device + customer */}
                      <p className="mt-1.5 text-xs font-extrabold text-ink truncate">{wo.deviceModel}</p>
                      <p className="text-[11px] text-muted truncate">{wo.customerName} · {wo.customerPhone}</p>

                      {/* Footer: tech + amount */}
                      <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-1.5">
                        <div className="flex items-center space-x-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                          {isTechnicianUser && myTechId ? (
                            <button
                              type="button"
                              onClick={() => handleQuickAssign(wo, myTechId)}
                              title="Assign to me"
                              className="flex items-center space-x-1 text-[11px] font-bold text-brand hover:underline"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span className="truncate max-w-[70px]">{techName(wo)}</span>
                            </button>
                          ) : (
                            <div className="relative" onClick={(e) => { e.stopPropagation(); }}>
                              <button
                                type="button"
                                onClick={() => { setTechAssignWo(wo); setTechAssignOpen(techAssignOpen === wo.id ? null : wo.id); }}
                                title="Assign technician"
                                className="flex items-center space-x-1 text-[11px] font-bold text-brand hover:underline"
                              >
                                <UserCheck className="w-3 h-3" />
                                <span className="truncate max-w-[70px]">{techName(wo)}</span>
                              </button>
                              {techAssignOpen === wo.id && techAssignWo?.id === wo.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setTechAssignOpen(null)} role="presentation" aria-hidden="true" />
                                  <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-xl border border-line bg-white p-1 shadow-xl">
                                    <button
                                      type="button"
                                      onClick={() => handleQuickAssign(wo, 'unassigned')}
                                      className="w-full px-2.5 py-1.5 text-left text-xs font-bold rounded-lg hover:bg-surface"
                                    >
                                      Unassigned
                                    </button>
                                    {technicians.map((t) => (
                                      <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => handleQuickAssign(wo, t.id)}
                                        className="w-full px-2.5 py-1.5 text-left text-xs font-bold rounded-lg hover:bg-surface"
                                      >
                                        {t.name}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="font-mono text-[11px] font-black text-success-deep">{totalAmt.toLocaleString()} MMK</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Ticket inspector */}
      {detailWo && (
        <TicketDetailInspectorModal
          workOrder={detailWo}
          currentUser={currentUser}
          onClose={() => setDetailWo(null)}
          onPrint={onSelectPrintTag}
          onEdit={undefined}
          onDelete={onDeleteWorkOrder}
        />
      )}
    </div>
  );
};
