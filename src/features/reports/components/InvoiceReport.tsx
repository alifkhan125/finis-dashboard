import { Card } from '@/shared/components/ui/Card';
import { Table, Column } from '@/shared/components/ui/Table';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Download } from 'lucide-react';
import { formatStatus } from '@/shared/utils';

interface InvoiceRecord {
    id: string;
    projectId: string;
    projectName: string;
    clientName: string;
    totalBudget: number;
    completion: number;
    amountBilled: number;
    amountRemaining: number;
    lastBilledDate: string;
    status: 'paid' | 'pending' | 'overdue';
}

export function InvoiceReport() {
    const invoices: InvoiceRecord[] = [];

    const columns: Column<InvoiceRecord>[] = [
        {
            key: 'projectName',
            header: 'Project',
            sortable: true,
            render: (record) => (
                <div>
                    <div className="font-medium">{record.projectName}</div>
                    <div className="text-xs text-gray-500">{record.clientName}</div>
                </div>
            )
        },
        {
            key: 'completion',
            header: 'Progress',
            sortable: true,
            render: (record) => (
                <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ width: `${record.completion}%` }}
                        />
                    </div>
                    <span className="text-xs font-medium">{record.completion}%</span>
                </div>
            )
        },
        {
            key: 'amountBilled',
            header: 'Billed to Date',
            sortable: true,
            render: (record) => <span className="font-medium">${record.amountBilled.toLocaleString()}</span>
        },
        {
            key: 'amountRemaining',
            header: 'Remaining',
            render: (record) => <span className="text-gray-500">${record.amountRemaining.toLocaleString()}</span>
        },
        {
            key: 'status',
            header: 'Status',
            render: (record) => (
                <Badge variant={record.status === 'paid' ? 'success' : record.status === 'overdue' ? 'destructive' : 'secondary'} className="capitalize">
                    {formatStatus(record.status)}
                </Badge>
            )
        },
        {
            key: 'actions',
            header: 'Actions',
            render: () => (
                <Button size="sm" variant="ghost">
                    <Download className="w-4 h-4 text-gray-600" />
                </Button>
            )
        }
    ];

    const totalBilled = invoices.reduce((sum, i) => sum + i.amountBilled, 0);

    return (
        <Card className="p-0 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Project Invoicing</h3>
                    <p className="text-sm text-gray-500">Billing status based on project progress</p>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                            ${totalBilled.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">Total Billed Volume</div>
                    </div>
                </div>
            </div>
            <Table data={invoices} columns={columns} />
        </Card>
    );
}
