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
  QuoteMeasurementType,
  QuoteRecord,
  QuoteWorkCategory,
  QuoteWorkItem,
  useCreateQuoteMutation,
  useCreateQuoteMeasurementTypeMutation,
  useCreateQuoteWorkCategoryMutation,
  useCreateQuoteWorkItemMutation,
  useDeleteQuoteMutation,
  useDisableQuoteWorkCategoryMutation,
  useDisableQuoteMeasurementTypeMutation,
  useDisableQuoteWorkItemMutation,
  useGetQuotesQuery,
  useGetQuoteSelectorsQuery,
  useGetQuoteMeasurementTypesQuery,
  useGetQuoteWorkCategoriesQuery,
  useGetQuoteWorkItemsQuery,
  useUpdateQuoteMutation,
  useUpdateQuoteWorkCategoryMutation,
  useUpdateQuoteMeasurementTypeMutation,
  useUpdateQuoteWorkItemMutation,
} from '@/store/quotesApi';

type TabId = 'builder' | 'overview' | 'quotes' | 'categories' | 'measurements' | 'items';

type BuilderStep = 1 | 2 | 3;

interface BuilderInfo {
  clientName: string;
  projectAddress: string;
  phoneNumber: string;
  email: string;
  estimatedTime: string;
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
}

