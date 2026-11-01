import { getFullUrl } from '@/shared/utils/helpers';
import { useState, useMemo, useRef } from 'react';
import { 
  Search, 
  FileText, 
  Download, 
  Eye, 
  Calendar, 
  Upload, 
  Award, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Plus, 
  ExternalLink,
  ShieldCheck,
  X,
  FileCheck
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { 
  useGetWorkerDocumentsQuery, 
  useUploadWorkerDocumentMutation, 
  useDeleteWorkerDocumentMutation,
  WorkerDocumentItem 
} from '@/store/teamManagementApi';

interface WorkerDocumentsProps {
  worker?: any;
}

const CATEGORIES = [
  'Employment Contract',
  'Identity & Passport',
  'Certification',
  'Safety & Compliance',
  'Tax & Banking',
  'Other Document'
] as const;

export function WorkerDocuments({ worker }: WorkerDocumentsProps) {
  const workerId = worker?.id || worker?.userId;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Backend API Queries & Mutations
  const { 
    data: documents = [], 
    isLoading, 
    isFetching,
    refetch 
  } = useGetWorkerDocumentsQuery(workerId, {
    skip: !workerId,
  });

  const [uploadWorkerDocument, { isLoading: isUploading }] = useUploadWorkerDocumentMutation();
  const [deleteWorkerDocument, { isLoading: isDeleting }] = useDeleteWorkerDocumentMutation();

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [documentCategory, setDocumentCategory] = useState<string>('Employment Contract');
  const [customDocumentName, setCustomDocumentName] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<WorkerDocumentItem | null>(null);

  // Delete confirmation state
  const [documentToDelete, setDocumentToDelete] = useState<WorkerDocumentItem | null>(null);

  // Metrics
  const totalDocs = documents.length;
  const certificationCount = documents.filter((d) => d.category.toLowerCase().includes('cert')).length;
  const verifiedCount = documents.filter((d) => d.status === 'verified' || d.status === 'active').length;

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter((d) => {
      const matchesSearch = 
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCat = 
        selectedCategory === 'all' || 
        d.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [documents, searchQuery, selectedCategory]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!customDocumentName) {
        setCustomDocumentName(file.name);
      }
      setUploadError(null);
    }
  };

  const handleOpenUploadModal = () => {
    setUploadFile(null);
    setCustomDocumentName('');
    setDocumentCategory('Employment Contract');
    setUploadError(null);
    setIsUploadModalOpen(true);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a file to upload.');
      return;
    }

    if (!workerId) {
      setUploadError('Worker ID is missing.');
      return;
    }

    try {
      setUploadError(null);
      await uploadWorkerDocument({
        workerId,
        file: uploadFile,
        category: documentCategory,
        name: customDocumentName.trim() || uploadFile.name,
      }).unwrap();

      setIsUploadModalOpen(false);
      setUploadFile(null);
      setCustomDocumentName('');
    } catch (err: any) {
      setUploadError(err?.data?.message || err?.message || 'Failed to upload document. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!documentToDelete || !workerId) return;

    try {
      await deleteWorkerDocument({
        workerId,
        documentId: documentToDelete.id,
      }).unwrap();
      setDocumentToDelete(null);
    } catch (err: any) {
      alert(err?.data?.message || 'Failed to delete document.');
    }
  };

  const handlePreviewOrOpen = (doc: WorkerDocumentItem) => {
    if (!doc.url) {
      alert('File preview link is not available for this record.');
      return;
    }
    // If it has a full URL, open in new tab or show preview modal
    const finalUrl = getFullUrl(doc.url); if (finalUrl) window.open(finalUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = (doc: WorkerDocumentItem) => {
    if (!doc.url) {
      alert('Download URL not found.');
      return;
    }
    const link = document.createElement('a');
    link.href = getFullUrl(doc.url) || doc.url;
    link.download = doc.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryBadgeClass = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('cert')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (cat.includes('contract')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (cat.includes('id') || cat.includes('passport')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (cat.includes('safe')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (cat.includes('tax')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-gray-100 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center text-[#1D4F6D]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Documents</p>
              <p className="text-xl font-black text-gray-900 mt-0.5">{totalDocs}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Certifications</p>
              <p className="text-xl font-black text-gray-900 mt-0.5">{certificationCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Verified on File</p>
              <p className="text-xl font-black text-emerald-600 mt-0.5">{verifiedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Header & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#1D4F6D] transition-colors" />
            <Input
              placeholder="Search by file name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-gray-200 bg-white focus:bg-white transition-all rounded-xl text-xs"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 px-3 bg-white border border-gray-200 text-xs font-semibold rounded-xl text-gray-700 focus:outline-none focus:border-[#1D4F6D]"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <Button
          onClick={handleOpenUploadModal}
          className="gap-2 h-10 bg-[#1D4F6D] hover:bg-[#163a50] text-white shadow-sm flex-none font-bold rounded-xl px-4 text-xs cursor-pointer"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload Document
        </Button>
      </div>

      {/* Document List Table */}
      {isLoading ? (
        <Card className="p-12 text-center border-gray-100 rounded-2xl bg-white shadow-sm">
          <div className="h-8 w-8 border-2 border-[#1D4F6D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-600">Loading worker documents...</p>
        </Card>
      ) : filteredDocs.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-gray-200 rounded-2xl bg-gray-50/50">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-700">No Documents Found</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            {searchQuery || selectedCategory !== 'all' 
              ? 'No documents matched your search filter. Try clearing your search.' 
              : 'No official documents or certifications are currently on file for this worker. Click "Upload Document" to attach contracts, IDs, or certifications.'}
          </p>
          <Button
            size="sm"
            onClick={handleOpenUploadModal}
            className="mt-4 bg-[#1D4F6D] hover:bg-[#163a50] text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Worker Document
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden border-gray-100 shadow-sm rounded-2xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Document Name</th>
                  <th className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Category</th>
                  <th className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:table-cell">Status</th>
                  <th className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date Uploaded</th>
                  <th className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-50 group-hover:text-[#1D4F6D] transition-colors flex-shrink-0">
                          {doc.category.toLowerCase().includes('cert') ? (
                            <Award className="h-4 w-4 text-amber-500" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => handlePreviewOrOpen(doc)}
                            className="text-xs font-bold text-gray-900 hover:text-[#1D4F6D] hover:underline text-left block truncate max-w-[200px] sm:max-w-xs"
                          >
                            {doc.name}
                          </button>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            {doc.size || 'Verified file'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[11px] font-bold border ${getCategoryBadgeClass(doc.category)}`}>
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-gray-700 capitalize">
                          {doc.status || 'Verified'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        {doc.date}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {doc.url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePreviewOrOpen(doc)}
                            className="h-8 w-8 text-gray-400 hover:text-[#1D4F6D] hover:bg-blue-50 rounded-lg cursor-pointer"
                            title="Open / Preview in new tab"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {doc.url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(doc)}
                            className="h-8 w-8 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                            title="Download document"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDocumentToDelete(doc)}
                          className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Delete document"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Upload Document Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => !isUploading && setIsUploadModalOpen(false)}
        title="Upload Worker Document"
        maxWidth="md"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4 pt-1">
          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Worker Info mini banner */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
            <div className="h-8 w-8 rounded-lg bg-[#1D4F6D] text-white flex items-center justify-center font-bold text-xs uppercase">
              {(worker?.name || 'W').charAt(0)}
            </div>
            <div>
              <p className="font-bold text-gray-900">{worker?.name || 'Worker'}</p>
              <p className="text-gray-400 text-[10px]">Attaching document to worker file</p>
            </div>
          </div>

          {/* File Selection Zone */}
          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">
              Select Document File *
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                uploadFile
                  ? 'border-emerald-300 bg-emerald-50/40 text-emerald-800'
                  : 'border-gray-200 hover:border-[#1D4F6D] bg-gray-50/50 hover:bg-blue-50/20'
              }`}
            >
              {uploadFile ? (
                <div className="space-y-1">
                  <FileCheck className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-xs font-bold text-emerald-900">{uploadFile.name}</p>
                  <p className="text-[10px] text-emerald-600">
                    {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB • Click to replace
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-7 h-7 text-gray-400 mx-auto" />
                  <p className="text-xs font-bold text-gray-700">Click to choose or drag file here</p>
                  <p className="text-[10px] text-gray-400">PDF, PNG, JPG, or DOC up to 25MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">
              Document Category *
            </label>
            <select
              value={documentCategory}
              onChange={(e) => setDocumentCategory(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-gray-200 text-xs font-semibold rounded-xl text-gray-900 focus:outline-none focus:border-[#1D4F6D]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Custom Document Display Name */}
          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">
              Document Title / Label (Optional)
            </label>
            <Input
              value={customDocumentName}
              onChange={(e) => setCustomDocumentName(e.target.value)}
              placeholder="e.g. Standard Employment Agreement 2026"
              className="text-xs rounded-xl h-10"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isUploading}
              onClick={() => setIsUploadModalOpen(false)}
              className="w-1/3 rounded-xl text-xs font-bold h-10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!uploadFile || isUploading}
              className="w-2/3 bg-[#1D4F6D] hover:bg-[#153a50] text-white rounded-xl text-xs font-black h-10 gap-1.5 shadow-sm"
            >
              {isUploading ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading File...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Upload & Save Document
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!documentToDelete}
        onClose={() => !isDeleting && setDocumentToDelete(null)}
        title="Delete Document"
        maxWidth="sm"
      >
        {documentToDelete && (
          <div className="space-y-4 pt-1">
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Are you sure you want to delete this document?</p>
                <p className="text-[11px] text-red-600 mt-0.5">
                  "{documentToDelete.name}" will be permanently removed from this worker's profile.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={isDeleting}
                onClick={() => setDocumentToDelete(null)}
                className="w-1/2 rounded-xl text-xs font-bold h-9"
              >
                Cancel
              </Button>
              <Button
                disabled={isDeleting}
                onClick={handleDelete}
                className="w-1/2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold h-9 gap-1.5 shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Confirm Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
