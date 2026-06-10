import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Briefcase,
  Plus,
  ExternalLink,
  X,
  Calendar,
  Target,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const COLUMNS = [
  { key: 'Applied', label: 'Applied', color: '#8b949e' },
  { key: 'OA', label: 'OA', color: '#58a6ff' },
  { key: 'Interview R1', label: 'Interview R1', color: '#f97316' },
  { key: 'Interview R2', label: 'Interview R2', color: '#a855f7' },
  { key: 'HR', label: 'HR', color: '#eab308' },
  { key: 'Offer', label: 'Offer/Rejected', color: '#3fb950' },
];

const APPLICATION_COLORS = {
  'Applied': '#8b949e',
  'OA': '#58a6ff',
  'Interview R1': '#f97316',
  'Interview R2': '#a855f7',
  'HR': '#eab308',
  'Offer': '#3fb950',
  'Rejected': '#ef4444',
};

const SortableApplicationCard = ({ application }) => {
  const { company, role, dateApplied, stage } = application;
  const logoUrl = `https://logo.clearbit.com/${company.toLowerCase().replace(/\\s/g, '')}.com`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: application.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-2 hover:border-[#58a6ff] transition-colors group"
    >
      <div className="flex items-center gap-3">
        <img
          src={logoUrl}
          alt={company}
          className="w-8 h-8 rounded object-contain bg-white p-0.5 shrink-0"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-[#e6edf3] truncate">{company}</h4>
          <p className="text-xs text-[#8b949e] truncate">{role}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#8b949e]">{dateApplied}</span>
        <a
          href={`https://${company.toLowerCase().replace(/\\s/g, '')}.com`}
          target="_blank"
          rel="noreferrer"
          className="text-[#8b949e] hover:text-[#58a6ff] transition-colors opacity-0 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
};

const AddApplicationModal = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState({
    company: '',
    role: '',
    driveType: 'off-campus',
    dateApplied: new Date().toISOString().split('T')[0],
    stage: 'Applied',
    oaScore: '',
    notes: '',
    nextAction: '',
    nextActionDate: '',
    result: 'Pending',
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.company.trim() || !form.role.trim()) return;
    onSave({
      ...form,
      dateApplied: form.dateApplied,
    });
    setForm({
      company: '',
      role: '',
      driveType: 'off-campus',
      dateApplied: new Date().toISOString().split('T')[0],
      stage: 'Applied',
      oaScore: '',
      notes: '',
      nextAction: '',
      nextActionDate: '',
      result: 'Pending',
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-md p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#e6edf3]">Add Application</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-[#30363d] transition-colors">
            <X size={16} className="text-[#8b949e]" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-[#8b949e] font-medium">Company *</label>
              <input
                value={form.company}
                onChange={e => handleChange('company', e.target.value)}
                placeholder="e.g. Amazon"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:border-[#58a6ff] outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[#8b949e] font-medium">Role *</label>
              <input
                value={form.role}
                onChange={e => handleChange('role', e.target.value)}
                placeholder="e.g. SDE-1"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:border-[#58a6ff] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-[#8b949e] font-medium">Drive Type</label>
              <select
                value={form.driveType}
                onChange={e => handleChange('driveType', e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:border-[#58a6ff] outline-none"
              >
                <option value="campus">Campus</option>
                <option value="off-campus">Off-Campus</option>
                <option value="referral">Referral</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[#8b949e] font-medium">Date Applied</label>
              <input
                type="date"
                value={form.dateApplied}
                onChange={e => handleChange('dateApplied', e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:border-[#58a6ff] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-[#8b949e] font-medium">Stage</label>
              <select
                value={form.stage}
                onChange={e => handleChange('stage', e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:border-[#58a6ff] outline-none"
              >
                {COLUMNS.map(col => (
                  <option key={col.key} value={col.key}>{col.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[#8b949e] font-medium">OA Score (optional)</label>
              <input
                value={form.oaScore}
                onChange={e => handleChange('oaScore', e.target.value)}
                placeholder="e.g. 7/10"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:border-[#58a6ff] outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#8b949e] font-medium">Next Action</label>
            <input
              value={form.nextAction}
              onChange={e => handleChange('nextAction', e.target.value)}
              placeholder="e.g. Prepare for System Design round"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:border-[#58a6ff] outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[#8b949e] font-medium">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Any notes about this application..."
              rows={2}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:border-[#58a6ff] outline-none resize-none"
            />
          </div>
        </div>

        <Button variant="primary" onClick={handleSave} className="w-full">
          <Plus size={16} className="mr-2" /> Add Application
        </Button>
      </div>
    </div>,
    document.body
  );
};

const ApplicationsCRM = ({ applications = [], onUpdateApplication, onAddApplication }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Group applications by stage
  const grouped = COLUMNS.reduce((acc, col) => {
    const stageApps = applications.filter(app => {
      if (col.key === 'Offer') {
        return app.stage === 'Offer' || app.stage === 'Rejected';
      }
      return app.stage === col.key;
    });
    acc[col.key] = stageApps;
    return acc;
  }, {});

  // Flatten all application IDs for SortableContext
  const getColumnItemIds = (columnKey) => {
    return (grouped[columnKey] || []).map(app => app.id);
  };

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || !active) return;

    const activeId = active.id;
    const overId = over.id;

    // Find which column the active item belongs to
    let sourceColumn = null;
    let sourceIndex = -1;
    for (const colKey of Object.keys(grouped)) {
      const idx = (grouped[colKey] || []).findIndex(app => app.id === activeId);
      if (idx !== -1) {
        sourceColumn = colKey;
        sourceIndex = idx;
        break;
      }
    }
    if (!sourceColumn) return;

    // Determine the target column
    let targetColumn = null;
    let targetIndex = -1;

    // Check if over is a column header or empty drop zone
    const overColumnKey = COLUMNS.find(c => c.key === overId || overId === `empty-${c.key}`);
    if (overColumnKey) {
      targetColumn = overColumnKey.key;
      targetIndex = (grouped[targetColumn] || []).length; // end of column
    } else {
      // Check if over is an item in another column
      for (const colKey of Object.keys(grouped)) {
        const idx = (grouped[colKey] || []).findIndex(app => app.id === overId);
        if (idx !== -1) {
          targetColumn = colKey;
          targetIndex = idx;
          break;
        }
      }
    }

    if (!targetColumn || targetColumn === sourceColumn && sourceIndex === targetIndex) return;

    // Move the application
    const movedApp = grouped[sourceColumn][sourceIndex];
    if (!movedApp) return;

    const newStage = targetColumn === 'Offer'
      ? (movedApp.result === 'Rejected' || movedApp.stage === 'Rejected' ? 'Rejected' : 'Offer')
      : targetColumn;

    if (onUpdateApplication) {
      onUpdateApplication(movedApp.id, { stage: newStage });
    }
  }, [grouped, onUpdateApplication]);

  // Stats
  const totalApps = applications.length;
  const applied = (grouped['Applied'] || []).length;
  const interviews = (grouped['Interview R1'] || []).length + (grouped['Interview R2'] || []).length;
  const offers = (grouped['Offer'] || []).length;
  const rejected = (grouped['Offer'] || []).filter(a => a.stage === 'Rejected' || a.result === 'Rejected').length;

  return (
    <Card className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase size={18} className="text-[#58a6ff]" />
          <h3 className="text-lg font-bold text-[#e6edf3]">My Applications</h3>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={14} className="mr-1" /> Add
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-center">
          <div className="text-lg font-bold text-[#e6edf3]">{totalApps}</div>
          <div className="text-[10px] text-[#8b949e] uppercase">Total</div>
        </div>
        <div className="p-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-center">
          <div className="text-lg font-bold text-[#58a6ff]">{applied}</div>
          <div className="text-[10px] text-[#8b949e] uppercase">Applied</div>
        </div>
        <div className="p-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-center">
          <div className="text-lg font-bold text-[#f97316]">{interviews}</div>
          <div className="text-[10px] text-[#8b949e] uppercase">Interviews</div>
        </div>
        <div className="p-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-center">
          <div className="text-lg font-bold text-[#3fb950]">{offers}</div>
          <div className="text-[10px] text-[#8b949e] uppercase">Offers</div>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUMNS.map((col) => {
            const columnItems = grouped[col.key] || [];
            return (
              <div
                key={col.key}
                className="min-w-[220px] flex-1 flex flex-col gap-3"
              >
                {/* Column header - acts as a drop target */}
                <div
                  className="flex items-center justify-between p-2 rounded-lg border"
                  style={{
                    backgroundColor: `${col.color}10`,
                    borderColor: `${col.color}30`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-xs font-bold text-[#e6edf3]">{col.label}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#21262d] text-[#8b949e]">
                    {columnItems.length}
                  </span>
                </div>

                {/* Sortable items container */}
                <SortableContext
                  id={col.key}
                  items={getColumnItemIds(col.key)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2 flex-1 min-h-[60px]">
                    {columnItems.map((app) => (
                      <SortableApplicationCard key={app.id} application={app} />
                    ))}
                    {columnItems.length === 0 && (
                      <div className="p-4 border border-dashed border-[#30363d] rounded-lg text-center">
                        <p className="text-[11px] text-[#8b949e]">No applications</p>
                        <p className="text-[10px] text-[#4a4a4a] mt-1">Drag here to move</p>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>
      </DndContext>

      {/* Add Application Modal */}
      <AddApplicationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={(data) => {
          if (onAddApplication) onAddApplication(data);
          setIsAddModalOpen(false);
        }}
      />
    </Card>
  );
};

export default ApplicationsCRM;