const EMPTY_BUILDER_INFO: BuilderInfo = {
  clientName: '',
  projectAddress: '',
  phoneNumber: '',
  email: '',
  estimatedTime: '',
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
};

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
  const [builderItemDraft, setBuilderItemDraft] = useState<BuilderItemDraft>(EMPTY_BUILDER_ITEM_DRAFT);
  const [builderItemModalOpen, setBuilderItemModalOpen] = useState(false);
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

  const [createQuote, { isLoading: isCreatingQuote }] = useCreateQuoteMutation();
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
    { label: 'Quotes', value: quoteList?.total ?? quotes.length, hint: 'Saved records', icon: Archive },
    { label: 'Work Categories', value: categories.length, hint: `${activeCategories} active`, icon: FolderTree },
    { label: 'Work Items', value: items.length, hint: `${activeItems} active`, icon: Boxes },
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

  const openBuilderItemModal = () => {
    setBuilderItemDraft(EMPTY_BUILDER_ITEM_DRAFT);
    setBuilderItemModalOpen(true);
  };

  const handleAddBuilderItem = () => {
    if (!builderItemDraft.title.trim()) return;
    const item: BuilderItem = {
      id: builderItemDraft.workItemId || `custom-${Date.now()}`,
      workItemId: builderItemDraft.workItemId || undefined,
      title: builderItemDraft.title.trim(),
      quantity: builderItemDraft.quantity || '1',
      unit: builderItemDraft.unit.trim() || 'each',
      unitPrice: builderItemDraft.unitPrice || '0',
      categoryName: builderItemDraft.categoryName || 'Custom Items',
    };
    setBuilderItems((current) => [...current, item]);
    setBuilderItemDraft(EMPTY_BUILDER_ITEM_DRAFT);
    setBuilderItemModalOpen(false);
  };

  const handleGenerateBuilderQuote = async () => {
    if (!builderInfo.clientName.trim() || !builderInfo.projectAddress.trim() || builderItems.length === 0) return;

    await Promise.all(
      builderItems.map((item) =>
        createQuote({
          workItemId: item.workItemId,
          projectType: builderInfo.projectType,
          propertyType: builderInfo.propertyType,
          unitType: builderInfo.unitType,
          title: item.title,
          quantity: Number(item.quantity || 1),
          unit: item.unit,
          unitPrice: Number(item.unitPrice || 0),
          notes: [
            `Client: ${builderInfo.clientName}`,
            `Address: ${builderInfo.projectAddress}`,
            builderInfo.phoneNumber ? `Phone: ${builderInfo.phoneNumber}` : '',
            builderInfo.email ? `Email: ${builderInfo.email}` : '',
            builderInfo.estimatedTime ? `Time: ${builderInfo.estimatedTime}` : '',
          ].filter(Boolean).join('\n'),
          isCustom: !item.workItemId,
        }).unwrap(),
      ),
    );

    window.print();
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

  return (
    <div className="space-y-6 pb-12">
      <SEO title="Quote Library" description="Manage quotation work categories, work items, and selector options." />

      <PageHeader
        title="Quote Library"
        description="Manage categories and master work items for the quotation module."
        icon={Archive}
      >
        <Button onClick={openCreateQuote}>
          <Plus className="mr-2 h-4 w-4" />
          New Quote
        </Button>
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
          { id: 'quotes', label: 'Quotes', count: quoteList?.total ?? quotes.length },
          { id: 'categories', label: 'Categories', count: categories.length },
          { id: 'measurements', label: 'Measurements', count: measurementTypes.length },
          { id: 'items', label: 'Work Items', count: items.length },
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
                  <p className="mt-1 text-sm font-medium text-gray-500">Create the full client quote from the dashboard.</p>
                </div>
                <div className="flex items-center gap-3">
                  {[1, 2, 3].map((stepNumber) => (
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
                  <Input value={builderInfo.clientName} onChange={(e) => setBuilderField('clientName', e.target.value)} placeholder="Client Name *" />
                  <Input value={builderInfo.projectAddress} onChange={(e) => setBuilderField('projectAddress', e.target.value)} placeholder="Project Address *" />
                  <Input value={builderInfo.phoneNumber} onChange={(e) => setBuilderField('phoneNumber', e.target.value)} placeholder="Phone Number" />
                  <Input value={builderInfo.email} onChange={(e) => setBuilderField('email', e.target.value)} placeholder="Email" />
                  <Input value={builderInfo.estimatedTime} onChange={(e) => setBuilderField('estimatedTime', e.target.value)} placeholder="Time Hours / Estimated Timeline" />
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
                  <Select
                    value={builderInfo.projectType}
                    onChange={(e) => setBuilderField('projectType', e.target.value)}
                    placeholder="Project type"
                    options={toSelectOptions(selectorOptions.projectTypes)}
                  />
                  <Select
                    value={builderInfo.propertyType}
                    onChange={(e) => setBuilderField('propertyType', e.target.value)}
                    placeholder="Property type"
                    options={toSelectOptions(selectorOptions.propertyTypes)}
                  />
                  <Select
                    value={builderInfo.unitType}
                    onChange={(e) => setBuilderField('unitType', e.target.value)}
                    placeholder="Unit type"
                    options={toSelectOptions(selectorOptions.unitTypes)}
                  />
                  <Button
                    className="w-full"
                    onClick={() => setBuilderStep(2)}
                    disabled={!builderInfo.clientName.trim() || !builderInfo.projectAddress.trim()}
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
                        Select Services
                      </CardTitle>
                      <CardDescription>Add library services or custom quote items.</CardDescription>
                    </div>
                    <Button onClick={openBuilderItemModal}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Custom Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {builderItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm font-medium text-gray-500">
                      No quote items added yet.
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
                                  onClick={() => setBuilderItems((current) => current.filter((currentItem) => currentItem.id !== item.id))}
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
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Items Selected</p>
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
                </CardContent>
              </Card>

              <Card className="border-gray-100 shadow-sm">
                <CardHeader>
                  <CardTitle>Selected Work Items</CardTitle>
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
                    <span>Work Items Subtotal</span>
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
                  <div className="flex items-center gap-3"><Mail className="h-5 w-5 text-[#1D4F6D]" /><span>Email: <b>{builderInfo.email || 'N/A'}</b></span></div>
                  <div className="flex items-center gap-3"><FileText className="h-5 w-5 text-[#1D4F6D]" /><span>Total Work Items: <b>{builderItems.length}</b></span></div>
                  <div className="flex items-center gap-3"><DollarSign className="h-5 w-5 text-[#1D4F6D]" /><span>Final Total: <b>{formatMoney(builderSubtotal)}</b></span></div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="outline" className="flex-1" onClick={() => setBuilderStep(2)}>Back</Button>
                <Button className="flex-1" onClick={handleGenerateBuilderQuote} disabled={builderItems.length === 0 || isCreatingQuote}>
                  Generate Quote and Save
                </Button>
              </div>
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
                <CardDescription>Create and manage saved quote records from library or custom pricing.</CardDescription>
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
                <Button onClick={openCreateQuote}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Quote
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {quotesLoading ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1D4F6D] border-t-transparent" />
              </div>
            ) : (
              <Table
                data={quotes}
                columns={quoteColumns}
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
                  Work Items
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
        title="Add Quote Item"
      >
        <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); handleAddBuilderItem(); }}>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Library Service</label>
            <Select
              value={builderItemDraft.workItemId}
              onChange={(e) => applyBuilderWorkItem(e.target.value)}
              placeholder="Select service or create custom"
              options={[
                { value: '', label: 'Custom Item' },
                ...items.map((item) => ({
                  value: item.id,
                  label: `${item.name} - ${formatMoney(item.unitCost ?? null)}`,
                })),
              ]}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Service Name</label>
            <Input
              value={builderItemDraft.title}
              onChange={(e) => setBuilderItemDraft((draft) => ({ ...draft, title: e.target.value }))}
              placeholder="Service"
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
                value={builderItemDraft.quantity}
                onChange={(e) => setBuilderItemDraft((draft) => ({ ...draft, quantity: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Unit</label>
              <Input
                value={builderItemDraft.unit}
                onChange={(e) => setBuilderItemDraft((draft) => ({ ...draft, unit: e.target.value }))}
                placeholder="kg / room / sqft"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Unit Price</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={builderItemDraft.unitPrice}
                onChange={(e) => setBuilderItemDraft((draft) => ({ ...draft, unitPrice: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Subtotal</p>
            <p className="mt-1 text-xl font-black text-gray-900">
              {formatMoney(Number(builderItemDraft.quantity || 0) * Number(builderItemDraft.unitPrice || 0))}
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setBuilderItemModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!builderItemDraft.title.trim()}>
              Add Item
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
