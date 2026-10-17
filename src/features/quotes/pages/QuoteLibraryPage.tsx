import { useEffect, useMemo, useState } from 'react';
import type { ReactNode, FormEvent } from 'react';
import {
  Archive,
  Boxes,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleOff,
  DollarSign,
  FileText,
  FolderTree,
  Home,
  Layers3,
  ListFilter,
  Mail,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Tags,
  Trash2,
  Wrench,
} from 'lucide-react';
import { SEO } from '@/shared/components/seo/SEO';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Input } from '@/shared/components/ui/Input';
import { Textarea } from '@/shared/components/ui/Textarea';
import { Modal } from '@/shared/components/ui/Modal';
import { Select } from '@/shared/components/ui/Select';
import { Switch } from '@/shared/components/ui/Switch';
import { Table, Column } from '@/shared/components/ui/Table';
import { Tabs } from '@/shared/components/ui/Tabs';
import { useDebounce } from '@/shared/hooks';
import { cn } from '@/shared/utils';
import {
  QuoteSelectorOption,
  QuoteEstimate,
  QuoteMeasurementType,
  QuoteRecord,
  QuoteWorkCategory,
  QuoteWorkItem,
  useAcceptAndCreateQuoteEstimateProjectMutation,
  useCreateQuoteMutation,
  useCreateQuoteEstimateMutation,
  useCreateQuoteMeasurementTypeMutation,
  useCreateQuoteWorkCategoryMutation,
  useCreateQuoteWorkItemMutation,
  useConvertQuoteEstimateToProjectMutation,
  useDeleteQuoteMutation,
  useDeleteQuoteEstimateMutation,
  useDisableQuoteWorkCategoryMutation,
  useDisableQuoteMeasurementTypeMutation,
  useDisableQuoteWorkItemMutation,
  useGetQuoteEstimatesQuery,
  useGetQuotesQuery,
  useGetQuoteSelectorsQuery,
  useGetQuoteMeasurementTypesQuery,
  useGetQuoteWorkCategoriesQuery,
  useGetQuoteWorkItemsQuery,
  useSendQuoteEstimateMutation,
  useUpdateQuoteEstimateMutation,
  useUpdateQuoteMutation,
  useUpdateQuoteWorkCategoryMutation,
  useUpdateQuoteMeasurementTypeMutation,
  useUpdateQuoteWorkItemMutation,
} from '@/store/quotesApi';
import { useGetCompaniesQuery } from '@/store/companiesApi';

type TabId = 'builder' | 'overview' | 'quotes' | 'categories' | 'measurements' | 'items';

type BuilderStep = 1 | 2 | 3 | 4;

interface BuilderInfo {
  companyId: string;
  projectName: string;
  clientName: string;
  projectAddress: string;
  phoneNumber: string;
  email: string;
  estimatedTime: string;
  startDate: string;
  endDate: string;
  floorsCount: string;
  unitsPerFloor: string;
  floorStart: string;
  floorEnd: string;
  unitStart: string;
  unitEnd: string;
  projectType: string;
  propertyType: string;
  unitType: string;
}

interface BuilderItem {
  id: string;
  title: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  categoryName: string;
  workItemId?: string;
  scopeChecklist: string[];
  locationMode: 'all' | 'selected';
  selectedFloorNumbers: number[];
  selectedUnitNames: string[];
  plannedLocationKeys: string[];
  description: string;
  estimatedHours: string;
  allowSubtasks: boolean;
}

interface QuoteDraft {
  workItemId: string;
  projectType: string;
  propertyType: string;
  unitType: string;
  title: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  notes: string;
  isCustom: boolean;
}

interface BuilderItemDraft {
  workItemId: string;
  title: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  categoryName: string;
  scopeChecklistText: string;
  locationMode: 'all' | 'selected';
  selectedFloorNumbersText: string;
  selectedUnitNamesText: string;
  plannedLocationKeysText: string;
  description: string;
  estimatedHours: string;
  allowSubtasks: boolean;
}

const EMPTY_BUILDER_INFO: BuilderInfo = {
  companyId: '',
  projectName: '',
  clientName: '',
  projectAddress: '',
  phoneNumber: '',
  email: '',
  estimatedTime: '',
  startDate: '',
  endDate: '',
  floorsCount: '',
  unitsPerFloor: '',
  floorStart: '1',
  floorEnd: '',
  unitStart: '101',
  unitEnd: '',
  projectType: 'new_build',
  propertyType: 'residential',
  unitType: 'apartment',
};

const EMPTY_BUILDER_ITEM_DRAFT: BuilderItemDraft = {
  workItemId: '',
  title: '',
  quantity: '1',
  unit: '',
  unitPrice: '',
  categoryName: 'Custom Items',
  scopeChecklistText: '',
  locationMode: 'all',
  selectedFloorNumbersText: '',
  selectedUnitNamesText: '',
  plannedLocationKeysText: '',
  description: '',
  estimatedHours: '',
  allowSubtasks: false,
};

interface TaskTemplateSuggestion {
  id: string;
  title: string;
  description: string;
  estimatedHours: string;
  unitPrice: string;
  source: 'previous_quote' | 'work_item' | 'quote_line';
  categoryName?: string;
  badgeLabel?: string;
}

interface CategoryDraft {
  name: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
}

interface ItemDraft {
  categoryId: string;
  projectType: string;
  propertyType: string;
  unitType: string;
  name: string;
  measurementType: string;
  unitCost: string;
  sortOrder: string;
  isActive: boolean;
}

interface MeasurementDraft {
  value: string;
  label: string;
  sortOrder: string;
  isActive: boolean;
}

const EMPTY_CATEGORY_DRAFT: CategoryDraft = {
  name: '',
  description: '',
  sortOrder: '0',
  isActive: true,
};

const EMPTY_QUOTE_DRAFT: QuoteDraft = {
  workItemId: '',
  projectType: '',
  propertyType: '',
  unitType: '',
  title: '',
  quantity: '1',
  unit: '',
  unitPrice: '',
  notes: '',
  isCustom: true,
};

const EMPTY_ITEM_DRAFT: ItemDraft = {
  categoryId: '',
  projectType: '',
  propertyType: '',
  unitType: '',
  name: '',
  measurementType: '',
  unitCost: '',
  sortOrder: '0',
  isActive: true,
};

const EMPTY_MEASUREMENT_DRAFT: MeasurementDraft = {
  value: '',
  label: '',
  sortOrder: '0',
  isActive: true,
};

function toSelectOptions(options: QuoteSelectorOption[]) {
  return options.map((option) => ({ value: option.value, label: option.label }));
}

function normalizeText(value?: string | null) {
  if (!value) return 'N/A';
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatMoney(value?: number | null) {
  if (typeof value !== 'number') return '—';
  return `$${value.toFixed(2)}`;
}

function FieldLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <label className={`block whitespace-nowrap text-xs font-black uppercase tracking-widest text-gray-400 ${className}`}>{children}</label>;
}

function QuoteFormModal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal isOpen={open} onClose={onClose} title={title} maxWidth="2xl">
      {children}
    </Modal>
  );
}

