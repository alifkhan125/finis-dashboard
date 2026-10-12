import { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { Select } from '@/shared/components/ui/Select';
import { Textarea } from '@/shared/components/ui/Textarea';
import { DatePicker } from '@/shared/components/ui/DatePicker';
import type { Company } from '@/shared/types';


interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject?: (project: any) => void;
  onEditProject?: (project: any) => void;
  project?: any; // If provided, mode is 'EDIT'
  preselectedCompanyId?: string;
  preselectedCompanyName?: string;
  companies?: Company[];
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onCreateProject,
  onEditProject,
  project,
  preselectedCompanyId,
  preselectedCompanyName,
  companies = [],
}: CreateProjectModalProps) {
  interface ProjectFormData {
    name: string;
    companyId: string;
    companyName: string;
    startDate: string;
    endDate: string;
    type: 'apartment_building' | 'house' | '';
    budget: string;
    hasBudget: boolean;
    description: string;
    address: string;
    floorCount: string;
    roomsPerFloor: string;
    houseType: 'whole_house' | 'sections';
    sections: string[];
  }

  const isEditMode = !!project;

  const [formData, setFormData] = useState<ProjectFormData>({
    name: project?.name || '',
    companyId: project?.companyId || preselectedCompanyId || '',
    companyName: project?.companyName || preselectedCompanyName || '',
    startDate: project?.startDate || '',
    endDate: project?.endDate || '',
    type: project?.type || '',
    budget: project?.budget ? project?.budget.toString() : '',
    hasBudget: project?.hasBudget !== undefined ? project.hasBudget : true,
    description: project?.description || '',
    address: project?.address || '',
    // Config fields (attempting to restore from existing structure would be complex, simplified for Edit to just show basic info unless we parse 'floors')
    floorCount: project?.type === 'apartment_building' ? project.floors.length.toString() : '',
    roomsPerFloor: '', // Difficult to infer perfectly
    houseType: project?.projectConfig?.houseType || 'whole_house',
    sections: project?.projectConfig?.sections || []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditMode && onEditProject) {
      // In Edit Mode, we primarily update metadata. 
      // Re-generating structure (floors/rooms) is dangerous as it deletes tasks.
      // We will update the top-level fields.
      const updatedProject = {
        ...project,
        name: formData.name,
        companyId: formData.companyId,
        companyName: formData.companyName,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        budget: formData.hasBudget ? (parseFloat(formData.budget.replace(/[^0-9.]/g, '')) || 0) : 0,
        hasBudget: formData.hasBudget,
        description: formData.description,
        address: formData.address,
        // We do NOT update floors/structure here to prevent data loss of existing tasks
      };
      await Promise.resolve(onEditProject(updatedProject));
      onClose();
      return;
    }

    // Generate structure based on type (Create Mode)
    const floors: any[] = [];
    const projectId = `proj-${Date.now()}`;

    if (formData.type === 'apartment_building') {
      const numFloors = parseInt(formData.floorCount) || 1;
      const numRooms = parseInt(formData.roomsPerFloor) || 1;

      for (let i = 1; i <= numFloors; i++) {
        const floorId = `floor-${Date.now()}-${i}`;
        const rooms = [];
        for (let j = 1; j <= numRooms; j++) {
          rooms.push({
            id: `room-${Date.now()}-${i}-${j}`,
            floorId,
            number: `${i}${j.toString().padStart(2, '0')}`, // e.g., 101, 102
            name: `Unit ${i}${j.toString().padStart(2, '0')}`,
            type: 'Unit',
            status: 'pending',
            assignedWorkers: [],
            tasks: []
          });
        }
        floors.push({
          id: floorId,
          projectId,
          number: i,
          name: `Floor ${i}`,
          type: 'floor',
          rooms,
          tasks: []
        });
      }
    } else if (formData.type === 'house') {
      if (formData.houseType === 'sections') {
        formData.sections.forEach((section, index) => {
          floors.push({
            id: `section-${Date.now()}-${index}`,
            projectId,
            number: index + 1,
            name: section, // 'Basement', 'Main Floor', etc.
            type: 'section',
            rooms: [], // Sections might utilize rooms or just tasks
            tasks: []
          });
        });
      } else {
        // Whole House
        floors.push({
          id: `house-${Date.now()}`,
          projectId,
          number: 1,
          name: 'Whole House',
          type: 'whole_house',
          rooms: [
            {
              id: `room-whole-${Date.now()}`,
              floorId: `house-${Date.now()}`,
              number: '1',
              name: 'General Area',
              type: 'General',
              status: 'pending',
              assignedWorkers: [],
              tasks: []
            }
          ],
          tasks: []
        });
      }
    }

    // Create project object
    const newProject = {
      name: formData.name,
      companyId: formData.companyId,
      companyName: formData.companyName,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      type: formData.type,
      projectConfig: {
        houseType: formData.houseType,
        sections: formData.sections
      },
      budget: formData.hasBudget ? (parseFloat(formData.budget.replace(/[^0-9.]/g, '')) || 0) : 0,
      hasBudget: formData.hasBudget,
      description: formData.description,
      address: formData.address,
      floors: floors,
      tasks: [], // Project level tasks
      progress: 0,
      status: 'planning',
      createdAt: new Date().toISOString()
    };

    if (!formData.companyId) {
      return;
    }

    if (onCreateProject) {
      await Promise.resolve(onCreateProject(newProject));
    }

    // Reset form
    setFormData({
      name: '',
      companyId: '',
      companyName: '',
      startDate: '',
      endDate: '',
      type: '',
      budget: '',
      hasBudget: true,
      description: '',
      address: '',
      floorCount: '',
      roomsPerFloor: '',
      houseType: 'whole_house',
      sections: []
    });

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? "Edit Project Details" : "Create New Project"} maxWidth="2xl">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">
              Project Name *
            </label>
            <Input
              placeholder="e.g. Skyline Tower Phase 2"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Company</label>
            {preselectedCompanyId ? (
              <Input
                value={preselectedCompanyName || formData.companyName}
                disabled
                className="h-11 bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            ) : (
              <Select
                value={formData.companyId}
                required
                onChange={(e) => {
                  const value = e.target.value;
                  const company = companies.find(c => c.id === value);
                  setFormData({ ...formData, companyId: value, companyName: company?.name || '' });
                }}
                options={companies
                  .filter(c => c.status !== 'inactive')
                  .map(c => ({ value: c.id, label: c.name }))}
                placeholder="Select company"
                className="h-11"
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">
              Start Date *
            </label>
            <DatePicker
              date={formData.startDate ? new Date(formData.startDate) : undefined}
              setDate={(date) => setFormData({ ...formData, startDate: date ? date.toISOString() : '' })}
              placeholder="Select start date"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">
              End Date
            </label>
            <DatePicker
              date={formData.endDate ? new Date(formData.endDate) : undefined}
              setDate={(date) => setFormData({ ...formData, endDate: date ? date.toISOString() : '' })}
              placeholder="Select end date"
              className="h-11"
            />
          </div>

          <div className="space-y-4 border rounded-xl p-4 bg-gray-50 md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-gray-700">Project Configuration</label>
              <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Budget Tracking</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={formData.hasBudget}
                    onChange={(e) => setFormData({ ...formData, hasBudget: e.target.checked })}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1D4F6D]"></div>
                </label>
                <span className={`text-[10px] font-bold uppercase transition-colors ${formData.hasBudget ? 'text-[#1D4F6D]' : 'text-gray-400'}`}>
                  {formData.hasBudget ? 'On' : 'Off'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Project Type *</label>
                <Select
                  options={[
                    { value: '', label: 'Select Type' },
                    { value: 'apartment_building', label: 'Apartment Building' },
                    { value: 'house', label: 'House' }
                  ]}
                  value={formData.type}
                  onChange={(e) => {
                    const type = e.target.value as 'apartment_building' | 'house' | '';
                    setFormData({
                      ...formData,
                      type,
                      // Reset config when type changes
                      floorCount: '',
                      roomsPerFloor: '',
                      houseType: 'whole_house',
                      sections: []
                    });
                  }}
                  className="h-11 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  {formData.hasBudget ? 'Project Budget *' : 'Budget (Disabled)'}
                </label>
                {formData.hasBudget ? (
                  <Input
                    type="text"
                    placeholder="$0.00"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    required
                    className="h-11 bg-white animate-in zoom-in-95 duration-200"
                  />
                ) : (
                  <div className="h-11 flex items-center px-4 bg-gray-100 rounded-xl text-[10px] text-gray-400 font-bold uppercase tracking-wider border border-dashed border-gray-300">
                    Financial Analysis Hidden
                  </div>
                )}
              </div>
            </div>

            {formData.type === 'apartment_building' && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Number of Floors</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 5"
                    value={formData.floorCount}
                    onChange={(e) => setFormData({ ...formData, floorCount: e.target.value })}
                    className="h-11 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Rooms per Floor</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 4"
                    value={formData.roomsPerFloor}
                    onChange={(e) => setFormData({ ...formData, roomsPerFloor: e.target.value })}
                    className="h-11 bg-white"
                  />
                </div>
              </div>
            )}

            {formData.type === 'house' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="houseType"
                      value="whole_house"
                      checked={formData.houseType === 'whole_house'}
                      onChange={() => setFormData({ ...formData, houseType: 'whole_house' })}
                      className="w-4 h-4 text-[#1D4F6D] focus:ring-[#1D4F6D]"
                    />
                    <span className="text-sm">Whole House</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="houseType"
                      value="sections"
                      checked={formData.houseType === 'sections'}
                      onChange={() => setFormData({ ...formData, houseType: 'sections' })}
                      className="w-4 h-4 text-[#1D4F6D] focus:ring-[#1D4F6D]"
                    />
                    <span className="text-sm">Sections</span>
                  </label>
                </div>

                {formData.houseType === 'sections' && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {['Basement', 'Main floor', 'Upstairs', 'Exterior'].map(section => (
                      <label key={section} className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded border border-gray-200">
                        <input
                          type="checkbox"
                          checked={formData.sections.includes(section)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, sections: [...formData.sections, section] });
                            } else {
                              setFormData({ ...formData, sections: formData.sections.filter(s => s !== section) });
                            }
                          }}
                          className="rounded text-[#1D4F6D] focus:ring-[#1D4F6D]"
                        />
                        <span className="text-sm font-medium">{section}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Address *</label>
              <Input
                placeholder="Project location address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                className="h-11 bg-white"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">
            Description
          </label>
          <Textarea
            placeholder="Enter project details..."
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="bg-[#1D4F6D] hover:bg-[#0f2331]" disabled={!formData.companyId && !preselectedCompanyId}>
            {isEditMode ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
