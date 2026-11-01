import { getFullUrl } from '@/shared/utils/helpers';
import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { FileText, Download, Eye, Trash2, Calendar, Search, Filter, Upload, File, AlertCircle } from 'lucide-react';
import { useDeleteProjectDocument, useProjectDocuments, useUploadProjectDocument } from '../hooks';

function getFileIcon(fileType?: string) {
    if (!fileType) return FileText;
    const t = fileType.toLowerCase();
    if (t.includes('pdf')) return FileText;
    if (t.includes('image') || t.includes('png') || t.includes('jpg')) return File;
    return FileText;
}

function formatFileSize(bytes?: number) {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr?: string) {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

export function ProjectDocuments() {
    const authUser = (() => {
        try {
            const raw = localStorage.getItem('auth_user');
            return raw ? JSON.parse(raw) as { role?: string } : null;
        } catch {
            return null;
        }
    })();
    const isSuperAdmin = authUser?.role === 'super_admin';
    const { id: projectId } = useParams<{ id: string }>();
    const { data: documents = [], isLoading, error, refetch } = useProjectDocuments(projectId ?? '');
    const { uploadDocument, isUploading } = useUploadProjectDocument();
    const { deleteDocument, isDeleting } = useDeleteProjectDocument();
    const [search, setSearch] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setSelectedFile(file);
    };

    const handleUpload = async () => {
        if (!selectedFile || !projectId) return;
        try {
            await uploadDocument({ projectId, file: selectedFile });
            refetch();
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            console.error('Upload failed:', err);
        }
    };

    const handleDelete = async (documentId: string) => {
        if (!projectId) return;
        const confirmed = window.confirm('Delete this document?');
        if (!confirmed) return;
        try {
            await deleteDocument({ projectId, documentId });
            refetch();
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const filteredDocs = documents.filter((doc: any) => {
        if (!search) return true;
        const name = doc.name || doc.fileName || doc.originalName || '';
        return name.toLowerCase().includes(search.toLowerCase());
    });

    if (isLoading) {
        return (
            <div className="flex justify-center py-16">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1D4F6D] border-t-transparent" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-red-500 gap-2">
                <AlertCircle className="h-8 w-8" />
                <p className="font-bold">Failed to load documents</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search documents..."
                        className="pl-10 h-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" className="gap-2 h-10 border-gray-200">
                        <Filter className="h-4 w-4" />
                        Filter
                    </Button>
                    {!isSuperAdmin && (
                        <>
                            <Button
                                className="gap-2 h-10 bg-blue-600 hover:bg-blue-700 shadow-md flex-1 md:flex-none"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                {isUploading ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4" />
                                        Upload File
                                    </>
                                )}
                            </Button>
                            <Button
                                className="gap-2 h-10 bg-gray-700 hover:bg-gray-800 shadow-md flex-1 md:flex-none"
                                onClick={handleUpload}
                                disabled={!selectedFile || isUploading}
                            >
                                {isUploading ? (
                                    <>
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save'
                                )}
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={handleFileSelect}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.csv,.dwg"
                            />
                        </>
                    )}
                </div>
            </div>
            {!isSuperAdmin && selectedFile && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Selected file: <span className="font-semibold">{selectedFile.name}</span>
                </div>
            )}

            {/* Document Table */}
            <Card className="overflow-hidden border-gray-100 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Document Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Category</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Uploaded By</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredDocs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        <FileText className="h-10 w-10 mx-auto mb-3 text-gray-200" />
                                        <p className="font-bold">No documents yet</p>
                                        <p className="text-sm mt-1">Upload files to get started</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredDocs.map((doc: any) => {
                                    const docName = doc.name || doc.fileName || doc.originalName || 'Untitled';
                                    const docUrl = getFullUrl(doc.url || doc.fileUrl || doc.path);
                                    const FileIcon = getFileIcon(doc.mimeType || doc.type);

                                    return (
                                        <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-blue-50 transition-colors">
                                                        <FileIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 leading-tight">{docName}</p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {formatFileSize(doc.size || doc.fileSize)} • {doc.mimeType || doc.type || 'File'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 hidden md:table-cell">
                                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                                                    {doc.category || 'General'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 hidden sm:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                                                        {(doc.uploadedBy?.fullName || doc.author || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm text-gray-600 font-medium">
                                                        {doc.uploadedBy?.fullName || doc.author || '—'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                                    <Calendar className="h-4 w-4" />
                                                    {formatDate(doc.createdAt || doc.uploadedAt || doc.date)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {docUrl && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-gray-400 hover:text-blue-600"
                                                                onClick={() => window.open(docUrl, '_blank')}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-gray-400 hover:text-green-600"
                                                                onClick={() => {
                                                                    const a = document.createElement('a');
                                                                    a.href = docUrl;
                                                                    a.download = docName;
                                                                    a.click();
                                                                }}
                                                            >
                                                                <Download className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    {!isSuperAdmin && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-gray-400 hover:text-red-600"
                                                            disabled={isDeleting}
                                                            onClick={() => handleDelete(doc.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
