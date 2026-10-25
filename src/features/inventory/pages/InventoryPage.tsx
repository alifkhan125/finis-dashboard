import { useMemo, useState } from 'react';
import { AlertTriangle, Search, Plus, Download, Filter, TrendingDown, Box } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Tabs } from '@/shared/components/ui/Tabs';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { InventoryTable } from '@/features/inventory/components/InventoryTable';
import { DamageLogView } from '@/features/inventory/components/DamageLogView';
import { UsageLogTable } from '@/features/inventory/components/UsageLogTable';
import { AddProductModal } from '@/features/inventory/components/AddProductModal';
import { LogUsageModal, ReportDamageModal, RestockModal, EditProductModal } from '@/features/inventory/components/ActionModals';
import {
    useCreateDamageMutation,
    useCreateItemMutation,
    useDeleteItemMutation,
    useGetDamageReportsQuery,
    useGetInventoryDetailsQuery,
    useGetInventoryItemsQuery,
    useGetProjectsQuery,
    useGetSummaryQuery,
    useGetUsageHistoryQuery,
    useUpdateDamageStatusMutation,
    useUpdateItemMutation,
    useUpdateStockMutation,
    type DamageResponse,
    type InventoryItemResponse,
    type UsageLogResponse,
} from '@/store/inventoryApi';
import { InventoryItem, InventoryLog, DamageReport } from '@/shared/types/entities';
import { selectAuthUser } from '@/store/authSlice';
import { useAppSelector } from '@/store/hooks';

type InventoryRow = InventoryItem & { projectId: string; currentQty: number; minStockQty: number };

const asArray = <T,>(value: unknown): T[] => {
    if (Array.isArray(value)) return value as T[];
    if (value && typeof value === 'object') {
        const nested = (value as any).projects
            ?? (value as any).data?.projects
            ?? (value as any).data
            ?? (value as any).items
            ?? (value as any).records;
        if (Array.isArray(nested)) return nested as T[];
    }
    return [];
};

const mapStatus = (status: InventoryItemResponse['stockStatus']): InventoryItem['status'] => {
    switch (status) {
        case 'OUT_OF_STOCK':
            return 'out_of_stock';
        case 'CRITICAL':
        case 'LOW_STOCK':
            return 'low_stock';
        default:
            return 'in_stock';
    }
};

const mapInventoryItem = (item: InventoryItemResponse): InventoryRow => ({
    id: item.id,
    name: item.name,
    unitType: item.unit ?? 'Unit',
    quantity: item.currentQty,
    reorderThreshold: item.minStockQty,
    status: mapStatus(item.stockStatus),
    category: item.category ?? undefined,
    lastUpdated: item.updatedAt,
    projectId: item.project?.id || (item as any).projectId || '',
    currentQty: item.currentQty,
    minStockQty: item.minStockQty,
});

const mapUsageLog = (log: UsageLogResponse): InventoryLog => ({
    id: log.id,
    itemId: log.inventoryId,
    itemName: log.inventory?.name ?? 'Unknown',
    quantityMoved: log.qtyChange,
    type: log.qtyChange < 0 ? 'usage' : 'restock',
    projectId: log.projectId ?? log.inventory?.project?.id ?? '',
    projectName: log.inventory?.project?.name ?? 'Unknown',
    taskName: undefined,
    handledBy: log.userId,
    handledByName: log.user?.fullName ?? 'Unknown',
    timestamp: log.loggedAt,
    notes: log.reason ?? undefined,
});

const mapDamageReport = (report: DamageResponse): DamageReport => ({
    id: report.id,
    itemId: report.inventoryId,
    itemName: report.inventory?.name ?? 'Unknown',
    quantity: report.qtyDamaged,
    photoUrl: report.photoUrl ?? undefined,
    notes: report.description ?? '',
    reportedBy: report.reportedBy,
    reportedByName: 'Current User',
    accountability: 'Unknown',
    projectId: report.inventory?.project?.id ?? '',
    projectName: report.inventory?.project?.name ?? 'Unknown',
    timestamp: report.reportedAt,
    status: report.status === 'resolved' ? 'resolved' : 'pending',
});

