import React from 'react';

/**
 * ModuleLoadingSkeleton — branded loading placeholder shown while lazy
 * modules load (Suspense fallback). Purely decorative; uses CSS animate-pulse.
 */
export const ModuleLoadingSkeleton: React.FC = () => {
  return (
    <div className="flex-1 min-h-0 overflow-hidden p-4 sm:p-5 animate-pulse" aria-hidden="true">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#E5E5EA]" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-40 rounded-md bg-[#E5E5EA]" />
            <div className="h-2.5 w-56 rounded-md bg-[#F0F0F2]" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 rounded-xl bg-[#E5E5EA]" />
          <div className="h-9 w-24 rounded-xl bg-[#E5E5EA]" />
        </div>
      </div>

      {/* Filter chips row */}
      <div className="flex items-center gap-2 mb-5">
        {[72, 88, 64, 96, 80].map((w, i) => (
          <div key={i} className="h-8 rounded-full bg-[#E5E5EA]" style={{ width: w }} />
        ))}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#E5E5EA] bg-white p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#F0F0F2]" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-3/4 rounded-md bg-[#E5E5EA]" />
                <div className="h-2.5 w-1/2 rounded-md bg-[#F0F0F2]" />
              </div>
            </div>
            <div className="h-2.5 w-full rounded-md bg-[#F0F0F2]" />
            <div className="flex items-center justify-between pt-2 border-t border-[#F5F5F7]">
              <div className="h-4 w-16 rounded-md bg-[#E5E5EA]" />
              <div className="h-4 w-14 rounded-md bg-[#E5E5EA]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