export function QuoteLibraryPage() {
  const [activeTab, setActiveTab] = useState<TabId>('builder');
  const [builderStep, setBuilderStep] = useState<BuilderStep>(1);
  const [builderInfo, setBuilderInfo] = useState<BuilderInfo>(EMPTY_BUILDER_INFO);
  const [builderItems, setBuilderItems] = useState<BuilderItem[]>([]);
  const [draftQuoteId, setDraftQuoteId] = useState<string | null>(null);
  const [builderItemDraft, setBuilderItemDraft] = useState<BuilderItemDraft>(EMPTY_BUILDER_ITEM_DRAFT);
  const [builderItemModalOpen, setBuilderItemModalOpen] = useState(false);
  const [editingBuilderItemId, setEditingBuilderItemId] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [measurementSearch, setMeasurementSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [categoryFilterId, setCategoryFilterId] = useState('');
  const [projectTypeFilter, setProjectTypeFilter] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
  const [unitTypeFilter, setUnitTypeFilter] = useState('');

  const debouncedCategorySearch = useDebounce(categorySearch, 250);
  const debouncedItemSearch = useDebounce(itemSearch, 250);

  const { data: selectors, isLoading: selectorsLoading } = useGetQuoteSelectorsQuery();
  const { data: companies = [] } = useGetCompaniesQuery({ limit: 100 });
  const { data: categories = [], isLoading: categoriesLoading } = useGetQuoteWorkCategoriesQuery({
    search: debouncedCategorySearch,
    includeInactive,
  });
  const debouncedMeasurementSearch = useDebounce(measurementSearch, 250);
  const { data: measurementTypes = [], isLoading: measurementTypesLoading } = useGetQuoteMeasurementTypesQuery({
    search: debouncedMeasurementSearch,
    includeInactive,
  });
  const { data: items = [], isLoading: itemsLoading } = useGetQuoteWorkItemsQuery({
    search: debouncedItemSearch,
    categoryId: categoryFilterId || undefined,
    projectType: projectTypeFilter || undefined,
    propertyType: propertyTypeFilter || undefined,
    unitType: unitTypeFilter || undefined,
    includeInactive,
  });
  const { data: quoteList, isLoading: quotesLoading } = useGetQuotesQuery({
    projectType: projectTypeFilter || undefined,
    propertyType: propertyTypeFilter || undefined,
    unitType: unitTypeFilter || undefined,
  });
  const quotes = quoteList?.quotes ?? [];
  const { data: quoteEstimateList, isLoading: quoteEstimatesLoading } = useGetQuoteEstimatesQuery({ limit: 100 });
  const quoteEstimates = quoteEstimateList?.data ?? [];

  const { data: builderTemplateWorkItems = [] } = useGetQuoteWorkItemsQuery({
    projectType: builderInfo.projectType || undefined,
    propertyType: builderInfo.propertyType || undefined,
    unitType: builderInfo.unitType || undefined,
    includeInactive: false,
  });
  const { data: builderTemplateQuoteList } = useGetQuotesQuery({
    projectType: builderInfo.projectType || undefined,
    propertyType: builderInfo.propertyType || undefined,
    unitType: builderInfo.unitType || undefined,
  });
  const builderTemplateQuotes = builderTemplateQuoteList?.quotes ?? [];

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const [createQuote, { isLoading: isCreatingQuote }] = useCreateQuoteMutation();
  const [createQuoteEstimate, { isLoading: isCreatingQuoteEstimate }] = useCreateQuoteEstimateMutation();
  const [updateQuoteEstimate] = useUpdateQuoteEstimateMutation();
  const [deleteQuoteEstimate] = useDeleteQuoteEstimateMutation();
  const [sendQuoteEstimate] = useSendQuoteEstimateMutation();
  const [acceptAndCreateQuoteEstimateProject] = useAcceptAndCreateQuoteEstimateProjectMutation();
  const [convertQuoteEstimateToProject] = useConvertQuoteEstimateToProjectMutation();
  const [updateQuote, { isLoading: isUpdatingQuote }] = useUpdateQuoteMutation();
  const [deleteQuote] = useDeleteQuoteMutation();
  const [createCategory, { isLoading: isCreatingCategory }] = useCreateQuoteWorkCategoryMutation();
  const [updateCategory, { isLoading: isUpdatingCategory }] = useUpdateQuoteWorkCategoryMutation();
  const [disableCategory] = useDisableQuoteWorkCategoryMutation();
  const [createMeasurementType, { isLoading: isCreatingMeasurementType }] = useCreateQuoteMeasurementTypeMutation();
  const [updateMeasurementType, { isLoading: isUpdatingMeasurementType }] = useUpdateQuoteMeasurementTypeMutation();
  const [disableMeasurementType] = useDisableQuoteMeasurementTypeMutation();
  const [createItem, { isLoading: isCreatingItem }] = useCreateQuoteWorkItemMutation();
  const [updateItem, { isLoading: isUpdatingItem }] = useUpdateQuoteWorkItemMutation();
  const [disableItem] = useDisableQuoteWorkItemMutation();

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [measurementModalOpen, setMeasurementModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<QuoteRecord | null>(null);
  const [editingCategory, setEditingCategory] = useState<QuoteWorkCategory | null>(null);
  const [editingMeasurement, setEditingMeasurement] = useState<QuoteMeasurementType | null>(null);
  const [editingItem, setEditingItem] = useState<QuoteWorkItem | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(EMPTY_CATEGORY_DRAFT);
  const [quoteDraft, setQuoteDraft] = useState<QuoteDraft>(EMPTY_QUOTE_DRAFT);
  const [measurementDraft, setMeasurementDraft] = useState<MeasurementDraft>(EMPTY_MEASUREMENT_DRAFT);
  const [itemDraft, setItemDraft] = useState<ItemDraft>(EMPTY_ITEM_DRAFT);

  const selectorOptions = selectors ?? {
    projectTypes: [],
    propertyTypes: [],
    unitTypes: [],
    measurementTypes: [],
  };

  const builderSubtotal = useMemo(
    () =>
      builderItems.reduce(
        (total, item) => total + Number(item.quantity || 0) * Number(item.unitPrice || 0),
        0,
      ),
    [builderItems],
  );

  const quoteValidUntil = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const activeCategories = useMemo(
    () => categories.filter((category) => category.isActive).length,
    [categories],
  );
  const activeItems = useMemo(
    () => items.filter((item) => item.isActive).length,
    [items],
  );
  const activeMeasurementTypes = useMemo(
    () => measurementTypes.filter((type) => type.isActive).length,
    [measurementTypes],
  );

  const overviewCards = [
    { label: 'Quotes', value: quoteEstimateList?.meta.total ?? quoteEstimates.length, hint: 'Saved estimates', icon: Archive },
    { label: 'Work Categories', value: categories.length, hint: `${activeCategories} active`, icon: FolderTree },
    { label: 'Task / Material Items', value: items.length, hint: `${activeItems} active`, icon: Boxes },
    { label: 'Selector Sets', value: '8', hint: 'Project + property + unit', icon: Layers3 },
    { label: 'Measurement Types', value: measurementTypes.length, hint: `${activeMeasurementTypes} active`, icon: Wrench },
  ];

  const setBuilderField = (field: keyof BuilderInfo, value: string) => {
    setBuilderInfo((current) => ({ ...current, [field]: value }));
    if (field === 'projectType' || field === 'propertyType' || field === 'unitType') {
      setBuilderItems([]);
    }
  };

  const applyBuilderWorkItem = (workItemId: string) => {
    const selectedItem = items.find((item) => item.id === workItemId);
    setBuilderItemDraft((draft) => ({
      ...draft,
      workItemId,
      ...(selectedItem
        ? {
            title: selectedItem.name,
            unit: selectedItem.measurementType,
            unitPrice: selectedItem.unitCost === null || selectedItem.unitCost === undefined ? draft.unitPrice : String(selectedItem.unitCost),
            categoryName: selectedItem.category?.name ?? draft.categoryName,
          }
        : {}),
    }));
  };

  const taskSuggestions = useMemo(() => {
    const norm = (str?: string | null) => (str || '').toLowerCase().replace(/[\s_-]+/g, '');
    const currentProject = norm(builderInfo.projectType);
    const currentProperty = norm(builderInfo.propertyType);
    const currentUnit = norm(builderInfo.unitType);

    const suggestions: TaskTemplateSuggestion[] = [];
    const titleKeyMap = new Map<string, number>();

    // 1. Process tasks from matching previous quote estimates
    const matchingEstimates = quoteEstimates.filter((est) => {
      const matchProject = !currentProject || !est.projectType || norm(est.projectType) === currentProject;
      const matchProperty = !currentProperty || !est.propertyType || norm(est.propertyType) === currentProperty;
      const matchUnit = !currentUnit || !est.unitType || norm(est.unitType) === currentUnit;
      return matchProject && matchProperty && matchUnit;
    });

    for (const est of matchingEstimates) {
      for (const task of est.tasks || []) {
        const cleanTitle = (task.title || '').trim();
        if (!cleanTitle) continue;
        const key = cleanTitle.toLowerCase();

        const itemData: TaskTemplateSuggestion = {
          id: `prev-task-${task.id || Math.random()}`,
          title: cleanTitle,
          description: task.description?.trim() || '',
          estimatedHours: task.estimatedHours != null ? String(task.estimatedHours) : '',
          unitPrice: task.unitPrice != null ? String(task.unitPrice) : '0',
          source: 'previous_quote',
          badgeLabel: 'Saved Task',
        };

        if (!titleKeyMap.has(key)) {
          titleKeyMap.set(key, suggestions.length);
          suggestions.push(itemData);
        } else {
          const existingIdx = titleKeyMap.get(key)!;
          const existing = suggestions[existingIdx];
          if ((!existing.description && itemData.description) || (!existing.estimatedHours && itemData.estimatedHours)) {
            suggestions[existingIdx] = {
              ...existing,
              description: existing.description || itemData.description,
              estimatedHours: existing.estimatedHours || itemData.estimatedHours,
              unitPrice: existing.unitPrice !== '0' ? existing.unitPrice : itemData.unitPrice,
            };
          }
        }
      }
    }

    // 2. Process matching quote line items
    for (const quote of builderTemplateQuotes) {
      const cleanTitle = (quote.title || '').trim();
      if (!cleanTitle) continue;
      const key = cleanTitle.toLowerCase();

      const itemData: TaskTemplateSuggestion = {
        id: `quote-${quote.id}`,
        title: cleanTitle,
        description: quote.notes?.trim() || '',
        estimatedHours: '',
        unitPrice: quote.unitPrice != null ? String(quote.unitPrice) : '0',
        source: 'quote_line',
        badgeLabel: 'Quote Line',
      };

      if (!titleKeyMap.has(key)) {
        titleKeyMap.set(key, suggestions.length);
        suggestions.push(itemData);
      } else {
        const existingIdx = titleKeyMap.get(key)!;
        const existing = suggestions[existingIdx];
        if (!existing.description && itemData.description) {
          suggestions[existingIdx] = {
            ...existing,
            description: itemData.description,
          };
        }
      }
    }

    // 3. Process work items from library matching builder filters
    for (const item of builderTemplateWorkItems) {
      const cleanTitle = (item.name || '').trim();
      if (!cleanTitle) continue;
      const key = cleanTitle.toLowerCase();

      const itemData: TaskTemplateSuggestion = {
        id: item.id,
        title: cleanTitle,
        description: '',
        estimatedHours: '',
        unitPrice: item.unitCost != null ? String(item.unitCost) : '0',
        source: 'work_item',
        categoryName: item.category?.name || 'Standard Items',
        badgeLabel: 'Library Item',
      };

      if (!titleKeyMap.has(key)) {
        titleKeyMap.set(key, suggestions.length);
        suggestions.push(itemData);
      } else {
        const existingIdx = titleKeyMap.get(key)!;
        if (!suggestions[existingIdx].categoryName && itemData.categoryName) {
          suggestions[existingIdx].categoryName = itemData.categoryName;
        }
      }
    }

    return suggestions.sort((a, b) => a.title.localeCompare(b.title));
  }, [quoteEstimates, builderTemplateQuotes, builderTemplateWorkItems, builderInfo.projectType, builderInfo.propertyType, builderInfo.unitType]);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const suggestion = taskSuggestions.find((s) => s.id === templateId);
    if (!suggestion) return;

    setBuilderItemDraft((draft) => ({
      ...draft,
      workItemId: suggestion.source === 'work_item' ? suggestion.id : '',
      title: suggestion.title,
      description: suggestion.description || '',
      estimatedHours: suggestion.estimatedHours || '',
      unitPrice: suggestion.unitPrice || '0',
      categoryName: suggestion.categoryName || draft.categoryName || 'Custom Items',
    }));
  };

  const handleClearTemplateSelection = () => {
    setSelectedTemplateId('');
    setBuilderItemDraft((draft) => ({
      ...draft,
      workItemId: '',
      title: '',
      description: '',
      estimatedHours: '',
      unitPrice: '',
    }));
  };

  const openBuilderItemModal = () => {
    setEditingBuilderItemId(null);
    setSelectedTemplateId('');
    setBuilderItemDraft(EMPTY_BUILDER_ITEM_DRAFT);
    setBuilderItemModalOpen(true);
  };

  const openEditBuilderItem = (item: BuilderItem) => {
    setEditingBuilderItemId(item.id);
    setSelectedTemplateId('');
    setBuilderItemDraft({
      ...EMPTY_BUILDER_ITEM_DRAFT,
      workItemId: item.workItemId || '',
      title: item.title,
      description: item.description || '',
      quantity: item.quantity || '1',
      unit: item.unit || 'each',
      unitPrice: item.unitPrice || '0',
      categoryName: item.categoryName || 'Custom Items',
      scopeChecklistText: item.scopeChecklist.join('\n'),
      locationMode: item.locationMode,
      selectedFloorNumbersText: item.selectedFloorNumbers.join(', '),
      selectedUnitNamesText: item.selectedUnitNames.join(', '),
      plannedLocationKeysText: item.plannedLocationKeys.join(', '),
      estimatedHours: item.estimatedHours || '',
      allowSubtasks: item.allowSubtasks,
    });
    setBuilderItemModalOpen(true);
  };

  const handleAddBuilderItem = async () => {
    if (!builderItemDraft.title.trim()) return;
    const selectedLocationCount = builderItemDraft.plannedLocationKeysText
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean).length || Number(builderItemDraft.quantity || 1);
    const item: BuilderItem = {
      id: builderItemDraft.workItemId || `custom-${Date.now()}`,
      workItemId: builderItemDraft.workItemId || undefined,
      title: builderItemDraft.title.trim(),
      quantity: String(selectedLocationCount || 1),
      unit: builderItemDraft.unit.trim() || 'each',
      unitPrice: builderItemDraft.unitPrice || '0',
      categoryName: builderItemDraft.categoryName || 'Custom Items',
      scopeChecklist: builderItemDraft.scopeChecklistText.split('\n').map((value) => value.trim()).filter(Boolean),
      locationMode: builderItemDraft.locationMode,
      selectedFloorNumbers: builderItemDraft.selectedFloorNumbersText.split(',').map((value) => Number(value.trim())).filter((value) => Number.isFinite(value)),
      selectedUnitNames: builderItemDraft.selectedUnitNamesText.split(',').map((value) => value.trim()).filter(Boolean),
      plannedLocationKeys: builderItemDraft.plannedLocationKeysText.split(',').map((value) => value.trim()).filter(Boolean),
      description: builderItemDraft.description.trim(),
      estimatedHours: builderItemDraft.estimatedHours,
      allowSubtasks: builderItemDraft.allowSubtasks,
    };
    const nextItems = editingBuilderItemId
      ? builderItems.map((entry) => (entry.id === editingBuilderItemId ? { ...item, id: editingBuilderItemId } : entry))
      : [...builderItems, item];
    setBuilderItems(nextItems);
    // Close immediately after the service is added; draft persistence continues
    // in the background when a quote draft already exists.
    setBuilderItemDraft(EMPTY_BUILDER_ITEM_DRAFT);
    setSelectedTemplateId('');
    setBuilderItemModalOpen(false);
    setEditingBuilderItemId(null);
    if (draftQuoteId) {
      await updateQuoteEstimate({
        id: draftQuoteId,
        data: { tasks: nextItems.map((entry, index) => ({
          title: entry.title,
          quantity: Number(entry.quantity || 1),
          unit: entry.unit,
          unitPrice: Number(entry.unitPrice || 0),
          sortOrder: index,
          scopeChecklist: entry.scopeChecklist,
          locationMode: entry.locationMode,
          selectedFloorNumbers: entry.selectedFloorNumbers,
          selectedUnitNames: entry.selectedUnitNames,
          plannedLocationKeys: entry.plannedLocationKeys,
          description: entry.description,
          estimatedHours: entry.estimatedHours ? Number(entry.estimatedHours) : undefined,
        })) },
      }).unwrap();
    }
  };

  const getBuilderPayload = (includeTasks = true) => ({
    companyId: builderInfo.companyId,
    projectName: builderInfo.projectName.trim(),
    clientName: builderInfo.clientName.trim(),
    clientEmail: builderInfo.email.trim() || undefined,
    clientPhone: builderInfo.phoneNumber.trim() || undefined,
    projectAddress: builderInfo.projectAddress.trim(),
    projectType: builderInfo.projectType,
    propertyType: builderInfo.propertyType,
    unitType: builderInfo.unitType,
    startDate: builderInfo.startDate || undefined,
    endDate: builderInfo.endDate || undefined,
    floorStart: builderInfo.floorStart ? Number(builderInfo.floorStart) : undefined,
    floorEnd: builderInfo.floorEnd ? Number(builderInfo.floorEnd) : undefined,
    unitStart: builderInfo.unitStart ? Number(builderInfo.unitStart) : undefined,
    unitEnd: builderInfo.unitEnd ? Number(builderInfo.unitEnd) : undefined,
    tasks: includeTasks ? builderItems.map((item, index) => ({
      title: item.title,
      quantity: Number(item.quantity || 1),
      unit: item.unit,
      unitPrice: Number(item.unitPrice || 0),
      sortOrder: index,
      scopeChecklist: item.scopeChecklist,
      locationMode: item.locationMode,
      selectedFloorNumbers: item.selectedFloorNumbers,
      selectedUnitNames: item.selectedUnitNames,
      plannedLocationKeys: item.plannedLocationKeys,
      description: item.description,
      estimatedHours: item.estimatedHours ? Number(item.estimatedHours) : undefined,
    })) : [],
  });

  const handleBuilderStepOneNext = async () => {
    if (!builderInfo.companyId || !builderInfo.projectName.trim() || !builderInfo.clientName.trim() || !builderInfo.projectAddress.trim()) return;
    const created = await createQuoteEstimate(getBuilderPayload(false)).unwrap();
    setDraftQuoteId(created.quote.id);
    setBuilderStep(2);
  };

  const handleGenerateBuilderQuote = async () => {
    if (!builderInfo.companyId || !builderInfo.projectName.trim() || !builderInfo.clientName.trim() || !builderInfo.projectAddress.trim() || builderItems.length === 0) return;

    const payload = getBuilderPayload(true);
    if (draftQuoteId) await updateQuoteEstimate({ id: draftQuoteId, data: payload }).unwrap();
    else await createQuoteEstimate(payload).unwrap();

    setActiveTab('quotes');
    setBuilderStep(1);
    setBuilderInfo(EMPTY_BUILDER_INFO);
    setBuilderItems([]);
    setDraftQuoteId(null);
  };

  const openCreateQuote = () => {
    setEditingQuote(null);
    setQuoteDraft(EMPTY_QUOTE_DRAFT);
    setQuoteModalOpen(true);
  };

  const openEditQuote = (quote: QuoteRecord) => {
    setEditingQuote(quote);
    setQuoteDraft({
      workItemId: quote.workItemId ?? '',
      projectType: quote.projectType ?? '',
      propertyType: quote.propertyType ?? '',
      unitType: quote.unitType ?? '',
      title: quote.title ?? '',
      quantity: String(quote.quantity ?? 1),
      unit: quote.unit ?? quote.measurementType ?? '',
      unitPrice: String(quote.unitPrice ?? ''),
      notes: quote.notes ?? '',
      isCustom: quote.isCustom ?? false,
    });
    setQuoteModalOpen(true);
  };

  const applyQuoteWorkItem = (workItemId: string) => {
    const selectedItem = items.find((item) => item.id === workItemId);
    setQuoteDraft((draft) => ({
      ...draft,
      workItemId,
      isCustom: !workItemId,
      ...(selectedItem
        ? {
            projectType: selectedItem.projectType,
            propertyType: selectedItem.propertyType,
            unitType: selectedItem.unitType,
            title: selectedItem.name,
            unit: selectedItem.measurementType,
            unitPrice: selectedItem.unitCost === null || selectedItem.unitCost === undefined ? draft.unitPrice : String(selectedItem.unitCost),
          }
        : {}),
    }));
  };

  const handleQuoteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      workItemId: quoteDraft.workItemId || undefined,
      projectType: quoteDraft.projectType,
      propertyType: quoteDraft.propertyType,
      unitType: quoteDraft.unitType,
      title: quoteDraft.title.trim(),
      quantity: Number(quoteDraft.quantity || 1),
      unit: quoteDraft.unit.trim() || undefined,
      unitPrice: Number(quoteDraft.unitPrice || 0),
      notes: quoteDraft.notes.trim() || undefined,
      isCustom: quoteDraft.isCustom,
    };

    if (!payload.projectType || !payload.propertyType || !payload.unitType || !payload.title || payload.quantity <= 0) {
      return;
    }

    if (editingQuote?.id) {
      await updateQuote({ id: editingQuote.id, data: payload }).unwrap();
    } else {
      await createQuote(payload).unwrap();
    }

    setQuoteModalOpen(false);
    setEditingQuote(null);
    setQuoteDraft(EMPTY_QUOTE_DRAFT);
  };

  const handleDeleteQuote = async (quote: QuoteRecord) => {
    if (!quote?.id) return;
    if (!window.confirm(`Delete quote "${quote.title}"?`)) return;
    await deleteQuote(quote.id).unwrap();
  };

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryDraft(EMPTY_CATEGORY_DRAFT);
    setCategoryModalOpen(true);
  };

  const openEditCategory = (category: QuoteWorkCategory) => {
    setEditingCategory(category);
    setCategoryDraft({
      name: category.name,
      description: category.description ?? '',
      sortOrder: String(category.sortOrder ?? 0),
      isActive: category.isActive,
    });
    setCategoryModalOpen(true);
  };

  const openCreateItem = () => {
    setEditingItem(null);
    setItemDraft(EMPTY_ITEM_DRAFT);
    if (categories[0]?.id) {
      setItemDraft((draft) => ({ ...draft, categoryId: categories[0].id }));
    }
    setItemModalOpen(true);
  };

  const openEditItem = (item: QuoteWorkItem) => {
    if (!item || !item.id) {
      console.warn('Cannot edit work item: missing ID', item);
      return;
    }
    setEditingItem(item);
    setItemDraft({
      categoryId: item.categoryId || item.category?.id || '',
      projectType: item.projectType || '',
      propertyType: item.propertyType || '',
      unitType: item.unitType || '',
      name: item.name || '',
      measurementType: item.measurementType || '',
      unitCost: item.unitCost === null || item.unitCost === undefined ? '' : String(item.unitCost),
      sortOrder: String(item.sortOrder ?? 0),
      isActive: item.isActive ?? true,
    });
    setItemModalOpen(true);
  };

  useEffect(() => {
    if (!itemModalOpen) return;
    if (itemDraft.categoryId || !categories[0]?.id) return;
    setItemDraft((draft) => ({ ...draft, categoryId: categories[0].id }));
  }, [categories, itemDraft.categoryId, itemModalOpen]);

  const handleCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      name: categoryDraft.name.trim(),
      description: categoryDraft.description.trim() || undefined,
      sortOrder: Number(categoryDraft.sortOrder || 0),
      isActive: categoryDraft.isActive,
    };

    if (!payload.name) return;

    if (editingCategory?.id) {
      await updateCategory({ id: editingCategory.id, data: payload }).unwrap();
    } else {
      await createCategory(payload).unwrap();
    }

    setCategoryModalOpen(false);
    setEditingCategory(null);
    setCategoryDraft(EMPTY_CATEGORY_DRAFT);
  };

  const openCreateMeasurement = () => {
    setEditingMeasurement(null);
    setMeasurementDraft(EMPTY_MEASUREMENT_DRAFT);
    setMeasurementModalOpen(true);
  };

  const openEditMeasurement = (measurementType: QuoteMeasurementType) => {
    if (!measurementType || !measurementType.id) {
      console.warn('Cannot edit measurement type: missing ID', measurementType);
      return;
    }
    setEditingMeasurement(measurementType);
    setMeasurementDraft({
      value: measurementType.value,
      label: measurementType.label,
      sortOrder: String(measurementType.sortOrder ?? 0),
      isActive: measurementType.isActive,
    });
    setMeasurementModalOpen(true);
  };

  const handleMeasurementSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      value: measurementDraft.value.trim(),
      label: measurementDraft.label.trim(),
      sortOrder: Number(measurementDraft.sortOrder || 0),
      isActive: measurementDraft.isActive,
    };

    if (!payload.value || !payload.label) return;

    if (editingMeasurement?.id) {
      await updateMeasurementType({ id: editingMeasurement.id, data: payload }).unwrap();
    } else {
      await createMeasurementType(payload).unwrap();
    }

    setMeasurementModalOpen(false);
    setEditingMeasurement(null);
    setMeasurementDraft(EMPTY_MEASUREMENT_DRAFT);
  };

  const handleDisableMeasurementType = async (measurementType: QuoteMeasurementType) => {
    if (!measurementType?.id) return;
    if (!window.confirm(`Disable measurement type "${measurementType.label}"?`)) return;
    await disableMeasurementType(measurementType.id).unwrap();
  };

  const handleItemSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      categoryId: itemDraft.categoryId,
      projectType: itemDraft.projectType,
      propertyType: itemDraft.propertyType,
      unitType: itemDraft.unitType,
      name: itemDraft.name.trim(),
      measurementType: itemDraft.measurementType,
      unitCost: itemDraft.unitCost === '' ? undefined : Number(itemDraft.unitCost),
      sortOrder: Number(itemDraft.sortOrder || 0),
      isActive: itemDraft.isActive,
    };

    if (!payload.categoryId || !payload.projectType || !payload.propertyType || !payload.unitType || !payload.name || !payload.measurementType) {
      return;
    }

    if (editingItem?.id) {
      await updateItem({ id: editingItem.id, data: payload }).unwrap();
    } else {
      await createItem(payload).unwrap();
    }

    setItemModalOpen(false);
    setEditingItem(null);
    setItemDraft(EMPTY_ITEM_DRAFT);
  };

  const handleDisableCategory = async (category: QuoteWorkCategory) => {
    if (!category?.id) return;
    if (!window.confirm(`Disable category "${category.name}"?`)) return;
    await disableCategory(category.id).unwrap();
  };

  const handleDisableItem = async (item: QuoteWorkItem) => {
    if (!item?.id) return;
    if (!window.confirm(`Disable work item "${item.name}"?`)) return;
    await disableItem(item.id).unwrap();
  };

  const handleSendEstimate = async (quote: QuoteEstimate) => {
    await sendQuoteEstimate(quote.id).unwrap();
  };

  const handleConvertEstimate = async (quote: QuoteEstimate) => {
    if (!window.confirm(`Accept quote "${quote.projectName}" and create a project?`)) return;
    await acceptAndCreateQuoteEstimateProject({
      id: quote.id,
      acceptedByName: quote.clientName,
      notes: 'Accepted from admin dashboard',
    }).unwrap();
  };

  const handleSyncEstimateTasks = async (quote: QuoteEstimate) => {
    if (!window.confirm(`Create missing project tasks from quote "${quote.projectName}"?`)) return;
    await convertQuoteEstimateToProject(quote.id).unwrap();
  };

  const handleDeleteEstimate = async (quote: QuoteEstimate) => {
    if (!window.confirm(`Delete quote "${quote.projectName}"?`)) return;
    await deleteQuoteEstimate(quote.id).unwrap();
  };

  const quoteEstimateColumns: Column<QuoteEstimate>[] = [
    {
      key: 'projectName',
      header: 'Quote',
      render: (quote) => (
        <div className="space-y-1">
          <div className="font-semibold text-gray-900">{quote.projectName}</div>
          <div className="text-xs text-gray-500">{quote.quoteNumber} • {quote.clientName}</div>
        </div>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      render: (quote) => <span className="font-medium text-gray-700">{quote.company?.name ?? 'N/A'}</span>,
    },
    {
      key: 'scope',
      header: 'Scope',
      render: (quote) => (
        <div className="space-y-1 text-xs font-medium text-gray-600">
          <div>{normalizeText(quote.projectType)} • {normalizeText(quote.propertyType)}</div>
          <div>{quote.floorsCount ?? 0} floors • {quote.unitsPerFloor ?? 0} units/floor</div>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (quote) => <Badge variant="secondary">{quote.tasks?.length ?? 0}</Badge>,
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (quote) => <span className="font-black text-gray-900">{formatMoney(quote.totalAmount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (quote) => (
        <Badge className={cn(
          quote.status === 'converted' && 'bg-emerald-50 text-emerald-700',
          quote.status === 'accepted' && 'bg-blue-50 text-blue-700',
          quote.status === 'sent' && 'bg-amber-50 text-amber-700',
          quote.status === 'rejected' && 'bg-red-50 text-red-700',
          quote.status === 'draft' && 'bg-gray-100 text-gray-600',
        )}>
          {normalizeText(quote.status)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (quote) => (
        <div className="flex flex-wrap gap-2">
          {quote.status !== 'converted' && quote.status !== 'rejected' && quote.status !== 'cancelled' && (
            <Button variant="outline" size="sm" onClick={() => handleSendEstimate(quote)}>Send</Button>
          )}
          {quote.status !== 'converted' && quote.status !== 'rejected' && quote.status !== 'cancelled' && (
            <Button variant="outline" size="sm" onClick={() => handleConvertEstimate(quote)}>Accept & Create Project</Button>
          )}
          {quote.status === 'converted' && (
            <Button variant="outline" size="sm" onClick={() => handleSyncEstimateTasks(quote)}>Sync Tasks</Button>
          )}
          {quote.status !== 'converted' && (
            <Button variant="outline" size="sm" onClick={() => handleDeleteEstimate(quote)}>Delete</Button>
          )}
        </div>
      ),
    },
  ];

  const quoteColumns: Column<QuoteRecord>[] = [
    {
      key: 'title',
      header: 'Quote',
      render: (quote) => (
        <div className="space-y-1">
          <div className="font-semibold text-gray-900">{quote.title}</div>
          <div className="text-xs text-gray-500">{quote.workItem?.name ?? quote.notes ?? 'No linked work item'}</div>
        </div>
      ),
    },
    {
      key: 'selectors',
      header: 'Selectors',
      render: (quote) => (
        <div className="space-y-1 text-xs font-medium text-gray-600">
          <div>{normalizeText(quote.projectType)}</div>
          <div>{normalizeText(quote.propertyType)}</div>
          <div>{normalizeText(quote.unitType)}</div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty',
      render: (quote) => (
        <span className="font-medium text-gray-700">
          {quote.quantity} {quote.unit || quote.measurementType || ''}
        </span>
      ),
    },
    {
      key: 'unitPrice',
      header: 'Unit Price',
      render: (quote) => <span className="font-medium text-gray-700">{formatMoney(quote.unitPrice)}</span>,
    },
    {
      key: 'subtotal',
      header: 'Subtotal',
      render: (quote) => <span className="font-black text-gray-900">{formatMoney(quote.subtotal)}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (quote) => (
        <Badge className={cn(quote.isCustom ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>
          {quote.isCustom ? 'Custom' : 'Library'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (quote) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openEditQuote(quote)}>
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDeleteQuote(quote)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const categoryColumns: Column<QuoteWorkCategory>[] = [
    {
      key: 'name',
      header: 'Category',
      render: (category) => (
        <div className="space-y-1">
          <div className="font-semibold text-gray-900">{category.name}</div>
          <div className="text-xs text-gray-500">{category.description || 'No description'}</div>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (category) => <Badge variant="secondary">{category._count?.workItems ?? 0}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (category) => (
        <Badge className={cn(category.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
          {category.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'sortOrder',
      header: 'Sort',
      render: (category) => <span className="font-medium text-gray-700">{category.sortOrder}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (category) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openEditCategory(category)}>
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDisableCategory(category)} disabled={!category.isActive}>
            Disable
          </Button>
        </div>
      ),
    },
  ];

  const measurementColumns: Column<QuoteMeasurementType>[] = [
    {
      key: 'label',
      header: 'Measurement Type',
      render: (measurementType) => (
        <div className="space-y-1">
          <div className="font-semibold text-gray-900">{measurementType.label}</div>
          <div className="text-xs text-gray-500">Value: {measurementType.value}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (measurementType) => (
        <Badge className={cn(measurementType.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
          {measurementType.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'sortOrder',
      header: 'Sort',
      render: (measurementType) => <span className="font-medium text-gray-700">{measurementType.sortOrder}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (measurementType) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openEditMeasurement(measurementType)}>
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDisableMeasurementType(measurementType)} disabled={!measurementType.isActive}>
            Disable
          </Button>
        </div>
      ),
    },
  ];

  const itemColumns: Column<QuoteWorkItem>[] = [
    {
      key: 'name',
      header: 'Work Item',
      render: (item) => (
        <div className="space-y-1">
          <div className="font-semibold text-gray-900">{item.name}</div>
          <div className="text-xs text-gray-500">Measurement: {normalizeText(item.measurementType)}</div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (item) => <Badge variant="secondary">{item.category?.name ?? 'N/A'}</Badge>,
    },
    {
      key: 'selector',
      header: 'Selectors',
      render: (item) => (
        <div className="space-y-1 text-xs font-medium text-gray-600">
          <div>{normalizeText(item.projectType)}</div>
          <div>{normalizeText(item.propertyType)}</div>
          <div>{normalizeText(item.unitType)}</div>
        </div>
      ),
    },
    {
      key: 'cost',
      header: 'Unit Cost',
      render: (item) => <span className="font-medium text-gray-700">{formatMoney(item.unitCost ?? null)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <Badge className={cn(item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
          {item.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openEditItem(item)}>
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDisableItem(item)} disabled={!item.isActive}>
            Disable
          </Button>
        </div>
      ),
    },
  ];

  if (selectorsLoading && !selectors) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1D4F6D] border-t-transparent" />
      </div>
    );
  }

  const plannedFloorNumbers = builderInfo.floorStart && builderInfo.floorEnd
    ? Array.from({ length: Math.max(0, Number(builderInfo.floorEnd) - Number(builderInfo.floorStart) + 1) }, (_, index) => Number(builderInfo.floorStart) + index)
    : [];
  const getPlannedUnitNames = (floor: number) => {
    if (!builderInfo.unitStart || !builderInfo.unitEnd) return [];
    const count = Math.max(0, Number(builderInfo.unitEnd) - Number(builderInfo.unitStart) + 1);
    const floorOffset = floor - Number(builderInfo.floorStart || plannedFloorNumbers[0] || 1);
    return Array.from({ length: count }, (_, index) => String(Number(builderInfo.unitStart) + floorOffset * 100 + index));
  };

  return (
    <div className="space-y-6 pb-12">
      <SEO title="Quote Library" description="Manage quotation work categories, work items, and selector options." />

      <PageHeader
        title="Quote Library"
        description="Manage categories and master work items for the quotation module."
        icon={Archive}
      >
        <Button variant="outline" onClick={openCreateCategory}>
          <Tags className="mr-2 h-4 w-4" />
          New Category
        </Button>
        <Button variant="outline" onClick={openCreateMeasurement}>
          <Wrench className="mr-2 h-4 w-4" />
          New Measurement
        </Button>
        <Button onClick={openCreateItem}>
          <Plus className="mr-2 h-4 w-4" />
          New Work Item
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {overviewCards.map((card) => (
          <Card key={card.label} className="border-gray-100 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400">{card.label}</p>
                  <div className="mt-3 text-3xl font-black text-gray-900">{card.value}</div>
                  <p className="mt-2 text-sm font-medium text-gray-500">{card.hint}</p>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#1D4F6D]/8 text-[#1D4F6D]">
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs
        tabs={[
          { id: 'builder', label: 'Quote Builder' },
          { id: 'overview', label: 'Selector Guide' },
          { id: 'quotes', label: 'Quotes', count: quoteEstimateList?.meta.total ?? quoteEstimates.length },
          { id: 'categories', label: 'Categories', count: categories.length },
          { id: 'measurements', label: 'Measurements', count: measurementTypes.length },
          { id: 'items', label: 'Task / Material Items', count: items.length },
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as TabId)}
      />

      {activeTab === 'builder' && (
        <div className="mx-auto max-w-5xl space-y-6">
          <Card className="border-gray-100 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Construction Quote Builder</h2>
                  <p className="mt-1 text-sm font-medium text-gray-500">Create project-style estimates with task, labor, material, and inventory lines.</p>
                </div>
                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4].map((stepNumber) => (
                    <button
                      key={stepNumber}
                      type="button"
                      onClick={() => setBuilderStep(stepNumber as BuilderStep)}
                      className={cn(
                        'grid h-11 w-11 place-items-center rounded-full text-sm font-black',
                        builderStep >= stepNumber ? 'bg-[#1D4F6D] text-white' : 'bg-gray-100 text-gray-400',
                      )}
                    >
                      {stepNumber}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {builderStep === 1 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-gray-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-[#1D4F6D]" />
                    Client Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <FieldLabel>Under Company *</FieldLabel>
                    <Select
                      value={builderInfo.companyId}
                      onChange={(e) => setBuilderField('companyId', e.target.value)}
                      placeholder="Select company"
                      options={companies.map((company) => ({ value: company.id, label: company.name }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Project Name *</FieldLabel>
                    <Input value={builderInfo.projectName} onChange={(e) => setBuilderField('projectName', e.target.value)} placeholder="Enter project name" />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Client Name *</FieldLabel>
                    <Input value={builderInfo.clientName} onChange={(e) => setBuilderField('clientName', e.target.value)} placeholder="Enter client name" />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Project Address *</FieldLabel>
                    <Input value={builderInfo.projectAddress} onChange={(e) => setBuilderField('projectAddress', e.target.value)} placeholder="Enter full project address" />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Phone Number</FieldLabel>
                    <Input value={builderInfo.phoneNumber} onChange={(e) => setBuilderField('phoneNumber', e.target.value)} placeholder="Enter phone number" />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Email</FieldLabel>
                    <Input value={builderInfo.email} onChange={(e) => setBuilderField('email', e.target.value)} placeholder="Enter email address" />
                  </div>
      
                </CardContent>
              </Card>

              <Card className="border-gray-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-[#1D4F6D]" />
                    Project Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <FieldLabel>Project Type</FieldLabel>
                    <Select
                      value={builderInfo.projectType}
                      onChange={(e) => setBuilderField('projectType', e.target.value)}
                      placeholder="Select project type"
                      options={toSelectOptions(selectorOptions.projectTypes)}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Property Type</FieldLabel>
                    <Select
                      value={builderInfo.propertyType}
                      onChange={(e) => setBuilderField('propertyType', e.target.value)}
                      placeholder="Select property type"
                      options={toSelectOptions(selectorOptions.propertyTypes)}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Unit Type</FieldLabel>
                    <Select
                      value={builderInfo.unitType}
                      onChange={(e) => setBuilderField('unitType', e.target.value)}
                      placeholder="Select unit type"
                      options={toSelectOptions(selectorOptions.unitTypes)}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <FieldLabel>Start Date</FieldLabel>
                      <Input type="date" value={builderInfo.startDate} onChange={(e) => setBuilderField('startDate', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel>End Date</FieldLabel>
                      <Input type="date" value={builderInfo.endDate} onChange={(e) => setBuilderField('endDate', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <FieldLabel className="whitespace-nowrap">Floor Start</FieldLabel>
                      <Input type="number" min="1" value={builderInfo.floorStart} onChange={(e) => setBuilderField('floorStart', e.target.value)} placeholder="e.g. 1" />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel className="whitespace-nowrap">Floor End</FieldLabel>
                      <Input type="number" min="1" value={builderInfo.floorEnd} onChange={(e) => setBuilderField('floorEnd', e.target.value)} placeholder="e.g. 4" />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel className="whitespace-nowrap">Unit Start</FieldLabel>
                      <Input type="number" min="1" value={builderInfo.unitStart} onChange={(e) => setBuilderField('unitStart', e.target.value)} placeholder="e.g. 101" />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel className="whitespace-nowrap">Unit End</FieldLabel>
                      <Input type="number" min="1" value={builderInfo.unitEnd} onChange={(e) => setBuilderField('unitEnd', e.target.value)} placeholder="e.g. 103" />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleBuilderStepOneNext}
                    disabled={!builderInfo.companyId || !builderInfo.projectName.trim() || !builderInfo.clientName.trim() || !builderInfo.projectAddress.trim()}
                  >
                    Next
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {builderStep === 2 && (
            <div className="space-y-6">
              <Card className="border-gray-100 shadow-sm">
                <CardHeader className="gap-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-[#1D4F6D]" />
                        Add Tasks, Labor, Materials
                      </CardTitle>
                      <CardDescription>Add task cost, worker/labor cost, material cost, or inventory items as quote lines.</CardDescription>
                    </div>
                    <Button onClick={openBuilderItemModal}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Service
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {builderItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm font-medium text-gray-500">
                      No task, labor, material, or inventory line added yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {builderItems.map((item) => {
                        const itemSubtotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);
                        return (
                          <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <p className="text-xs font-black uppercase tracking-widest text-gray-400">{item.categoryName}</p>
                                <h3 className="mt-1 text-lg font-black text-gray-900">{item.title}</h3>
                                <p className="mt-1 text-sm font-medium text-gray-500">
                                  {item.quantity} {item.unit} x {formatMoney(Number(item.unitPrice || 0))}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-black text-gray-900">{formatMoney(itemSubtotal)}</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditBuilderItem(item)}
                                  title="Edit service"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setBuilderItems((current) => current.filter((currentItem) => currentItem.id !== item.id))}
                                  title="Remove service"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div className="grid gap-4 text-center sm:grid-cols-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Lines Selected</p>
                        <p className="mt-1 text-2xl font-black text-[#1D4F6D]">{builderItems.length}</p>
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Estimated Total</p>
                        <p className="mt-1 text-2xl font-black text-[#1D4F6D]">{formatMoney(builderSubtotal)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Subtotal</p>
                        <p className="mt-1 text-2xl font-black text-[#1D4F6D]">{formatMoney(builderSubtotal)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button variant="outline" className="flex-1" onClick={() => setBuilderStep(1)}>Back</Button>
                    <Button className="flex-1" onClick={() => setBuilderStep(3)} disabled={builderItems.length === 0}>Next</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {builderStep === 3 && (
            <div className="space-y-6">
              <Card className="border-gray-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#1D4F6D]" />
                    Quote Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Project</p>
                    <p className="mt-1 font-black text-gray-900">{builderInfo.projectName || 'N/A'}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Company</p>
                    <p className="mt-1 font-black text-gray-900">{companies.find((company) => company.id === builderInfo.companyId)?.name || 'N/A'}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Client</p>
                    <p className="mt-1 font-black text-gray-900">{builderInfo.clientName || 'N/A'}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Project Address</p>
                    <p className="mt-1 font-black text-gray-900">{builderInfo.projectAddress || 'N/A'}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Client Email</p>
                    <p className="mt-1 font-black text-gray-900">{builderInfo.email || 'N/A'}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Project Details</p>
                    <p className="mt-1 font-black text-gray-900">
                      {normalizeText(builderInfo.projectType)} • {normalizeText(builderInfo.propertyType)} • {normalizeText(builderInfo.unitType)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Planning</p>
                    <p className="mt-1 font-black text-gray-900">
                      Floors {builderInfo.floorStart || '1'}-{builderInfo.floorEnd || builderInfo.floorStart || '1'} • Units {builderInfo.unitStart || '1'}-{builderInfo.unitEnd || builderInfo.unitStart || '1'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-100 shadow-sm">
                <CardHeader>
                  <CardTitle>Selected Quote Lines</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {builderItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl border border-gray-100 p-4">
                      <div>
                        <p className="font-black text-gray-900">{item.title}</p>
                        <p className="text-sm font-medium text-gray-500">{item.quantity} {item.unit} x {formatMoney(Number(item.unitPrice || 0))}</p>
                      </div>
                      <p className="font-black text-gray-900">{formatMoney(Number(item.quantity || 0) * Number(item.unitPrice || 0))}</p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-lg font-black">
                    <span>Quote Lines Subtotal</span>
                    <span>{formatMoney(builderSubtotal)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-100 shadow-sm">
                <CardHeader>
                  <CardTitle>Quote Details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-[#1D4F6D]" /><span>Valid Until: <b>{quoteValidUntil}</b></span></div>
                  <div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-[#1D4F6D]" /><span>Schedule: <b>{builderInfo.startDate || 'N/A'} - {builderInfo.endDate || 'N/A'}</b></span></div>
                  <div className="flex items-center gap-3"><Mail className="h-5 w-5 text-[#1D4F6D]" /><span>Email: <b>{builderInfo.email || 'N/A'}</b></span></div>
                  <div className="flex items-center gap-3"><FileText className="h-5 w-5 text-[#1D4F6D]" /><span>Total Quote Lines: <b>{builderItems.length}</b></span></div>
                  <div className="flex items-center gap-3"><DollarSign className="h-5 w-5 text-[#1D4F6D]" /><span>Final Total: <b>{formatMoney(builderSubtotal)}</b></span></div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="outline" className="flex-1" onClick={() => setBuilderStep(2)}>Back</Button>
                <Button className="flex-1" onClick={() => setBuilderStep(4)} disabled={builderItems.length === 0}>Next</Button>
              </div>
            </div>
          )}

          {builderStep === 4 && (
            <div className="space-y-6">
              <Card className="border-gray-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-[#1D4F6D]" />
                    Finalize Quote
                  </CardTitle>
                  <CardDescription>Save the estimate first. The saved quote can then be sent as a branded PDF from the quote list.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400">Client</p>
                      <p className="mt-1 font-black text-gray-900">{builderInfo.clientName || 'N/A'}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400">Quote Lines</p>
                      <p className="mt-1 font-black text-gray-900">{builderItems.length}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400">Final Total</p>
                      <p className="mt-1 font-black text-gray-900">{formatMoney(builderSubtotal)}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium text-blue-900">
                    After saving, use the Send action in the Quotes list to email the branded PDF directly to the client.
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button variant="outline" className="flex-1" onClick={() => setBuilderStep(3)}>Back</Button>
                    <Button className="flex-1" onClick={handleGenerateBuilderQuote} disabled={builderItems.length === 0 || isCreatingQuoteEstimate}>
                      Generate Quote and Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#1D4F6D]" />
                Project Selector Flow
              </CardTitle>
              <CardDescription>
                The quotation screen uses these three selectors to narrow the work items before a line is added.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-gray-400">Project Type</p>
                <div className="flex flex-wrap gap-2">
                  {toSelectOptions(selectorOptions.projectTypes).map((option) => (
                    <Badge key={option.value} variant="secondary">{option.label}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-gray-400">Property Type</p>
                <div className="flex flex-wrap gap-2">
                  {toSelectOptions(selectorOptions.propertyTypes).map((option) => (
                    <Badge key={option.value} variant="secondary">{option.label}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-gray-400">Unit Type</p>
                <div className="flex flex-wrap gap-2">
                  {toSelectOptions(selectorOptions.unitTypes).map((option) => (
                    <Badge key={option.value} variant="secondary">{option.label}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-widest text-gray-400">Measurement Types</p>
                <div className="flex flex-wrap gap-2">
                  {toSelectOptions(selectorOptions.measurementTypes).map((option) => (
                    <Badge key={option.value}>{option.label}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListFilter className="h-5 w-5 text-[#1D4F6D]" />
                Workflow Notes
              </CardTitle>
              <CardDescription>
                This page is the admin master-data hub for the quotation module.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-600">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="font-semibold text-gray-900">1. Create or update categories</p>
                <p className="mt-1">Super admins and admins can keep the quotation taxonomy organized from here.</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="font-semibold text-gray-900">2. Add searchable work items</p>
                <p className="mt-1">Each item belongs to one category and one selector combination.</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="font-semibold text-gray-900">3. Disable old data instead of deleting history</p>
                <p className="mt-1">Inactive rows stay available for audit and old quote references.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'quotes' && (
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5 text-[#1D4F6D]" />
                  Quotes
                </CardTitle>
                <CardDescription>Create and manage full quote estimates, then convert accepted quotes to projects.</CardDescription>
              </div>
              <div className="grid gap-3 lg:grid-cols-4">
                <Select
                  value={projectTypeFilter}
                  onChange={(e) => setProjectTypeFilter(e.target.value)}
                  placeholder="Project type"
                  options={[
                    { value: '', label: 'All Project Types' },
                    ...toSelectOptions(selectorOptions.projectTypes),
                  ]}
                />
                <Select
                  value={propertyTypeFilter}
                  onChange={(e) => setPropertyTypeFilter(e.target.value)}
                  placeholder="Property type"
                  options={[
                    { value: '', label: 'All Property Types' },
                    ...toSelectOptions(selectorOptions.propertyTypes),
                  ]}
                />
                <Select
                  value={unitTypeFilter}
                  onChange={(e) => setUnitTypeFilter(e.target.value)}
                  placeholder="Unit type"
                  options={[
                    { value: '', label: 'All Unit Types' },
                    ...toSelectOptions(selectorOptions.unitTypes),
                  ]}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {quoteEstimatesLoading ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1D4F6D] border-t-transparent" />
              </div>
            ) : (
              <Table
                data={quoteEstimates}
                columns={quoteEstimateColumns}
                className="shadow-none border-0"
              />
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'categories' && (
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderTree className="h-5 w-5 text-[#1D4F6D]" />
                  Work Categories
                </CardTitle>
                <CardDescription>Organize quote work items by master category.</CardDescription>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative lg:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Search categories"
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2">
                  <span className="text-xs font-semibold text-gray-500">Show inactive</span>
                  <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoriesLoading ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1D4F6D] border-t-transparent" />
              </div>
            ) : (
              <Table
                data={categories}
                columns={categoryColumns}
                className="shadow-none border-0"
              />
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'measurements' && (
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-[#1D4F6D]" />
                  Measurement Types
                </CardTitle>
                <CardDescription>Manage the quantity/unit measurement options used in quote work items.</CardDescription>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative lg:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={measurementSearch}
                    onChange={(e) => setMeasurementSearch(e.target.value)}
                    placeholder="Search measurement types"
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2">
                  <span className="text-xs font-semibold text-gray-500">Show inactive</span>
                  <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {measurementTypesLoading ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1D4F6D] border-t-transparent" />
              </div>
            ) : (
              <Table
                data={measurementTypes}
                columns={measurementColumns}
                className="shadow-none border-0"
              />
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'items' && (
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-[#1D4F6D]" />
                  Task / Material Items
                </CardTitle>
                <CardDescription>Search the master list or filter by selector combination.</CardDescription>
              </div>
              <div className="grid gap-3 lg:grid-cols-4">
                <div className="relative lg:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Search work items"
                    className="pl-9"
                  />
                </div>
                <Select
                  value={categoryFilterId}
                  onChange={(e) => setCategoryFilterId(e.target.value)}
                  placeholder="All categories"
                  options={[
                    { value: '', label: 'All Categories' },
                    ...categories.map((category) => ({ value: category.id, label: category.name })),
                  ]}
                />
                <Select
                  value={projectTypeFilter}
                  onChange={(e) => setProjectTypeFilter(e.target.value)}
                  placeholder="Project type"
                  options={[
                    { value: '', label: 'All Project Types' },
                    ...toSelectOptions(selectorOptions.projectTypes),
                  ]}
                />
                <Select
                  value={propertyTypeFilter}
                  onChange={(e) => setPropertyTypeFilter(e.target.value)}
                  placeholder="Property type"
                  options={[
                    { value: '', label: 'All Property Types' },
                    ...toSelectOptions(selectorOptions.propertyTypes),
                  ]}
                />
                <Select
                  value={unitTypeFilter}
                  onChange={(e) => setUnitTypeFilter(e.target.value)}
                  placeholder="Unit type"
                  options={[
                    { value: '', label: 'All Unit Types' },
                    ...toSelectOptions(selectorOptions.unitTypes),
                  ]}
                />
                <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 lg:col-span-1">
                  <span className="text-xs font-semibold text-gray-500">Show inactive</span>
                  <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {itemsLoading ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1D4F6D] border-t-transparent" />
              </div>
            ) : (
              <Table
                data={items}
                columns={itemColumns}
                className="shadow-none border-0"
              />
            )}
          </CardContent>
        </Card>
      )}

      <QuoteFormModal
        open={builderItemModalOpen}
        onClose={() => setBuilderItemModalOpen(false)}
        title={editingBuilderItemId ? 'Edit Service' : 'Add Service'}
      >
        <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); handleAddBuilderItem(); }}>
          {!editingBuilderItemId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400">
                  Select Template (Optional)
                </label>
                {selectedTemplateId && (
                  <button
                    type="button"
                    onClick={handleClearTemplateSelection}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <Select
                searchable
                searchPlaceholder="Search saved tasks..."
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                placeholder="-- Select from saved templates (Optional) --"
                options={[
                  { value: '', label: '-- Custom Service (Type Manually) --' },
                  ...taskSuggestions.map((suggestion) => ({
                    value: suggestion.id,
                    label: `${suggestion.title}${
                      Number(suggestion.unitPrice) > 0 || Number(suggestion.estimatedHours) > 0
                        ? ` (${Number(suggestion.unitPrice) > 0 ? `$${Number(suggestion.unitPrice).toFixed(2)}` : ''}${
                            Number(suggestion.unitPrice) > 0 && Number(suggestion.estimatedHours) > 0 ? ' • ' : ''
                          }${Number(suggestion.estimatedHours) > 0 ? `${suggestion.estimatedHours} hrs` : ''})`
                        : ''
                    }`,
                  })),
                ]}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Task Title</label>
            <Input
              value={builderItemDraft.title}
              onChange={(e) => {
                setSelectedTemplateId('');
                setBuilderItemDraft((draft) => ({ ...draft, title: e.target.value }));
              }}
              placeholder="e.g. Install Kitchen Cabinets"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Description</label>
            <Textarea
              value={builderItemDraft.description}
              onChange={(e) => setBuilderItemDraft((draft) => ({ ...draft, description: e.target.value }))}
              placeholder="Task details..."
              rows={2}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Hours / Unit</label>
              <Input type="number" min="0" step="0.5" value={builderItemDraft.estimatedHours} onChange={(e) => setBuilderItemDraft((draft) => ({ ...draft, estimatedHours: e.target.value }))} placeholder="e.g. 4" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Internal Price</label>
              <Input type="number" min="0" step="0.01" value={builderItemDraft.unitPrice} onChange={(e) => setBuilderItemDraft((draft) => ({ ...draft, unitPrice: e.target.value }))} placeholder="e.g. 150" />
            </div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-gray-400">
              <span>Subtotal</span>
              <span className="text-base font-black text-gray-900">
                ${(Number(builderItemDraft.unitPrice || 0) * (builderItemDraft.plannedLocationKeysText.split(',').map((value) => value.trim()).filter(Boolean).length || Number(builderItemDraft.quantity || 1))).toFixed(2)}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Per selected floor/unit: ${Number(builderItemDraft.unitPrice || 0).toFixed(2)} x {builderItemDraft.plannedLocationKeysText.split(',').map((value) => value.trim()).filter(Boolean).length || Number(builderItemDraft.quantity || 1)}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={builderItemDraft.allowSubtasks} onChange={(e) => setBuilderItemDraft((draft) => ({ ...draft, allowSubtasks: e.target.checked }))} />
            Allow Subtasks
          </label>
          <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Floors / Sections</label>
              <button type="button" className="text-xs font-bold text-blue-600" onClick={() => setBuilderItemDraft((draft) => {
                const allKeys = plannedFloorNumbers.flatMap((floor) => getPlannedUnitNames(floor).map((unit) => `floor_${floor}_unit_${unit}`));
                const selectedKeys = draft.plannedLocationKeysText.split(',').map((key) => key.trim()).filter(Boolean);
                const allSelected = plannedFloorNumbers.every((floor) => draft.selectedFloorNumbersText.split(',').map((value) => Number(value.trim())).includes(floor)) && allKeys.every((key) => selectedKeys.includes(key));
                return allSelected
                  ? { ...draft, locationMode: 'selected', selectedFloorNumbersText: '', plannedLocationKeysText: '' }
                  : { ...draft, locationMode: 'selected', selectedFloorNumbersText: plannedFloorNumbers.join(', '), plannedLocationKeysText: allKeys.join(', ') };
              })}>{plannedFloorNumbers.length > 0 && plannedFloorNumbers.every((floor) => builderItemDraft.selectedFloorNumbersText.split(',').map((value) => Number(value.trim())).includes(floor)) && plannedFloorNumbers.flatMap((floor) => getPlannedUnitNames(floor).map((unit) => `floor_${floor}_unit_${unit}`)).every((key) => builderItemDraft.plannedLocationKeysText.split(',').map((value) => value.trim()).includes(key)) ? 'Deselect All' : 'Select All'}</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {plannedFloorNumbers.map((floor) => {
                const selected = builderItemDraft.selectedFloorNumbersText.split(',').map((value) => Number(value.trim())).includes(floor);
                return <button key={floor} type="button" className={cn('rounded-full border px-3 py-1 text-xs font-semibold', selected ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600')} onClick={() => setBuilderItemDraft((draft) => {
                  const nextFloors = draft.selectedFloorNumbersText.split(',').map((value) => Number(value.trim())).filter(Boolean);
                  const nextKeys = draft.plannedLocationKeysText.split(',').map((value) => value.trim()).filter(Boolean);
                  const floorKeys = getPlannedUnitNames(floor).map((unit) => `floor_${floor}_unit_${unit}`);
                  return selected
                    ? { ...draft, locationMode: 'selected', selectedFloorNumbersText: nextFloors.filter((value) => value !== floor).join(', '), plannedLocationKeysText: nextKeys.filter((key) => !floorKeys.includes(key)).join(', ') }
                    : { ...draft, locationMode: 'selected', selectedFloorNumbersText: [...nextFloors, floor].join(', '), plannedLocationKeysText: [...new Set([...nextKeys, ...floorKeys])].join(', ') };
                })}>Floor {floor}</button>;
              })}
            </div>
            {builderItemDraft.selectedFloorNumbersText.split(',').map((value) => Number(value.trim())).filter(Boolean).map((floor) => (
              <div key={floor} className="space-y-2 border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">Floor {floor} Units / Rooms</label>
                  <button type="button" className="text-xs font-bold text-blue-600" onClick={() => setBuilderItemDraft((draft) => {
                    const floorKeys = getPlannedUnitNames(floor).map((unit) => `floor_${floor}_unit_${unit}`);
                    const selectedKeys = draft.plannedLocationKeysText.split(',').map((key) => key.trim()).filter(Boolean);
                    const allSelected = floorKeys.every((key) => selectedKeys.includes(key));
                    return {
                      ...draft,
                      locationMode: 'selected',
                      plannedLocationKeysText: allSelected
                        ? selectedKeys.filter((key) => !floorKeys.includes(key)).join(', ')
                        : [...new Set([...selectedKeys, ...floorKeys])].join(', '),
                    };
                  })}>{getPlannedUnitNames(floor).length > 0 && getPlannedUnitNames(floor).every((unit) => builderItemDraft.plannedLocationKeysText.split(',').map((key) => key.trim()).includes(`floor_${floor}_unit_${unit}`)) ? 'Deselect All' : 'Select All'}</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getPlannedUnitNames(floor).map((unit) => {
                    const key = `floor_${floor}_unit_${unit}`;
                    const selected = builderItemDraft.plannedLocationKeysText.split(',').map((value) => value.trim()).includes(key);
                    return <button key={key} type="button" className={cn('rounded-full border px-3 py-1 text-xs font-semibold', selected ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600')} onClick={() => setBuilderItemDraft((draft) => ({ ...draft, locationMode: 'selected', plannedLocationKeysText: selected ? draft.plannedLocationKeysText.split(',').map((value) => value.trim()).filter((value) => value !== key).join(', ') : [...draft.plannedLocationKeysText.split(',').map((value) => value.trim()).filter(Boolean), key].join(', ') }))}>{unit}</button>;
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setBuilderItemModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!builderItemDraft.title.trim()}>
              {editingBuilderItemId ? 'Save Changes' : 'Add Service'}
            </Button>
          </div>
        </form>
      </QuoteFormModal>

      <QuoteFormModal
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        title={editingQuote ? 'Edit Quote' : 'New Quote'}
      >
        <form className="space-y-5" onSubmit={handleQuoteSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Use Library Item</label>
            <Select
              value={quoteDraft.workItemId}
              onChange={(e) => applyQuoteWorkItem(e.target.value)}
              placeholder="Custom quote or select work item"
              options={[
                { value: '', label: 'Custom Quote' },
                ...items.map((item) => ({
                  value: item.id,
                  label: `${item.name} - ${formatMoney(item.unitCost ?? null)}`,
                })),
              ]}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Select
              value={quoteDraft.projectType}
              onChange={(e) => setQuoteDraft((draft) => ({ ...draft, projectType: e.target.value }))}
              placeholder="Project type"
              options={toSelectOptions(selectorOptions.projectTypes)}
            />
            <Select
              value={quoteDraft.propertyType}
              onChange={(e) => setQuoteDraft((draft) => ({ ...draft, propertyType: e.target.value }))}
              placeholder="Property type"
              options={toSelectOptions(selectorOptions.propertyTypes)}
            />
            <Select
              value={quoteDraft.unitType}
              onChange={(e) => setQuoteDraft((draft) => ({ ...draft, unitType: e.target.value }))}
              placeholder="Unit type"
              options={toSelectOptions(selectorOptions.unitTypes)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Quote Title</label>
            <Input
              value={quoteDraft.title}
              onChange={(e) => setQuoteDraft((draft) => ({ ...draft, title: e.target.value }))}
              placeholder="Interior Painting"
              autoFocus
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Quantity</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={quoteDraft.quantity}
                onChange={(e) => setQuoteDraft((draft) => ({ ...draft, quantity: e.target.value }))}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Unit</label>
              <Input
                value={quoteDraft.unit}
                onChange={(e) => setQuoteDraft((draft) => ({ ...draft, unit: e.target.value }))}
                placeholder="room"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Unit Price</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={quoteDraft.unitPrice}
                onChange={(e) => setQuoteDraft((draft) => ({ ...draft, unitPrice: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Subtotal</p>
            <p className="mt-1 text-xl font-black text-gray-900">
              {formatMoney(Number(quoteDraft.quantity || 0) * Number(quoteDraft.unitPrice || 0))}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Notes</label>
            <Textarea
              value={quoteDraft.notes}
              onChange={(e) => setQuoteDraft((draft) => ({ ...draft, notes: e.target.value }))}
              placeholder="Optional quote notes"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setQuoteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreatingQuote || isUpdatingQuote}>
              {editingQuote ? 'Save Changes' : 'Create Quote'}
            </Button>
          </div>
        </form>
      </QuoteFormModal>

      <QuoteFormModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'New Category'}
      >
        <form className="space-y-5" onSubmit={handleCategorySubmit}>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Category Name</label>
            <Input
              value={categoryDraft.name}
              onChange={(e) => setCategoryDraft((draft) => ({ ...draft, name: e.target.value }))}
              placeholder="Painting"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Description</label>
            <Textarea
              value={categoryDraft.description}
              onChange={(e) => setCategoryDraft((draft) => ({ ...draft, description: e.target.value }))}
              placeholder="Short note about this category"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Sort Order</label>
              <Input
                type="number"
                value={categoryDraft.sortOrder}
                onChange={(e) => setCategoryDraft((draft) => ({ ...draft, sortOrder: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Active</p>
                <p className="text-xs text-gray-500">Inactive categories stay hidden by default.</p>
              </div>
              <Switch
                checked={categoryDraft.isActive}
                onCheckedChange={(checked) => setCategoryDraft((draft) => ({ ...draft, isActive: checked }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreatingCategory || isUpdatingCategory}>
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </QuoteFormModal>

      <QuoteFormModal
        open={measurementModalOpen}
        onClose={() => setMeasurementModalOpen(false)}
        title={editingMeasurement ? 'Edit Measurement Type' : 'New Measurement Type'}
      >
        <form className="space-y-5" onSubmit={handleMeasurementSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Value</label>
              <Input
                value={measurementDraft.value}
                onChange={(e) => setMeasurementDraft((draft) => ({ ...draft, value: e.target.value }))}
                placeholder="sqft"
                autoFocus
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Label</label>
              <Input
                value={measurementDraft.label}
                onChange={(e) => setMeasurementDraft((draft) => ({ ...draft, label: e.target.value }))}
                placeholder="Sq Ft"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Sort Order</label>
              <Input
                type="number"
                value={measurementDraft.sortOrder}
                onChange={(e) => setMeasurementDraft((draft) => ({ ...draft, sortOrder: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Active</p>
                <p className="text-xs text-gray-500">Inactive measurement types stay available for history.</p>
              </div>
              <Switch
                checked={measurementDraft.isActive}
                onCheckedChange={(checked) => setMeasurementDraft((draft) => ({ ...draft, isActive: checked }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setMeasurementModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreatingMeasurementType || isUpdatingMeasurementType}>
              {editingMeasurement ? 'Save Changes' : 'Create Measurement'}
            </Button>
          </div>
        </form>
      </QuoteFormModal>

      <QuoteFormModal
        open={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={editingItem ? 'Edit Work Item' : 'New Work Item'}
      >
        <form className="space-y-5" onSubmit={handleItemSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              value={itemDraft.categoryId}
              onChange={(e) => setItemDraft((draft) => ({ ...draft, categoryId: e.target.value }))}
              placeholder="Select category"
              options={categories.map((category) => ({ value: category.id, label: category.name }))}
            />
            <Select
              value={itemDraft.projectType}
              onChange={(e) => setItemDraft((draft) => ({ ...draft, projectType: e.target.value }))}
              placeholder="Project type"
              options={toSelectOptions(selectorOptions.projectTypes)}
            />
            <Select
              value={itemDraft.propertyType}
              onChange={(e) => setItemDraft((draft) => ({ ...draft, propertyType: e.target.value }))}
              placeholder="Property type"
              options={toSelectOptions(selectorOptions.propertyTypes)}
            />
            <Select
              value={itemDraft.unitType}
              onChange={(e) => setItemDraft((draft) => ({ ...draft, unitType: e.target.value }))}
              placeholder="Unit type"
              options={toSelectOptions(selectorOptions.unitTypes)}
            />
            <Select
              value={itemDraft.measurementType}
              onChange={(e) => setItemDraft((draft) => ({ ...draft, measurementType: e.target.value }))}
              placeholder="Measurement type"
              options={toSelectOptions(selectorOptions.measurementTypes)}
            />
            <Input
              value={itemDraft.name}
              onChange={(e) => setItemDraft((draft) => ({ ...draft, name: e.target.value }))}
              placeholder="Interior Painting"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Unit Cost</label>
              <Input
                type="number"
                step="0.01"
                value={itemDraft.unitCost}
                onChange={(e) => setItemDraft((draft) => ({ ...draft, unitCost: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Sort Order</label>
              <Input
                type="number"
                value={itemDraft.sortOrder}
                onChange={(e) => setItemDraft((draft) => ({ ...draft, sortOrder: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Active</p>
                <p className="text-xs text-gray-500">Inactive items are hidden in search.</p>
              </div>
              <Switch
                checked={itemDraft.isActive}
                onCheckedChange={(checked) => setItemDraft((draft) => ({ ...draft, isActive: checked }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setItemModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreatingItem || isUpdatingItem}>
              {editingItem ? 'Save Changes' : 'Create Work Item'}
            </Button>
          </div>
        </form>
      </QuoteFormModal>
    </div>
  );
}