export function InventoryPage() {
    const authUser = useAppSelector(selectAuthUser);
    const [activeTab, setActiveTab] = useState('stock');
    const [searchQuery, setSearchQuery] = useState('');
    const [projectId, setProjectId] = useState('');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
    const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
    const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryRow | null>(null);

    const isSuperAdmin = authUser?.role === 'super_admin';
    const detailsQuery = {
        projectId: projectId || undefined,
        search: searchQuery || undefined,
        page: 1,
        limit: 100,
    };

    const { data: detailsData } = useGetInventoryDetailsQuery(detailsQuery, {
        skip: !isSuperAdmin,
    });

    const { data: projects = [] } = useGetProjectsQuery(undefined, {
        skip: isSuperAdmin,
    });
    const { data: summary } = useGetSummaryQuery(projectId ? { projectId } : undefined, {
        skip: isSuperAdmin,
    });
    const { data: inventoryData } = useGetInventoryItemsQuery(detailsQuery, {
        skip: isSuperAdmin,
    });
    const { data: usageData } = useGetUsageHistoryQuery({
        projectId: projectId || undefined,
        page: 1,
        limit: 100,
    }, {
        skip: isSuperAdmin,
    });
    const { data: damageData } = useGetDamageReportsQuery({
        projectId: projectId || undefined,
        page: 1,
        limit: 100,
    }, {
        skip: isSuperAdmin,
    });

    const [createItem] = useCreateItemMutation();
    const [updateItem] = useUpdateItemMutation();
    const [updateStock] = useUpdateStockMutation();
    const [deleteItem] = useDeleteItemMutation();
    const [createDamage] = useCreateDamageMutation();
    const [updateDamageStatus] = useUpdateDamageStatusMutation();

    const items = useMemo(
        () => asArray<InventoryItemResponse>(
            isSuperAdmin
                ? (detailsData?.inventory?.data ?? detailsData?.inventory)
                : ((inventoryData as any)?.data ?? inventoryData)
        ).map(mapInventoryItem),
        [detailsData, inventoryData, isSuperAdmin],
    );
    const logs = useMemo(
        () => asArray<UsageLogResponse>(
            isSuperAdmin
                ? (detailsData?.usageHistory?.data ?? detailsData?.usageHistory)
                : ((usageData as any)?.data ?? usageData)
        ).map(mapUsageLog),
        [detailsData, usageData, isSuperAdmin],
    );
    const reports = useMemo(
        () => asArray<DamageResponse>(
            isSuperAdmin
                ? (detailsData?.damages?.data ?? detailsData?.damages)
                : ((damageData as any)?.data ?? damageData)
        ).map(mapDamageReport),
        [detailsData, damageData, isSuperAdmin],
    );
    const summaryData = isSuperAdmin ? detailsData?.summary : summary;
    const projectsData = asArray<{ id: string; name: string }>(isSuperAdmin ? detailsData?.projects : projects);

    const handleAddProduct = async (newItem: { name: string; category?: string; location?: string; currentQty?: number; minStockQty?: number; unit?: string }) => {
        await createItem(newItem).unwrap();
        setIsAddModalOpen(false);
    };

    const handleRestock = async (restock: { itemId: string; quantity: number; notes?: string }) => {
        if (!selectedItem) return;
        await updateStock({
            projectId: selectedItem.projectId,
            id: selectedItem.id,
            body: {
                quantity: Math.abs(restock.quantity),
                reason: restock.notes,
            },
        }).unwrap();
        setIsRestockModalOpen(false);
    };

    const handleEditProduct = async (updated: {
        id: string;
        name: string;
        category?: string;
        currentQty: number;
        minStockQty: number;
        unit?: string;
    }) => {
        if (!selectedItem) return;
        await updateItem({
            projectId: selectedItem.projectId,
            id: selectedItem.id,
            body: {
                name: updated.name,
                category: updated.category,
                currentQty: updated.currentQty,
                minStockQty: updated.minStockQty,
                unit: updated.unit,
            },
        }).unwrap();
        setIsEditModalOpen(false);
    };

    const handleDeleteProduct = async (item: InventoryItem) => {
        const row = items.find((i) => i.id === item.id) ?? (item as InventoryRow);
        if (!row.projectId) return;
        if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
            await deleteItem({
                projectId: row.projectId,
                id: item.id,
            }).unwrap();
        }
    };

    const handleLogUsage = async (usage: { itemId: string; quantity: number; projectId?: string; taskName?: string; notes?: string }) => {
        if (!selectedItem) return;
        await updateStock({
            projectId: selectedItem.projectId,
            id: selectedItem.id,
            body: {
                quantity: -Math.abs(usage.quantity),
                reason: usage.notes,
            },
        }).unwrap();
        setIsUsageModalOpen(false);
    };

    const handleReportDamage = async (damage: { itemId: string; quantity: number; notes: string; accountability: string }) => {
        await createDamage({
            inventoryId: damage.itemId,
            qtyDamaged: damage.quantity,
            description: `${damage.accountability}: ${damage.notes}`,
        }).unwrap();
        setIsDamageModalOpen(false);
    };

    const handleResolveDamage = async (id: string) => {
        await updateDamageStatus({
            damageId: id,
            body: { status: 'resolved' },
        }).unwrap();
    };

    const handleExport = () => {
        const headers = ['ID', 'Name', 'Category', 'Quantity', 'Unit', 'Threshold', 'Status'];
        const rows = items.map((i) => [i.id, i.name, i.category || '', i.quantity, i.unitType, i.reorderThreshold, i.status]);
        const csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const tabs = [
        { id: 'stock', label: 'Stock List' },
        { id: 'usage', label: 'Usage History' },
        { id: 'damages', label: 'Damages & Defects', count: reports.filter((r) => r.status === 'pending').length, alert: true },
    ];

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Inventory Management</h1>
                    <p className="text-gray-500 mt-1 font-medium">Track stock levels, usage, and damages across all projects.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="gap-2 font-bold border-gray-200" onClick={handleExport}>
                        <Download className="h-4 w-4" /> Export Report
                    </Button>
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-200" onClick={() => setIsAddModalOpen(true)}>
                        <Plus className="h-4 w-4" /> Add Product
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-sm bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-bold uppercase tracking-wider">Total Products</p>
                        <h3 className="text-3xl font-black mt-1">{summaryData?.totalProducts ?? 0}</h3>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                                <Box className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white border border-gray-100">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Low Stock Alerts</p>
                                <h3 className="text-3xl font-black mt-1 text-orange-500">{summaryData?.lowStockAlerts ?? 0}</h3>
                            </div>
                            <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-orange-50">
                                <AlertTriangle className="h-6 w-6 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white border border-gray-100">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Unresolved Damages</p>
                                <h3 className="text-3xl font-black mt-1 text-red-600">{summaryData?.unresolvedDamages ?? 0}</h3>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center">
                                <TrendingDown className="h-6 w-6 text-red-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
                    <div className="flex items-center gap-3">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search inventory"
                                className="pl-10 bg-white border-gray-200 focus:border-blue-400 transition-all rounded-xl"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <select
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-400"
                        >
                            <option value="">All Projects</option>
                            {projectsData.map((project) => (
                                <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                        </select>
                        <Button variant="outline" size="icon" className="rounded-xl border-gray-200">
                            <Filter className="h-4 w-4 text-gray-500" />
                        </Button>
                    </div>
                </div>

                <div className="p-0">
                    {activeTab === 'stock' && (
                        <InventoryTable
                            items={items}
                            searchQuery={searchQuery}
                            onRestock={(item) => {
                                const row = items.find((i) => i.id === item.id) ?? (item as InventoryRow);
                                setSelectedItem(row);
                                setIsRestockModalOpen(true);
                            }}
                            onEdit={(item) => {
                                const row = items.find((i) => i.id === item.id) ?? (item as InventoryRow);
                                setSelectedItem(row);
                                setIsEditModalOpen(true);
                            }}
                            onDelete={handleDeleteProduct}
                            onLogUsage={(item) => {
                                const row = items.find((i) => i.id === item.id) ?? (item as InventoryRow);
                                setSelectedItem(row);
                                setIsUsageModalOpen(true);
                            }}
                            onReportDamage={(item) => {
                                const row = items.find((i) => i.id === item.id) ?? (item as InventoryRow);
                                setSelectedItem(row);
                                setIsDamageModalOpen(true);
                            }}
                        />
                    )}
                    {activeTab === 'usage' && <UsageLogTable logs={logs} searchQuery={searchQuery} />}
                    {activeTab === 'damages' && (
                        <DamageLogView
                            reports={reports.filter(
                                (r) =>
                                    r.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    (r.projectName && r.projectName.toLowerCase().includes(searchQuery.toLowerCase())),
                            )}
                            onResolve={handleResolveDamage}
                        />
                    )}
                </div>
            </div>

            <AddProductModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddProduct}
            />

            {selectedItem && (
                <>
                    <RestockModal
                        isOpen={isRestockModalOpen}
                        onClose={() => setIsRestockModalOpen(false)}
                        item={selectedItem}
                        onRestock={handleRestock}
                    />
                    <EditProductModal
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        item={selectedItem}
                        onUpdate={handleEditProduct}
                    />
                    <LogUsageModal
                        isOpen={isUsageModalOpen}
                        onClose={() => setIsUsageModalOpen(false)}
                        item={selectedItem}
                        onLog={handleLogUsage}
                    />
                    <ReportDamageModal
                        isOpen={isDamageModalOpen}
                        onClose={() => setIsDamageModalOpen(false)}
                        item={selectedItem}
                        onReport={handleReportDamage}
                    />
                </>
            )}
        </div>
    );
}
