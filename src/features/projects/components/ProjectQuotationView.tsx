import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Edit3,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  Building2,
  User,
  MapPin,
  Calendar,
  DollarSign,
  Plus,
  Save,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import {
  QuotationDetailsEditor,
  QuotationDetailsPreview,
  QuotationBlock,
} from '@/features/quotes/components/QuotationDetailsEditor';
import { useGetQuoteEstimatesQuery } from '@/store/quotesApi';
import { apiClient } from '@/services/api/client';
import { Project } from '@/shared/types/entities';

interface ProjectQuotationViewProps {
  project: Project;
  onQuotationUpdated?: () => void;
}

export function ProjectQuotationView({
  project,
  onQuotationUpdated,
}: ProjectQuotationViewProps) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fallback query if project.quotation is not present
  const { data: quoteEstimatesData, refetch: refetchQuoteEstimates } = useGetQuoteEstimatesQuery(
    project.companyId ? { companyId: project.companyId, search: project.name } : undefined,
    { skip: Boolean(project.quotation) }
  );

  const activeQuote = useMemo(() => {
    if (project.quotation) return project.quotation;
    if (quoteEstimatesData?.data && Array.isArray(quoteEstimatesData.data)) {
      const matched =
        quoteEstimatesData.data.find(
          (q) => q.convertedProjectId === project.id
        ) ||
        quoteEstimatesData.data.find(
          (q) => q.projectName?.trim().toLowerCase() === project.name.trim().toLowerCase()
        ) ||
        quoteEstimatesData.data[0];
      return matched ?? null;
    }
    return null;
  }, [project.quotation, project.id, project.name, quoteEstimatesData]);

  const rawDetails = activeQuote?.quotationDetails;

  const normalizedBlocks: QuotationBlock[] = useMemo(() => {
    if (!rawDetails) return [];
    if (Array.isArray(rawDetails)) {
      return rawDetails.map((block: any) => ({
        heading: Boolean(block?.heading),
        headingLevel: ([1, 2, 3, 4, 5].includes(Number(block?.headingLevel))
          ? Number(block.headingLevel)
          : 2) as 1 | 2 | 3 | 4 | 5,
        bullet: Boolean(block?.bullet),
        numbered: Boolean(block?.numbered),
        runs: Array.isArray(block?.runs)
          ? block.runs.map((run: any) => ({
              text: String(run?.text ?? ''),
              bold: Boolean(run?.bold),
              italic: Boolean(run?.italic),
              underline: Boolean(run?.underline),
              strike: Boolean(run?.strike),
              color: run?.color,
              size: run?.size || run?.fontSize,
              fontSize: run?.fontSize || run?.size,
            }))
          : [{ text: typeof block === 'string' ? block : String(block?.text ?? '') }],
      }));
    }
    if (typeof rawDetails === 'string') {
      return rawDetails
        .split('\n')
        .filter(Boolean)
        .map((line) => ({
          runs: [{ text: line }],
        }));
    }
    return [];
  }, [rawDetails]);

  const [editBlocks, setEditBlocks] = useState<QuotationBlock[]>(normalizedBlocks);

  const handleStartEdit = () => {
    setEditBlocks(normalizedBlocks.length > 0 ? normalizedBlocks : [{ runs: [{ text: '' }] }]);
    setSaveError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditBlocks(normalizedBlocks);
    setSaveError(null);
    setIsEditing(false);
  };

  const handleSaveTerms = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);
      await apiClient.put(`/admin/projects/${project.id}/quotation-details`, {
        quotationDetails: editBlocks,
      });
      setIsEditing(false);
      if (onQuotationUpdated) {
        onQuotationUpdated();
      }
      if (!project.quotation) {
        try {
          refetchQuoteEstimates();
        } catch {
          // Safe ignore if query was not started or skipped
        }
      }
    } catch (err: any) {
      console.error('Failed to update quotation terms:', err);
      setSaveError(
        err?.response?.data?.message || err?.message || 'Failed to save quotation details & terms'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!activeQuote) return;
    try {
      setIsExporting(true);
      const endpoint = `/admin/quote-estimates/${activeQuote.id}/pdf`;
      const res = await apiClient.get<any>(endpoint, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data || res], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Quotation-${activeQuote.quoteNumber || project.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Failed to download quotation PDF:', err);
      alert('Unable to download quotation PDF: ' + (err?.message || 'Error'));
    } finally {
      setIsExporting(false);
    }
  };

  const quoteStatus = activeQuote?.status || 'draft';
  const quoteNumber = activeQuote?.quoteNumber || `PRJ-${project.name.slice(0, 6).toUpperCase()}`;

  return (
    <div className="space-y-6">
      {/* Top Quotation Banner / Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#1D4F6D] text-white p-6 rounded-3xl shadow-md border border-slate-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider">
                <FileText className="h-3.5 w-3.5 text-blue-300" />
                <span>{quoteNumber}</span>
              </div>
              <Badge
                variant={
                  quoteStatus === 'converted' || quoteStatus === 'accepted'
                    ? 'success'
                    : quoteStatus === 'sent'
                    ? 'info'
                    : 'secondary'
                }
                className="uppercase tracking-widest text-[10px] px-3 py-1 font-bold"
              >
                {quoteStatus === 'converted' ? 'Converted to Project' : quoteStatus}
              </Badge>
              {activeQuote?.createdAt && (
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Created {new Date(activeQuote.createdAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Project Quotation & Agreement
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Official quotation agreement defining the project classification, customer scope, pricing parameters, and agreed terms of service.
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {activeQuote && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isExporting}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-10 font-bold backdrop-blur-sm"
              >
                <Download className="h-4 w-4 mr-1.5" />
                {isExporting ? 'Generating PDF...' : 'Download PDF'}
              </Button>
            )}

            {!isEditing && (
              <Button
                size="sm"
                onClick={handleStartEdit}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-10 px-4 font-bold shadow-lg shadow-blue-900/30"
              >
                <Edit3 className="h-4 w-4 mr-1.5" />
                {normalizedBlocks.length > 0 ? 'Edit Details & Terms' : 'Add Details & Terms'}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/quotes')}
              className="bg-white/5 hover:bg-white/15 text-slate-200 border-slate-700 text-xs h-10 font-semibold"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Quote Library
            </Button>
          </div>
        </div>

        {/* Quick Meta Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2.5">
            <User className="h-4 w-4 text-blue-300 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Client</span>
              <span className="font-semibold text-white">
                {activeQuote?.clientName || project.client?.companyName || project.companyName || '—'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Building2 className="h-4 w-4 text-blue-300 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Company</span>
              <span className="font-semibold text-white">{project.companyName || '—'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Calendar className="h-4 w-4 text-blue-300 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Timeline</span>
              <span className="font-semibold text-white">
                {project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'}
                {' to '}
                {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Ongoing'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-blue-300 shrink-0" />
            <div className="truncate">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Address</span>
              <span className="font-semibold text-white truncate block">
                {project.address || activeQuote?.projectAddress || '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Section: Quotation Details & Terms */}
      <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-50/60 to-slate-50/60 p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg font-black text-gray-900">
                Quotation Details & Terms
              </CardTitle>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Scope of work, warranties, exclusions, payment schedules, and custom quotation clauses.
            </p>
          </div>

          {isEditing ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="text-xs font-bold"
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveTerms}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-200"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {isSaving ? 'Saving...' : 'Save Terms'}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              className="text-xs font-bold border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <Edit3 className="h-3.5 w-3.5 mr-1.5" />
              Edit Terms
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-6">
          {saveError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {saveError}
            </div>
          )}

          {isEditing ? (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 font-medium">
                Format your quotation clauses, warranty statements, and terms using the editor below:
              </p>
              <QuotationDetailsEditor
                value={editBlocks}
                onChange={setEditBlocks}
                placeholder="Enter quotation details, warranties, exclusions and agreement terms..."
                className="min-h-[350px]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveTerms}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {isSaving ? 'Saving...' : 'Save Terms'}
                </Button>
              </div>
            </div>
          ) : normalizedBlocks.length > 0 ? (
            <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-100/80">
              <QuotationDetailsPreview blocks={normalizedBlocks} />
            </div>
          ) : (
            <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
              <FileText className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-800">
                No Quotation Details & Terms Recorded
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-5">
                Quotation details and terms have not been added to this project yet. You can add terms of service, payment rules, warranties, and special conditions directly here.
              </p>
              <Button
                onClick={handleStartEdit}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Quotation Details & Terms
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial & Scope Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Summary */}
        <Card className="rounded-3xl border-gray-100 shadow-sm p-6 bg-white space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Quotation Pricing Summary
            </span>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-gray-600">
              <span>Subtotal</span>
              <span className="font-bold text-gray-900">
                ${Number(activeQuote?.subtotal || project.budget || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            {Number(activeQuote?.discountAmount || 0) > 0 && (
              <div className="flex justify-between items-center text-emerald-600">
                <span>Discount</span>
                <span className="font-bold">
                  -${Number(activeQuote.discountAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {Number(activeQuote?.taxAmount || 0) > 0 && (
              <div className="flex justify-between items-center text-gray-600">
                <span>Tax / VAT</span>
                <span className="font-bold text-gray-900">
                  +${Number(activeQuote.taxAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className="font-black text-gray-900 text-sm">Contract Total</span>
              <span className="font-black text-blue-700 text-lg">
                ${Number(activeQuote?.totalAmount || project.budget || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
            <div className="font-bold mb-0.5 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
              Locked Agreement
            </div>
            Pricing is locked per approved quote specifications and forms the contract baseline.
          </div>
        </Card>

        {/* Agreed Scope & Tasks from Quote */}
        <Card className="rounded-3xl border-gray-100 shadow-sm p-6 bg-white lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Agreed Services & Scope
            </span>
            <Layers className="h-4 w-4 text-blue-600" />
          </div>

          {activeQuote?.tasks && activeQuote.tasks.length > 0 ? (
            <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto pr-1">
              {activeQuote.tasks.map((task: any, idx: number) => (
                <div key={task.id || idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-4">
                    <p className="font-bold text-gray-900 truncate">
                      {idx + 1}. {task.title}
                    </p>
                    {task.description && (
                      <p className="text-[11px] text-gray-400 truncate">{task.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-gray-700">
                      {task.quantity} {task.unit || 'unit'}
                    </span>
                    {Number(task.totalPrice || 0) > 0 && (
                      <span className="block text-[11px] text-blue-600 font-bold">
                        ${Number(task.totalPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-6 text-center">
              Detailed line items are mapped into the Tasks and Scope structure.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
