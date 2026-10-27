import { useEffect, useRef, useState, type ReactNode } from "react";
import "./quotation-v2.css";
import { Navigate, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Archive,
  Building2,
  CheckCircle2,
  CircleOff,
  FileText,
  FileEdit,
  Download,
  Mail,
  Send,
  Loader2,
  Sparkles,
  Layers3,
  Plus,
  Pencil,
  Trash2,
  Wrench,
  ChevronDown,
  ChevronRight,
  Info,
  Users,
  MapPin,
  ClipboardCheck,
} from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/store/authSlice";
import { Button } from "@/shared/components/ui/Button";
import { Modal } from "@/shared/components/ui/Modal";
import { SEO } from "@/shared/components/seo/SEO";
import { config } from "@/config/env";
import { useGetCompaniesQuery } from "@/store/companiesApi";
import {
  type CreateQuoteEstimatePayload,
  type QuoteEstimate,
  useAcceptAndCreateQuoteEstimateProjectMutation,
  useCreateQuoteEstimateMutation,
  useCancelQuoteEstimateMutation,
  useDeleteQuoteEstimateMutation,
  useGetQuoteEstimatesQuery,
  useRejectQuoteEstimateMutation,
  useSendQuoteEstimateMutation,
  useUpdateQuoteEstimateMutation,
} from "@/store/quotesApi";
import {
  QuotationDetailsEditor,
  QuotationDetailsPreview,
  type QuotationBlock,
} from "../components/QuotationDetailsEditor";
import {
  type QuotationErrors,
  type ProjectField,
} from "../quotationV2Validation";

type Unit = { id: string; label: string; selected: boolean };
type Floor = {
  id: string;
  label: string;
  prefix: string;
  selected: boolean;
  units: Unit[];
};
type Cost = {
  id: string;
  name: string;
  basis: "fixed" | "unit" | "hour";
  amount: number;
};
type Service = {
  id: string;
  title: string;
  description: string;
  rate: number;
  hours: number;
  units: string[];
  costs: Cost[];
  reviewed: boolean;
};
const steps = [
  "Project Details",
  "Quotation Details",
  "Building Details",
  "Workable Area",
  "Services & Pricing",
  "Full Quotation View",
];
const uid = () => crypto.randomUUID();
const locationToken = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );
const control = "qv2-control";
const stepIcons = [Users, FileEdit, Building2, Layers3, Wrench, ClipboardCheck];
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="qv2-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Section({
  title,
  description,
  action,
  compactTitle,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  compactTitle?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="qv2-section">
      <header className="qv2-section-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={compactTitle ? "qv2-compact-title" : undefined}>{title}</h2>
          {action}
        </div>
        {description && <p>{description}</p>}
      </header>
      <div className="qv2-section-body">{children}</div>
    </section>
  );
}
function Disclosure({
  title,
  description,
  forceOpen,
  initiallyOpen,
  children,
}: {
  title: string;
  description: string;
  forceOpen?: boolean;
  initiallyOpen?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (initiallyOpen !== undefined && ref.current)
      ref.current.open = initiallyOpen;
  }, [initiallyOpen]);
  useEffect(() => {
    if (forceOpen && ref.current) ref.current.open = true;
  }, [forceOpen]);
  return (
    <details ref={ref} className="qv2-disclosure">
      <summary>
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
        <ChevronDown size={18} />
      </summary>
      <div className="qv2-disclosure-body">{children}</div>
    </details>
  );
}
function Choice({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className={`qv2-choice ${checked ? "is-selected" : ""}`}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{children}</span>
    </label>
  );
}
export function QuoteLibraryV2Page() {
  const user = useAppSelector(selectAuthUser);
  if (user?.role !== "admin") return <Navigate to="/" replace />;
  return <QuotationWorkspace />;
}

function QuotationWorkspace() {
  const navigate = useNavigate();
  const [showSaved, setShowSaved] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<QuoteEstimate | null>(null);
  const { data, isLoading } = useGetQuoteEstimatesQuery({ limit: 100 });
  const savedQuotes = Array.isArray(data?.data) ? data.data : [];
  const [deleteQuote, { isLoading: isDeleting }] = useDeleteQuoteEstimateMutation();
  const [rejectQuote, { isLoading: isRejecting }] = useRejectQuoteEstimateMutation();
  const [cancelQuote, { isLoading: isCancelling }] = useCancelQuoteEstimateMutation();

  if (showSaved) {
    return (
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Saved Quotations</h1>
            <p className="mt-1 text-sm text-slate-500">Only quotations created by your admin account are shown.</p>
          </div>
          <Button onClick={() => { setSelectedQuote(null); setShowSaved(false); }}>
            <Plus size={16} className="mr-2" />New Quotation
          </Button>
        </header>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading quotations...</p>
        ) : savedQuotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No saved quotations yet.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {savedQuotes.map((quote) => (
              <article key={quote.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xs font-semibold uppercase tracking-wider text-sky-700">{quote.quoteNumber}</p><h2 className="mt-1 font-bold text-slate-900">{quote.projectName}</h2></div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">{quote.status}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{quote.clientName}</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{money(quote.totalAmount)}</p>
                <div className="mt-5 flex gap-2">
                  {quote.status === "converted" && quote.convertedProject?.id ? (
                    <Button className="flex-1" onClick={() => navigate(`/projects/${quote.convertedProject?.id}`)}>Open Project</Button>
                  ) : (
                    <Button className="flex-1" variant="outline" onClick={() => { setSelectedQuote(quote); setShowSaved(false); }}>Open</Button>
                  )}
                  {(["draft", "sent"] as string[]).includes(quote.status) && <Button variant="outline" disabled={isRejecting} title="Reject quotation" onClick={async () => { if (window.confirm(`Reject ${quote.quoteNumber}?`)) await rejectQuote({ id: quote.id }).unwrap(); }}><CircleOff size={15} /></Button>}
                  {(["draft", "sent", "accepted"] as string[]).includes(quote.status) && <Button variant="outline" disabled={isCancelling} title="Cancel quotation" onClick={async () => { if (window.confirm(`Cancel ${quote.quoteNumber}?`)) await cancelQuote(quote.id).unwrap(); }}><Archive size={15} /></Button>}
                  {quote.status !== "converted" && <Button variant="outline" disabled={isDeleting} title="Delete quotation" onClick={async () => { if (window.confirm(`Delete ${quote.quoteNumber}?`)) await deleteQuote(quote.id).unwrap(); }}><Trash2 size={15} /></Button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <QuotationBuilder key={selectedQuote?.id ?? "new"} initialQuote={selectedQuote} onOpenSaved={() => setShowSaved(true)} onSaved={setSelectedQuote} />;
}

function QuotationBuilder({ initialQuote, onOpenSaved, onSaved }: { initialQuote: QuoteEstimate | null; onOpenSaved: () => void; onSaved: (quote: QuoteEstimate) => void }) {
  const navigate = useNavigate();
  const initialBuildingPlan = initialQuote?.buildingPlan as ({ totalFloors?: number; capacity?: number; floorMode?: string; customLabels?: string; floors?: Floor[] } | null | undefined);
  const initialPricing = initialQuote?.pricingConfig as ({ services?: Service[] } | null | undefined);
  const restoredFloors: Floor[] = Array.isArray(initialBuildingPlan?.floors)
    ? initialBuildingPlan.floors.map((floor) => ({
        id: floor?.id || uid(),
        label: floor?.label || "Untitled floor",
        prefix: floor?.prefix || "",
        selected: floor?.selected !== false,
        units: Array.isArray(floor?.units)
          ? floor.units.map((unit) => ({
              id: unit?.id || uid(),
              label: unit?.label || "Untitled unit",
              selected: unit?.selected !== false,
            }))
          : [],
      }))
    : [];
  const restoredServices: Service[] = Array.isArray(initialPricing?.services)
    ? initialPricing.services.map((service) => ({
        id: service?.id || uid(),
        title: service?.title || "",
        description: service?.description || "",
        rate: Number(service?.rate) || 0,
        hours: Number(service?.hours) || 1,
        units: Array.isArray(service?.units) ? service.units.filter(Boolean) : [],
        costs: Array.isArray(service?.costs)
          ? service.costs.map((cost) => ({
              id: cost?.id || uid(),
              name: cost?.name || "",
              basis: cost?.basis === "unit" || cost?.basis === "hour" ? cost.basis : "fixed",
              amount: Number(cost?.amount) || 0,
            }))
          : [],
        reviewed: Boolean(service?.reviewed),
      }))
    : [];
  const restoredDetails: QuotationBlock[] = Array.isArray(initialQuote?.quotationDetails)
    ? (initialQuote.quotationDetails as QuotationBlock[]).map((block) => ({
        heading: Boolean(block?.heading),
        ...(block?.heading ? { headingLevel: block.headingLevel === 1 ? 1 as const : 2 as const } : {}),
        bullet: Boolean(block?.bullet),
        runs: Array.isArray(block?.runs)
          ? block.runs.map((run) => ({
              text: String(run?.text ?? ""),
              ...(run?.bold ? { bold: true } : {}),
              ...(run?.italic ? { italic: true } : {}),
              ...(run?.underline ? { underline: true } : {}),
            }))
          : [],
      }))
    : [];
  const { data: companies = [] } = useGetCompaniesQuery({ limit: 100 });
  const [createQuote, { isLoading: isCreatingQuote }] = useCreateQuoteEstimateMutation();
  const [updateQuote, { isLoading: isUpdatingQuote }] = useUpdateQuoteEstimateMutation();
  const [sendQuote, { isLoading: isSendingQuote }] = useSendQuoteEstimateMutation();
  const [convertQuote, { isLoading: isConvertingQuote }] = useAcceptAndCreateQuoteEstimateProjectMutation();
  const [currentQuote, setCurrentQuote] = useState<QuoteEstimate | null>(initialQuote);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [step, setStep] = useState(0);
  const [areaPreviewOpen, setAreaPreviewOpen] = useState(false);
  const [info, setInfo] = useState({
    companyId: initialQuote?.companyId ?? "",
    company: initialQuote?.company?.name ?? "",
    project: initialQuote?.projectName ?? "",
    client: initialQuote?.clientName ?? "",
    address: initialQuote?.projectAddress ?? "",
    phone: initialQuote?.clientPhone ?? "",
    email: initialQuote?.clientEmail ?? "",
    projectType: initialQuote?.projectType ?? "New Construction",
    propertyType: initialQuote?.propertyType ?? "Residential",
    buildingType: initialQuote?.unitType ?? "Apartment Building",
    start: initialQuote?.startDate?.slice(0, 10) ?? "",
    end: initialQuote?.endDate?.slice(0, 10) ?? "",
  });
  const [totalFloors, setTotalFloors] = useState(initialBuildingPlan?.totalFloors ?? 4);
  const [capacity, setCapacity] = useState(initialBuildingPlan?.capacity ?? 6);
  const [floorMode, setFloorMode] = useState(initialBuildingPlan?.floorMode ?? "Standard");
  const [customLabels, setCustomLabels] = useState(initialBuildingPlan?.customLabels ?? "B1, G, 1, PH");
  const [buildingModalOpen, setBuildingModalOpen] = useState(false);
  const [buildingDraft, setBuildingDraft] = useState({ totalFloors: 4, capacity: 6, floorMode: "Standard", customLabels: "B1, G, 1, PH" });
  const [floors, setFloors] = useState<Floor[]>(restoredFloors);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [unitTargetMode, setUnitTargetMode] = useState("all");
  const [unitTargetIds, setUnitTargetIds] = useState<string[]>([]);
  const [pattern, setPattern] = useState("floor");
  const [start, setStart] = useState(1);
  const [digits, setDigits] = useState(2);
  const [separator, setSeparator] = useState("");
  const [serviceDraft, setServiceDraft] = useState<Service | null>(null);
  const [services, setServices] = useState<Service[]>(restoredServices);
  const [serviceMode, setServiceMode] = useState("custom");
  const [serviceSearch, setServiceSearch] = useState("");
  const [floorSearch, setFloorSearch] = useState("");
  const [unitSearch, setUnitSearch] = useState("");
  useEffect(() => {
    if (serviceDraft) {
      setServiceSearch("");
      setFloorSearch("");
      setUnitSearch("");
      setServiceMode("custom");
    }
  }, [serviceDraft?.id]);
  const [confirmed, setConfirmed] = useState(false);
  const [complete, setComplete] = useState(false);
  const [actionErrors, setActionErrors] = useState<QuotationErrors>({});
  const [quotationDetails, setQuotationDetails] = useState<QuotationBlock[]>(restoredDetails);

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfMessage, setPdfMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const pageTop = useRef<HTMLDivElement>(null);
  useEffect(() => {
    pageTop.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [step, complete]);
  const selectedFloors = floors.filter(floor => floor.units.some(unit => unit.selected));
  const unitTargetFloors = unitTargetMode === "all"
    ? floors
    : floors.filter(floor => unitTargetIds.includes(floor.id));
  const workable = selectedFloors.flatMap((f) =>
    f.units.filter((u) => u.selected).map((u) => ({ ...u, floor: f.label })),
  );
  const workableIds = new Set(workable.map((u) => u.id));
  const hasUnits = floors.some(floor => floor.units.length > 0);
  const allUnitsSelected = hasUnits && floors.every(floor => floor.units.every(unit => unit.selected));

  const totals = (s: Service) => {
    const count = s.units.filter((id) => workableIds.has(id)).length;
    return {
      count,
      base: s.rate * count,
      hourly:
        s.rate * count +
        s.costs
          .filter((c) => c.basis === "hour")
          .reduce((n, c) => n + c.amount * count, 0),
      once: s.costs
        .filter((c) => c.basis !== "hour")
        .reduce((n, c) => n + c.amount * (c.basis === "unit" ? count : 1), 0),
    };
  };
  const hourly = services.reduce((n, s) => n + totals(s).hourly, 0);
  const once = services.reduce((n, s) => n + totals(s).once, 0);
  const quotationTotal = services.reduce((sum, service) => sum + totals(service).hourly * service.hours + totals(service).once, 0);

  const buildQuotationPayload = () => ({
    project: info.project || "Quotation",
    company: info.company || "",
    client: info.client || "",
    address: info.address || "",
    phone: info.phone || "",
    email: info.email || "",
    projectType: info.projectType || "New Construction",
    propertyType: info.propertyType || "Residential",
    buildingType: info.buildingType || "Apartment Building",
    start: info.start || "",
    end: info.end || "",
    details: quotationDetails.map((block) => ({
      heading: Boolean(block.heading),
      ...(block.heading ? { headingLevel: block.headingLevel ?? 2 } : {}),
      bullet: Boolean(block.bullet),
      runs: (block.runs || []).map((r) => ({
        text: String(r.text || ""),
        ...(r.bold ? { bold: true } : {}),
        ...(r.italic ? { italic: true } : {}),
        ...(r.underline ? { underline: true } : {}),
      })),
    })),
    floors: selectedFloors.map((floor) => ({
      label: floor.label,
      units: floor.units
        .filter((unit) => unit.selected)
        .map((unit) => ({ id: unit.id, label: unit.label })),
    })),
    services: services.map((s) => {
      const count = s.units.filter((id) => workableIds.has(id)).length;
      const hourlyExtra = s.costs
        .filter((c) => c.basis === "hour")
        .reduce((n, c) => n + (Number(c.amount) || 0) * count, 0);
      const oneTime = s.costs
        .filter((c) => c.basis !== "hour")
        .reduce(
          (n, c) => n + (Number(c.amount) || 0) * (c.basis === "unit" ? count : 1),
          0,
        );
      return {
        title: s.title || "Untitled service",
        description: s.description || "",
        rate: Math.max(0, Number(s.rate) || 0),
        hours: Math.max(0, Number(s.hours) || 1),
        hourlyExtra: Math.max(0, hourlyExtra),
        oneTime: Math.max(0, oneTime),
        unitIds: s.units.filter((id) => workableIds.has(id)),
      };
    }),
  });

  const buildEstimatePayload = (): CreateQuoteEstimatePayload => {
    const selectedUnits = selectedFloors.flatMap((floor) =>
      floor.units.filter((unit) => unit.selected).map((unit) => ({ floor, unit })),
    );
    return {
      companyId: info.companyId,
      projectName: info.project.trim(),
      clientName: info.client.trim(),
      clientEmail: info.email.trim() || undefined,
      clientPhone: info.phone.trim() || undefined,
      projectAddress: info.address.trim() || undefined,
      projectType: info.projectType,
      propertyType: info.propertyType,
      unitType: info.buildingType,
      startDate: info.start || undefined,
      endDate: info.end || undefined,
      floorsCount: selectedFloors.length,
      unitsPerFloor: selectedFloors.length ? Math.max(...selectedFloors.map((floor) => floor.units.filter((unit) => unit.selected).length)) : 0,
      schemaVersion: 2,
      quotationDetails,
      buildingPlan: { totalFloors, capacity, floorMode, customLabels, floors },
      pricingConfig: { services },
      tasks: services.map((service, index) => {
        const assigned = selectedUnits.filter(({ unit }) => service.units.includes(unit.id));
        const serviceTotal = totals(service).hourly * service.hours + totals(service).once;
        return {
          title: service.title.trim() || `Service ${index + 1}`,
          description: service.description.trim() || undefined,
          quantity: 1,
          unit: "service",
          estimatedHours: Math.max(0, Number(service.hours) || 0),
          unitPrice: Math.max(0, serviceTotal),
          locationMode: "selected" as const,
          plannedLocationKeys: assigned.map(({ floor, unit }) => `floor_${locationToken(floor.label)}_unit_${locationToken(unit.label)}`),
          scopeChecklist: service.costs.map((cost) => `${cost.name} (${cost.basis}: ${cost.amount})`),
          sortOrder: index,
        };
      }),
    };
  };

  const saveQuotation = async () => {
    setSaveMessage(null);
    if (!info.companyId || !info.project.trim() || !info.client.trim()) {
      setSaveMessage({ type: "error", text: "Company, project name and client name are required before saving." });
      throw new Error("Required quotation details are missing");
    }
    const payload = buildEstimatePayload();
    try {
      const result = currentQuote
        ? await updateQuote({ id: currentQuote.id, data: payload }).unwrap()
        : await createQuote(payload).unwrap();
      setCurrentQuote(result.quote);
      onSaved(result.quote);
      setSaveMessage({ type: "success", text: `${result.quote.quoteNumber} saved successfully.` });
      return result.quote;
    } catch (error: any) {
      const text = error?.data?.message || error?.message || "Unable to save quotation.";
      setSaveMessage({ type: "error", text });
      throw error;
    }
  };

  const handlePersistedSend = async () => {
    try {
      const quote = await saveQuotation();
      const result = await sendQuote(quote.id).unwrap();
      setCurrentQuote(result.quote);
      onSaved(result.quote);
      setSaveMessage({ type: "success", text: "Quotation saved and emailed to the client." });
    } catch (error: any) {
      setSaveMessage({ type: "error", text: error?.data?.message || error?.message || "Unable to send quotation." });
    }
  };

  const handleConvertToProject = async () => {
    try {
      const quote = await saveQuotation();
      const result = await convertQuote({ id: quote.id, acceptedByName: info.client }).unwrap();
      if (result.project?.id) navigate(`/projects/${result.project.id}`);
    } catch (error: any) {
      setSaveMessage({ type: "error", text: error?.data?.message || error?.message || "Unable to create project." });
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    setPdfMessage(null);
    try {
      const payload = buildQuotationPayload();
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${config.apiBaseUrl}/admin/quote-estimates/v2/export-pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        let errMsg = "Failed to export PDF";
        try {
          const errJson = await response.json();
          errMsg = errJson.message || errMsg;
        } catch (_) {
          errMsg = response.statusText || errMsg;
        }
        throw new Error(errMsg);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const cleanProject = (info.project || "quotation")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "_");
      link.download = `quotation-${cleanProject}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setPdfMessage({ type: "success", text: "Quotation PDF downloaded successfully!" });
      setTimeout(() => setPdfMessage(null), 5000);
    } catch (err: any) {
      console.error("PDF download error:", err);
      setPdfMessage({
        type: "error",
        text: err.message || "Failed to download PDF. Please try again.",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail.trim()) {
      setEmailStatus({ type: "error", text: "Please enter a recipient email address." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())) {
      setEmailStatus({
        type: "error",
        text: "Please enter a valid email address (e.g., client@example.com).",
      });
      return;
    }

    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      const payload = {
        ...buildQuotationPayload(),
        email: recipientEmail.trim(),
      };
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `${config.apiBaseUrl}/admin/quote-estimates/v2/email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to send quotation email.");
      }

      setEmailStatus({
        type: "success",
        text: `Quotation PDF has been emailed to ${recipientEmail.trim()}!`,
      });
      setTimeout(() => {
        setEmailModalOpen(false);
        setEmailStatus(null);
      }, 2500);
    } catch (err: any) {
      console.error("Email send error:", err);
      setEmailStatus({
        type: "error",
        text: err.message || "Failed to send email. Please check network/mail configuration.",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const invalidate = () => {
    setServices((ss) => ss.map((s) => ({ ...s, reviewed: false })));
    setConfirmed(false);
    setComplete(false);
  };
  const changeFloors = (next: Floor[]) => {
    setFloors(next);
    invalidate();
  };
  const updateFloor = (id: string, patch: Partial<Floor>) =>
    changeFloors(
      floors.map((f) =>
        f.id === id ? { ...f, ...patch } : f,
      ),
    );
  const updateService = (id: string, patch: Partial<Service>) => {
    if (serviceDraft?.id === id) {
      setServiceDraft(current => current ? { ...current, ...patch } : current);
      return;
    }
    setServices((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setConfirmed(false);
    setComplete(false);
  };
  const labelsFor = (f: Floor, unitCount = capacity) =>
    Array.from({ length: unitCount }, (_, i) => {
      const suffix = String(start + i).padStart(digits, "0");
      return pattern === "same"
        ? suffix
        : `${pattern === "prefix" ? "F" : ""}${f.prefix}${separator}${suffix}`;
    });
  const generate = (targets: Floor[]) => {
    if (
      targets.some((f) => f.units.length) &&
      !window.confirm(
        "Replace existing unit numbers? Individual changes will be cleared.",
      )
    )
      return;
    changeFloors(
      floors.map((f) =>
        targets.some((t) => t.id === f.id)
          ? {
              ...f,
              units: labelsFor(f).map((label) => ({
                id: uid(),
                label,
                selected: true,
              })),
            }
          : f,
      ),
    );
    return true;
  };
  const visibleErrors: QuotationErrors = actionErrors;
  const errorAt = (key: string) =>
    visibleErrors[key] ? (
      <p
        id={`error-${key}`}
        tabIndex={-1}
        role="alert"
        className="scroll-mt-24 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 outline-none"
      >
        {visibleErrors[key]}
      </p>
    ) : null;
  const focusError = (key: string) =>
    requestAnimationFrame(() => {
      const element =
        document.getElementById(`error-${key}`) ??
        document.getElementById(`quotation-${key}`);
      let parent = element?.parentElement;
      while (parent) {
        if (parent instanceof HTMLDetailsElement) parent.open = true;
        parent = parent.parentElement;
      }
      element?.focus();
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  const reportAction = (key: string, message: string) => {
    setActionErrors((current) => ({ ...current, [key]: message }));
    focusError(key);
  };
  const clearAction = (key: string) =>
    setActionErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  const next = () => {
    setActionErrors({});
    setSavedSnapshot(JSON.stringify({ step, info, quotationDetails, floors, services }));
    setStep((current) => Math.min(steps.length - 1, current + 1));
  };
  const changeInfo = (key: keyof typeof info, value: string) => {
    setInfo(current => ({ ...current, [key]: value }));
    setConfirmed(false);
  };
  const textField = (key: ProjectField, label: string, type = "text") => (
    <Field label={label}>
      <input
        id={`quotation-${key}`}
        className={control}
        type={type}
        value={info[key]}
        onChange={e => changeInfo(key, e.target.value)}
      />
    </Field>
  );
  const selectInfo = (
    key: keyof typeof info,
    label: string,
    options: string[],
  ) => (
    <Field label={label}>
      <select
        className={control}
        value={info[key]}
        onChange={(e) => setInfo({ ...info, [key]: e.target.value })}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </Field>
  );
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const sectionSaved = savedSnapshot === JSON.stringify({ step, info, quotationDetails, floors, services });
  const sections = steps.map(title => ({ title }));
  const openSection = (index: number) => { setStep(index); setComplete(false); setActionErrors({}); };
  return (
    <div className="qv2 qv2-workspace">
      <nav className="qv2-subnav" aria-label="Quotation sections">{sections.map((section, index) => { const Icon = stepIcons[index]; return <button type="button" key={section.title} aria-current={step === index ? 'page' : undefined} onClick={() => openSection(index)}><Icon size={19} /><span>{section.title}</span></button>; })}</nav>
      <div ref={pageTop} className="qv2-workspace-content">
      <SEO
        title="Quotation Library V2"
        description="Create a quotation with work areas and service pricing."
      />
      <header className="qv2-page-header">
        <div>
          <h1>{steps[step]}</h1>
          {currentQuote && <p>{currentQuote.quoteNumber} · <span className="capitalize">{currentQuote.status}</span></p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onOpenSaved}><FileText size={15} className="mr-2" />Saved Quotations</Button>
          <Button variant="outline" disabled={isCreatingQuote || isUpdatingQuote || currentQuote?.status === "converted"} onClick={() => void saveQuotation().catch(() => undefined)}>
            {(isCreatingQuote || isUpdatingQuote) ? <Loader2 size={15} className="mr-2 animate-spin" /> : <FileEdit size={15} className="mr-2" />}
            {currentQuote ? "Update Draft" : "Save Draft"}
          </Button>
        </div>
      </header>
      {saveMessage && <div role="status" className={`mb-5 rounded-xl border p-3 text-sm ${saveMessage.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{saveMessage.text}</div>}
      {complete ? (
        <Section title="Quotation confirmed for this preview">
          <div className="flex items-start gap-4 rounded-xl bg-emerald-50 p-5 text-emerald-800">
            <CheckCircle2 />
            <div>
              <p className="font-semibold">{info.project}</p>
              <p className="mt-1 text-sm">
                Your quotation is ready. Save it to keep the quotation and enable project conversion.
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              setComplete(false);
              setConfirmed(false);
            }}
          >
            Return to review
          </Button>
        </Section>
      ) : (
        <>
          <div className={`qv2-layout ${step < 5 ? "qv2-section-layout" : ""}`}>
            <main className="qv2-main">
              {step === 0 && (
                <>
                  <Section
                    title="Client information"
                    description="Add the business and main contact for this project."
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Company / Business Name">
                        <select className={control} value={info.companyId} onChange={(event) => { const company = companies.find((item) => item.id === event.target.value); setInfo((current) => ({ ...current, companyId: event.target.value, company: company?.name ?? "" })); }}>
                          <option value="">Select company</option>
                          {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                        </select>
                      </Field>
                      {textField("project", "Project Name")}
                      {textField("client", "Client Name")}
                      {textField("phone", "Phone Number", "tel")}
                      {textField("email", "Email Address", "email")}
                      <Field label="Project Address">
                        <textarea
                          id="quotation-address"
                          className={control}
                          value={info.address}
                          onChange={(e) =>
                            changeInfo("address", e.target.value)
                          }
                        />
                      </Field>
                    </div>
                  </Section>
                  <Section
                    title="Project details"
                    description="Tell us about the property and your expected schedule."
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      {selectInfo("projectType", "Project Type", [
                        "New Construction",
                        "Renovation",
                        "Remodeling",
                        "Maintenance",
                      ])}
                      {selectInfo("propertyType", "Property Type", [
                        "Residential",
                        "Commercial",
                        "Mixed-use",
                        "Industrial",
                      ])}
                      {textField("start", "Estimated Start Date", "date")}
                      {textField("end", "Estimated End Date", "date")}
                    </div>
                  </Section>
                  <Section
                    title="Quotation details & terms"
                    description="Write specifications, scope of work, warranty, and payment terms for this quotation."
                    action={
                      <Button size="sm" onClick={() => openSection(1)}>
                        <FileEdit size={14} className="mr-2" />
                        Open Details Editor
                      </Button>
                    }
                  >
                    <div className="space-y-4 rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50/60 to-white p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-sky-950 flex items-center gap-2">
                            <Sparkles size={16} className="text-sky-600" />
                            Quotation Details & Scope
                          </h3>
                          <p className="mt-1 text-xs text-sky-700">
                            {quotationDetails.length > 0
                              ? `${quotationDetails.length} detail block(s) configured. These details will be formatted into your final quotation and client PDF.`
                              : "No quotation details configured yet. Add scope, milestones, and warranties."}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openSection(1)}
                        >
                          <FileEdit size={14} className="mr-1.5" />
                          Edit in Quotation Details
                          <ArrowRight size={13} className="ml-1.5" />
                        </Button>
                      </div>

                      {quotationDetails.length > 0 && (
                        <div className="max-h-48 overflow-y-auto rounded-lg border border-sky-200/60 bg-white p-3.5 text-xs text-gray-700 shadow-2xs">
                          <QuotationDetailsPreview blocks={quotationDetails} />
                        </div>
                      )}
                    </div>
                  </Section>
                </>
              )}
              {step === 1 && (
                <>
                  <aside className="qv2-building-info" aria-label="About quotation details">
                    <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <p className="leading-relaxed">
                      Write and format the scope of work, material specifications, payment milestones, and terms & conditions. These details are automatically integrated into your final quotation and branded client PDF.
                    </p>
                  </aside>
                  <Section
                    title="Quotation details & terms"
                    description="Format your custom quotation clauses, scope of work, warranties, and terms using the rich text editor."
                  >
                    <QuotationDetailsEditor
                      value={quotationDetails}
                      onChange={(blocks) => {
                        setQuotationDetails(blocks);
                        setConfirmed(false);
                        setComplete(false);
                      }}
                    />
                  </Section>
                </>
              )}
              {step === 2 && (
                <>
                  <aside className="qv2-building-info" aria-label="About building details">
                    <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <p className="leading-relaxed">Add the full building layout for this project, including all floors and units. In the next step, Workable Area, you can select the floors and units where work will take place.</p>
                  </aside>
                  <Section title="Building details">
                      {selectInfo("buildingType", "Building Type", [
                        "Apartment Building",
                        "Office Building",
                        "House",
                        "Other",
                      ])}
                  </Section>
                  <dl className="grid grid-cols-2 gap-4" aria-label="Building totals">
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                      <dt className="flex items-center gap-2 text-xs font-medium text-gray-500"><Building2 size={16} />Total Floors</dt>
                      <dd className="mt-2 text-2xl font-semibold text-gray-900">{floors.length}</dd>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                      <dt className="flex items-center gap-2 text-xs font-medium text-gray-500"><Layers3 size={16} />Total Units</dt>
                      <dd className="mt-2 text-2xl font-semibold text-gray-900">{floors.reduce((total, floor) => total + floor.units.length, 0)}</dd>
                    </div>
                  </dl>
                  <Section title="Building setup">
                    <div className="flex items-center justify-end gap-4">
                      <div className="flex flex-wrap gap-2">
                      <Button onClick={() => {
                        setBuildingDraft({ totalFloors, capacity, floorMode, customLabels });
                        clearAction("custom-labels");
                        setBuildingModalOpen(true);
                      }}>
                        {floors.length ? <Pencil size={16} className="mr-2" /> : <Plus size={16} className="mr-2" />}
                        {floors.length ? "Edit Floors" : "Add Floors"}
                      </Button>
                      </div>
                    </div>
                    {floors.length > 0 && (
                      <ul aria-label="Building floors" className="flex flex-wrap gap-2">
                        {floors.map(floor => (
                          <li key={floor.id} className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-800">
                            <Building2 size={14} />{floor.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Section>
                  {floors.length > 0 && (
                    <Section title="Floor units" action={
                      <Button size="sm" onClick={() => { setUnitTargetMode("all"); setUnitTargetIds([]); setUnitModalOpen(true); }}>Customize Units</Button>
                    }>
                      <div className="divide-y divide-gray-100">
                        {floors.map(floor => (
                          <div key={floor.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{floor.label}</p>
                              {floor.units.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{floor.units.map(unit => <span key={unit.id} className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs text-sky-800">{unit.label}</span>)}</div>}
                            </div>
                            <Button size="sm" variant="outline" onClick={() => { setUnitTargetMode("specific"); setUnitTargetIds([floor.id]); setUnitModalOpen(true); }}>Customize Units</Button>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}
                  <Modal isOpen={buildingModalOpen} onClose={() => setBuildingModalOpen(false)} title={floors.length ? "Edit Floors" : "Create Floors"} maxWidth="2xl">
                    <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="Total Floors">
                        <input
                          className={control}
                          type="number"
                          min={1}
                          max={100}
                          value={buildingDraft.totalFloors}
                          onChange={e => setBuildingDraft(current => ({ ...current, totalFloors: Math.max(1, Math.min(100, Number(e.target.value))) }))}
                        />
                      </Field>
                      <Field label="Maximum Units per Floor">
                        <input
                          className={control}
                          type="number"
                          min={1}
                          max={200}
                          value={buildingDraft.capacity}
                          onChange={e => setBuildingDraft(current => ({ ...current, capacity: Math.max(1, Math.min(200, Number(e.target.value))) }))}
                        />
                      </Field>
                      <Field label="Floor Labels">
                        <select
                          className={control}
                          value={buildingDraft.floorMode}
                          onChange={(e) => setBuildingDraft(current => ({ ...current, floorMode: e.target.value }))}
                        >
                          {["Standard", "Ground + Floors", "Custom Labels"].map(
                            (o) => (
                              <option key={o}>{o}</option>
                            ),
                          )}
                        </select>
                      </Field>
                    </div>
                    {buildingDraft.floorMode === "Custom Labels" && (
                      <Field label="Exact floor labels (comma-separated)">
                        <input
                          className={control}
                          value={buildingDraft.customLabels}
                          onChange={(e) => {
                            setBuildingDraft(current => ({ ...current, customLabels: e.target.value }));
                            clearAction("custom-labels");
                          }}
                        />
                      </Field>
                    )}
                    <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setBuildingModalOpen(false)}>Cancel</Button>
                    <Button
                      onClick={() => {
                        const labels =
                          buildingDraft.floorMode === "Custom Labels"
                            ? buildingDraft.customLabels
                                .split(",")
                                .map((l) => l.trim())
                                .filter(Boolean)
                            : Array.from({ length: buildingDraft.totalFloors }, (_, i) =>
                                buildingDraft.floorMode === "Ground + Floors" && i === 0
                                  ? "Ground Floor (G)"
                                  : `Floor ${buildingDraft.floorMode === "Ground + Floors" ? i : i + 1}`,
                              );
                        if (
                          labels.length !== buildingDraft.totalFloors ||
                          new Set(labels).size !== labels.length
                        )
                          return reportAction(
                            "custom-labels",
                            "Provide one unique label for each floor.",
                          );
                        if (
                          floors.length &&
                          !window.confirm(
                            "Replace the building? Existing unit configuration will be cleared and services will require review.",
                          )
                        )
                          return;
                        changeFloors(
                          labels.map((label, i) => {
                            const floor: Floor = {
                              id: uid(),
                              label,
                              prefix:
                                buildingDraft.floorMode === "Custom Labels"
                                  ? label
                                  : buildingDraft.floorMode === "Ground + Floors"
                                    ? i === 0 ? "G" : String(i)
                                    : String(i + 1),
                              selected: true,
                              units: [],
                            };
                            floor.units = labelsFor(floor, buildingDraft.capacity).map(unitLabel => ({
                              id: uid(),
                              label: unitLabel,
                              selected: true,
                            }));
                            return floor;
                          }),
                        );
                        setTotalFloors(buildingDraft.totalFloors);
                        setCapacity(buildingDraft.capacity);
                        setFloorMode(buildingDraft.floorMode);
                        setCustomLabels(buildingDraft.customLabels);
                        setBuildingModalOpen(false);
                        setActionErrors({});
                      }}
                    >
                      <Building2 size={16} className="mr-2" />
                      {floors.length ? "Rebuild Floors" : "Create Floors"}
                    </Button>
                    </div>
                    {errorAt("custom-labels")}
                    </div>
                  </Modal>
                      <Modal isOpen={unitModalOpen} onClose={() => setUnitModalOpen(false)} title="Generate & Customize Units" maxWidth="2xl">
                        <div className="space-y-5">
                        <fieldset className="space-y-3">
                          <legend className="mb-2 text-sm font-medium text-gray-700">Generate units for</legend>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <label className="flex items-center gap-2"><input type="radio" name="unit-target" checked={unitTargetMode === "all"} onChange={() => setUnitTargetMode("all")} />All floors ({floors.length})</label>
                            <label className="flex items-center gap-2"><input type="radio" name="unit-target" checked={unitTargetMode === "specific"} onChange={() => setUnitTargetMode("specific")} />Choose floors</label>
                          </div>
                          {unitTargetMode === "specific" && (
                            <div className="qv2-floor-selection-chips">
                              {floors.map(floor => (
                                <Choice key={floor.id} checked={unitTargetIds.includes(floor.id)} onChange={() => setUnitTargetIds(current => current.includes(floor.id) ? current.filter(id => id !== floor.id) : [...current, floor.id])}>{floor.label}</Choice>
                              ))}
                            </div>
                          )}
                        </fieldset>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Numbering Pattern">
                            <select
                              className={control}
                              value={pattern}
                              onChange={(e) => setPattern(e.target.value)}
                            >
                              <option value="floor">Floor + Unit Number</option>
                              <option value="prefix">Floor Prefix</option>
                              <option value="same">
                                Same Unit Labels on Every Floor
                              </option>
                            </select>
                          </Field>
                          <Field label="Unit Starts From">
                            <input
                              className={control}
                              type="number"
                              min={0}
                              max={99999}
                              value={start}
                              onChange={(e) =>
                                setStart(
                                  Math.max(
                                    0,
                                    Math.min(99999, Number(e.target.value)),
                                  ),
                                )
                              }
                            />
                          </Field>
                          <Field label="Unit Digits">
                            <select
                              className={control}
                              value={digits}
                              onChange={(e) =>
                                setDigits(Number(e.target.value))
                              }
                            >
                              {[2, 3, 4].map((n) => (
                                <option key={n} value={n}>
                                  {n} Digits
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Separator">
                            <select
                              className={control}
                              value={separator}
                              onChange={(e) => setSeparator(e.target.value)}
                            >
                              <option value="">None</option>
                              <option value="-">Hyphen</option>
                              <option value="/">Slash</option>
                            </select>
                          </Field>
                        </div>
                        {unitTargetFloors[0] && (
                          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4" aria-live="polite">
                            <p className="text-xs font-medium text-gray-500">Example ? {unitTargetFloors[0].label}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {labelsFor(unitTargetFloors[0]).slice(0, 3).map(label => (
                                <span key={label} className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-800">{label}</span>
                              ))}
                            </div>
                            <p className="mt-2 text-xs text-gray-500">{pattern === "same" ? "Each floor uses the same unit numbers." : "Unit numbers include each floor's prefix."}</p>
                          </div>
                        )}
                        <Button
                          disabled={!unitTargetFloors.length}
                          onClick={() => { if (generate(unitTargetFloors)) setUnitModalOpen(false); }}
                        >
                          {unitTargetMode === "all" ? "Generate for All Floors" : `Generate for ${unitTargetFloors.length} ${unitTargetFloors.length === 1 ? "Floor" : "Floors"}`}
                        </Button>
                        <Button variant="outline" onClick={() => setUnitModalOpen(false)}>Cancel</Button>
                        </div>
                      </Modal>
                </>
              )}
              {step === 3 && (
                <>
                  <aside className="qv2-building-info"><Info size={18} aria-hidden="true" /><p>Select the units where work will take place. Floors are included automatically when you select their units. Your full building layout stays available in Building Details.</p></aside>
                  <dl className="grid grid-cols-2 gap-4" aria-label="Workable area totals">
                    <div className="rounded-xl border border-gray-200 bg-white p-5"><dt className="flex items-center gap-2 text-xs font-medium text-gray-500"><Building2 size={16} />Selected Floors</dt><dd className="mt-2 text-2xl font-semibold text-gray-900">{selectedFloors.length}</dd></div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5"><dt className="flex items-center gap-2 text-xs font-medium text-gray-500"><Layers3 size={16} />Selected Units</dt><dd className="mt-2 text-2xl font-semibold text-gray-900">{workable.length}</dd></div>
                  </dl>
                  <Section title="Select units" action={
                    <div className="flex items-center gap-4">
                      {hasUnits && <div className="qv2-floor-selection-actions"><button type="button" onClick={() => changeFloors(floors.map(floor => ({ ...floor, selected: !allUnitsSelected, units: floor.units.map(unit => ({ ...unit, selected: !allUnitsSelected })) })))}>{allUnitsSelected ? "Deselect all floors & units" : "Select all floors & units"}</button></div>}
                      <Button size="sm" variant="outline" onClick={() => setAreaPreviewOpen(true)}>Preview</Button>
                    </div>
                  }>
                    <div className="divide-y divide-gray-100">
                      {floors.map(floor => (
                        <div key={floor.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="text-sm font-medium text-gray-800">{floor.label}</h3>
                            <div className="qv2-floor-selection-actions">
                              {floor.units.length > 0 && <button type="button" onClick={() => updateFloor(floor.id, { units: floor.units.map(u => ({ ...u, selected: !floor.units.every(unit => unit.selected) })) })}>{floor.units.every(unit => unit.selected) ? "Deselect all" : "Select all"}</button>}
                            </div>
                          </div>
                          <div className="qv2-floor-selection-chips">
                            {floor.units.map(unit => <Choice key={unit.id} checked={unit.selected} onChange={() => updateFloor(floor.id, { units: floor.units.map(u => u.id === unit.id ? { ...u, selected: !u.selected } : u) })}>{unit.label}</Choice>)}
                          </div>
                          {!floor.units.length && <p className="text-xs text-gray-500">No units yet. Add units in Building Details.</p>}
                        </div>
                      ))}
                    </div>
                    {!floors.length && <div className="qv2-empty"><Building2 size={28} /><p>Add floors and units in Building Details to choose your workable units.</p><Button variant="outline" onClick={() => openSection(2)}>Building Details</Button></div>}
                  </Section>
                  <Modal isOpen={areaPreviewOpen} onClose={() => setAreaPreviewOpen(false)} title="Workable Area Preview" maxWidth="2xl">
                    <div className="space-y-5">
                      <p className="text-sm text-gray-500">{selectedFloors.length} floors / {workable.length} workable units</p>
                      {selectedFloors.map(floor => <div key={floor.id} className="space-y-2"><h3 className="text-sm font-semibold text-gray-800">{floor.label}</h3><div className="flex flex-wrap gap-2">{floor.units.filter(u => u.selected).map(unit => <span key={unit.id} className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm text-sky-800">{unit.label}</span>)}</div>{!floor.units.some(u => u.selected) && <p className="text-xs text-gray-500">No units selected.</p>}</div>)}
                      {!selectedFloors.length && <p className="text-sm text-gray-500">No workable areas selected.</p>}
                      <div className="flex justify-end"><Button onClick={() => setAreaPreviewOpen(false)}>Close Preview</Button></div>
                    </div>
                  </Modal>
                </>
              )}
              {step === 4 && (
                <>
                  <div className="flex justify-end">
                    <Button onClick={() => setServiceDraft({ id: uid(), title: "", description: "", rate: 0, hours: 1, units: workable.map(unit => unit.id), costs: [], reviewed: true })}><Plus size={16} className="mr-2" />Assign Service</Button>
                  </div>
                  <Section title="Assigned services">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b bg-gray-50 text-xs text-gray-500"><tr>{["Service name", "Hours", "Total floors", "Total units", "Total cost", "Actions"].map(label => <th key={label} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{label}</th>)}</tr></thead>
                        <tbody className="divide-y divide-gray-100">
                          {services.map(service => <tr key={service.id}>
                            <td className="px-4 py-4 font-medium text-gray-800">{service.title || "Untitled service"}</td>
                            <td className="px-4 py-4">{service.hours}</td>
                            <td className="px-4 py-4">{selectedFloors.filter(floor => floor.units.some(unit => unit.selected && service.units.includes(unit.id))).length}</td>
                            <td className="px-4 py-4">{totals(service).count}</td>
                            <td className="whitespace-nowrap px-4 py-4 font-semibold">{money(totals(service).hourly * service.hours + totals(service).once)}</td>
                            <td className="px-4 py-4"><div className="flex gap-2"><Button size="icon" variant="ghost" aria-label={`Edit ${service.title || "service"}`} onClick={() => setServiceDraft({ ...service, units: [...service.units], costs: service.costs.map(cost => ({ ...cost })), reviewed: true })}><Pencil size={16} /></Button><Button size="icon" variant="ghost" aria-label={`Remove ${service.title || "service"}`} onClick={() => { setServices(current => current.filter(item => item.id !== service.id)); setConfirmed(false); }}><Trash2 size={16} /></Button></div></td>
                          </tr>)}
                          {!services.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">No services assigned yet. Click Assign Service to add one.</td></tr>}
                        </tbody>
                        {services.length > 0 && <tfoot className="border-t bg-gray-50"><tr><th colSpan={4} className="px-4 py-3 font-semibold">Total cost</th><td className="whitespace-nowrap px-4 py-3 font-semibold">{money(services.reduce((sum, service) => sum + totals(service).hourly * service.hours + totals(service).once, 0))}</td><td /></tr></tfoot>}
                      </table>
                    </div>
                  </Section>
                  <Modal isOpen={Boolean(serviceDraft)} onClose={() => setServiceDraft(null)} title={services.some(service => service.id === serviceDraft?.id) ? "Edit Service" : "Assign Service"} maxWidth="5xl">
                  {serviceDraft && [serviceDraft].map((s) => (
                    <Section
                      key={s.id}
                      title="Service details"
                    >
                      <div className="grid gap-4">
                        <div className="space-y-3">
                          <div className="qv2-field">
                            <span>Service name</span>
                            <details className="relative">
                              <summary className={`${control} flex cursor-pointer list-none items-center justify-between gap-3`}>
                                <span>{s.title || "Select a service"}</span><ChevronDown size={16} />
                              </summary>
                              <div className="absolute left-0 right-0 z-10 mt-2 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                                <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-sky-800 hover:bg-sky-50" onClick={event => { setServiceMode("custom"); updateService(s.id, { title: "" }); const dropdown = event.currentTarget.closest("details"); if (dropdown) dropdown.open = false; }}><Plus size={16} />New Service</button>
                                <div className="border-t border-gray-100 pt-2">
                                  <input aria-label="Search previous services" className={control} type="search" placeholder="Search previous services" value={serviceSearch} onChange={event => setServiceSearch(event.target.value)} />
                                  <div className="mt-1 max-h-40 overflow-y-auto">
                                    {[...new Map(services.filter(service => service.title.trim()).map(service => [service.title.trim().toLowerCase(), service])).values()].filter(service => service.title.toLowerCase().includes(serviceSearch.toLowerCase())).map(service => <button type="button" key={service.id} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50" onClick={event => { setServiceMode(service.id); updateService(s.id, { title: service.title, description: service.description, rate: service.rate }); const dropdown = event.currentTarget.closest("details"); if (dropdown) dropdown.open = false; }}>{service.title}</button>)}
                                    {!services.some(service => service.title.trim() && service.title.toLowerCase().includes(serviceSearch.toLowerCase())) && <p className="px-3 py-3 text-xs text-gray-500">No previous services found.</p>}
                                  </div>
                                </div>
                              </div>
                            </details>
                          </div>
                          {serviceMode === "custom" && <Field label="New service name"><input className={control} placeholder="Enter a service name" value={s.title} onChange={event => updateService(s.id, { title: event.target.value })} /></Field>}
                        </div>
                        <Field label="Cost per unit ($)">
                          <input
                            className={control}
                            type="number"
                            min={0}
                            step="0.01"
                            value={s.rate}
                            onChange={(e) =>
                              updateService(s.id, {
                                rate: Math.max(0, Number(e.target.value)),
                              })
                            }
                          />
                          {errorAt(`service-${s.id}-rate`)}
                        </Field>
                      </div>
                      <Field label="Description">
                        <textarea
                          className={control}
                          value={s.description}
                          onChange={(e) =>
                            updateService(s.id, { description: e.target.value })
                          }
                        />
                      </Field>
                      <div className="space-y-4 rounded-xl border border-gray-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div><h3 className="text-sm font-semibold text-gray-800">Assign floors & units</h3><p className="mt-1 text-xs text-gray-500">Choose from your workable area for this service.</p></div>
                          <div className="qv2-floor-selection-actions">{workable.length > 0 && <button type="button" onClick={() => updateService(s.id, { units: workable.every(unit => s.units.includes(unit.id)) ? [] : workable.map(unit => unit.id) })}>{workable.every(unit => s.units.includes(unit.id)) ? "Deselect all floors & units" : "Select all floors & units"}</button>}</div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Search floors"><input className={control} type="search" placeholder="Floor name" value={floorSearch} onChange={event => setFloorSearch(event.target.value)} /></Field>
                          <Field label="Search units"><input className={control} type="search" placeholder="Unit name or number" value={unitSearch} onChange={event => setUnitSearch(event.target.value)} /></Field>
                        </div>
                        <div className="max-h-72 space-y-4 overflow-y-auto">
                          {selectedFloors.filter(floor => floor.label.toLowerCase().includes(floorSearch.toLowerCase())).map(floor => {
                            const units = floor.units.filter(unit => unit.selected && unit.label.toLowerCase().includes(unitSearch.toLowerCase()));
                            if (!units.length) return null;
                            const allSelected = units.every(unit => s.units.includes(unit.id));
                            const toggleUnits = () => updateService(s.id, { units: allSelected ? s.units.filter(id => !units.some(unit => unit.id === id)) : [...new Set([...s.units, ...units.map(unit => unit.id)])] });
                            return <div key={floor.id} className="space-y-3 rounded-lg bg-gray-50 p-3">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <Choice checked={allSelected} onChange={toggleUnits}><Building2 size={14} />{floor.label}</Choice>
                                <div className="qv2-floor-selection-actions"><button type="button" onClick={toggleUnits}>{allSelected ? "Deselect all" : "Select all"}{unitSearch ? " matches" : " units"}</button></div>
                              </div>
                              <div className="qv2-floor-selection-chips">{units.map(unit => <Choice key={unit.id} checked={s.units.includes(unit.id)} onChange={() => updateService(s.id, { units: s.units.includes(unit.id) ? s.units.filter(id => id !== unit.id) : [...s.units, unit.id] })}>{unit.label}</Choice>)}</div>
                            </div>;
                          })}
                          {!selectedFloors.some(floor => floor.label.toLowerCase().includes(floorSearch.toLowerCase()) && floor.units.some(unit => unit.selected && unit.label.toLowerCase().includes(unitSearch.toLowerCase()))) && <p className="py-4 text-sm text-gray-500">{workable.length ? "No matching floors or units." : "Select workable units in Workable Area first."}</p>}
                        </div>
                        <p className="text-xs text-gray-500">{selectedFloors.filter(floor => floor.units.some(unit => unit.selected && s.units.includes(unit.id))).length} floors / {totals(s).count} units assigned</p>
                      </div>
                      <p className="rounded-lg bg-sky-50 p-4 text-sm font-semibold text-sky-900">Total cost: {money(totals(s).hourly * s.hours + totals(s).once)}</p>
                      <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setServiceDraft(null)}>Cancel</Button>
                        <Button onClick={() => {
                          setServices(current => current.some(service => service.id === s.id) ? current.map(service => service.id === s.id ? { ...s, reviewed: true } : service) : [...current, { ...s, reviewed: true }]);
                          setConfirmed(false);
                          setComplete(false);
                          setServiceDraft(null);
                        }}>{services.some(service => service.id === s.id) ? "Save Changes" : "Assign Service"}</Button>
                      </div>
                    </Section>
                  ))}
                  </Modal>
                </>
              )}
              {step === 5 && (
                <>
                  <div className="qv2-quote-cover">
                    <div className="qv2-quote-cover-top">
                      <span><FileText size={16} />QUOTATION</span>
                      <div className="flex items-center gap-2">
                        <span className="qv2-quote-badge">Draft preview</span>
                      </div>
                    </div>
                    <h2>{info.project || "Untitled project"}</h2>
                    <p>{info.company || "Company details not added"}</p>
                    <div className="qv2-quote-metrics">
                      <div><strong>{selectedFloors.length}</strong><span>Workable floors</span></div>
                      <div><strong>{workable.length}</strong><span>Workable units</span></div>
                      <div><strong>{services.length}</strong><span>Assigned services</span></div>
                    </div>

                  </div>

                  {pdfMessage && (
                    <div
                      className={`flex items-center gap-2 rounded-xl p-4 text-sm ${
                        pdfMessage.type === 'success'
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border border-red-200 bg-red-50 text-red-800'
                      }`}
                    >
                      {pdfMessage.type === 'success' ? <CheckCircle2 size={18} /> : <Info size={18} />}
                      <span>{pdfMessage.text}</span>
                    </div>
                  )}

                  <Section title="Client & project" action={<Button size="sm" variant="ghost" onClick={() => openSection(0)}><Pencil size={14} className="mr-2" />Edit details</Button>}>
                    <div className="qv2-quote-detail-columns">
                      <div><h3>Client information</h3><dl className="qv2-quote-details">{Object.entries({ "Client": info.client, "Phone": info.phone, "Email": info.email, "Address": info.address }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Not provided"}</dd></div>)}</dl></div>
                      <div><h3>Project information</h3><dl className="qv2-quote-details">{Object.entries({ "Project type": info.projectType, "Property": info.propertyType, "Building": info.buildingType, "Start date": info.start, "End date": info.end }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Not provided"}</dd></div>)}</dl></div>
                    </div>
                  </Section>

                  <Section
                    title="Quotation details & scope"
                    description="Specifications, scope of work, warranty, and payment terms."
                    action={<Button size="sm" variant="ghost" onClick={() => openSection(1)}><Pencil size={14} className="mr-2" />Edit details</Button>}
                  >
                    {quotationDetails.length > 0 ? (
                      <div className="qv2-quote-details-rendered rounded-xl border border-gray-150 bg-gray-50/70 p-5">
                        <QuotationDetailsPreview blocks={quotationDetails} />
                      </div>
                    ) : (
                      <div className="qv2-quote-empty">
                        <p>No quotation details added yet.</p>
                        <Button size="sm" variant="outline" className="mt-2" onClick={() => openSection(1)}>
                          Write Quotation Details
                        </Button>
                      </div>
                    )}
                  </Section>

                  <Section title="Work areas" action={<Button size="sm" variant="ghost" onClick={() => openSection(3)}><Pencil size={14} className="mr-2" />Edit areas</Button>}>
                    <p className="qv2-quote-muted">{selectedFloors.length} of {floors.length} building floors included in this quotation.</p>
                    <div className="qv2-quote-areas">
                      {selectedFloors.map(floor => <details key={floor.id} className="qv2-quote-area"><summary><span><Building2 size={15} />{floor.label}</span><span>{floor.units.filter(unit => unit.selected).length} units<ChevronDown size={15} /></span></summary><div>{floor.units.filter(unit => unit.selected).map(unit => <span key={unit.id}>{unit.label}</span>)}</div></details>)}
                    </div>
                    {!selectedFloors.length && <p className="qv2-quote-empty">No work areas selected yet.</p>}
                  </Section>
                  <Section title="Services & pricing" action={<Button size="sm" variant="ghost" onClick={() => openSection(4)}><Pencil size={14} className="mr-2" />Edit services</Button>}>
                    <div className="qv2-quote-table-wrap">
                      <table className="qv2-quote-table">
                        <caption className="sr-only">Itemized quotation services and pricing in US dollars</caption>
                        <thead><tr><th scope="col">Service</th><th scope="col">Cost / unit</th><th scope="col">Units</th><th scope="col">Amount</th></tr></thead>
                        <tbody>{services.map(service => <tr key={service.id}><td><strong>{service.title || "Untitled service"}</strong>{service.description && <p>{service.description}</p>}<details className="qv2-quote-assignments"><summary>View assigned units</summary><div>{selectedFloors.map(floor => { const units = floor.units.filter(unit => unit.selected && service.units.includes(unit.id)); return units.length ? <p key={floor.id}><strong>{floor.label}:</strong> {units.map(unit => unit.label).join(", ")}</p> : null; })}{!totals(service).count && <p>No units assigned.</p>}</div></details></td><td>{money(service.rate)}</td><td>{totals(service).count}</td><td>{money(totals(service).hourly * service.hours + totals(service).once)}</td></tr>)}</tbody>
                        {services.length > 0 && <tfoot><tr><th colSpan={3} scope="row">Total cost</th><td>{money(quotationTotal)}</td></tr></tfoot>}
                      </table>
                      {!services.length && <p className="qv2-quote-empty">No services assigned yet.</p>}
                    </div>
                  </Section>
                  <div className="qv2-quote-preview-note"><Info size={16} /><p>This is a live preview. Use "Download PDF" to save a branded PDF document or "Send to Client Email" to email it directly.</p></div>
                </>
              )}
            </main>
            {step === 5 && <aside className="qv2-sidebar qv2-quote-sidebar">
              <div className="qv2-quote-total">
                <span className="qv2-quote-total-label">Quotation total</span>
                <p>{money(quotationTotal)}</p><span className="qv2-quote-currency">USD</span>
                <dl><div><dt>Services</dt><dd>{services.length}</dd></div><div><dt>Assigned unit cost</dt><dd>{money(hourly)}</dd></div>{once > 0 && <div><dt>One-time charges</dt><dd>{money(once)}</dd></div>}</dl>
                <p className="qv2-quote-rate-note">The base cost applies to each assigned unit.</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs space-y-3">
                <div>
                  <h4 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">Export & Client Delivery</h4>
                  <p className="text-xs text-gray-500 mt-1">Generate a branded PDF or deliver directly to {info.client ? `${info.client}'s email` : 'client email'}.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full justify-center text-xs"
                    onClick={() => void saveQuotation().catch(() => undefined)}
                    disabled={isCreatingQuote || isUpdatingQuote || currentQuote?.status === "converted"}
                  >
                    {(isCreatingQuote || isUpdatingQuote) ? <Loader2 size={14} className="mr-2 animate-spin" /> : <FileEdit size={14} className="mr-2" />}
                    {currentQuote ? "Save Changes" : "Save Draft"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-center text-xs"
                    onClick={handleDownloadPdf}
                    disabled={isDownloadingPdf}
                  >
                    {isDownloadingPdf ? (
                      <>
                        <Loader2 size={14} className="mr-2 animate-spin" />
                        Exporting PDF...
                      </>
                    ) : (
                      <>
                        <Download size={14} className="mr-2" />
                        Download PDF
                      </>
                    )}
                  </Button>
                  <Button
                    className="w-full justify-center text-xs bg-sky-800 hover:bg-sky-900"
                    onClick={() => {
                      setRecipientEmail(info.email || '');
                      setEmailStatus(null);
                      setEmailModalOpen(true);
                    }}
                  >
                    <Mail size={14} className="mr-2" />
                    Send to Client Email
                  </Button>
                  <Button
                    className="w-full justify-center text-xs"
                    onClick={() => void handlePersistedSend()}
                    disabled={isSendingQuote || isCreatingQuote || isUpdatingQuote || currentQuote?.status === "converted"}
                  >
                    {isSendingQuote ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Send size={14} className="mr-2" />}
                    Save & Send Tracked Quote
                  </Button>
                  <Button
                    className="w-full justify-center bg-emerald-700 text-xs hover:bg-emerald-800"
                    onClick={() => void handleConvertToProject()}
                    disabled={isConvertingQuote || isCreatingQuote || isUpdatingQuote || currentQuote?.status === "converted"}
                  >
                    {isConvertingQuote ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Building2 size={14} className="mr-2" />}
                    {currentQuote?.status === "converted" ? "Project Created" : "Accept & Create Project"}
                  </Button>
                </div>
              </div>

              <div className="qv2-quote-checklist"><h3>Ready to review</h3><p>Check the client details, quotation scope, work areas, and service pricing before confirming or sending.</p><Button variant="outline" onClick={() => openSection(4)}>Review services<ArrowRight size={14} className="ml-2" /></Button></div>
            </aside>}
          </div>

          <Modal
            isOpen={emailModalOpen}
            onClose={() => {
              if (!isSendingEmail) {
                setEmailModalOpen(false);
                setEmailStatus(null);
              }
            }}
            title="Send Quotation to Client Email"
            maxWidth="lg"
          >
            <div className="space-y-4">
              <div className="rounded-lg border border-sky-100 bg-sky-50/70 p-3.5 text-xs text-sky-900">
                <p className="font-semibold text-sky-950">Branded PDF Delivery</p>
                <p className="mt-1 text-sky-750">
                  A professional PDF quotation for <strong>{info.project || 'Project'}</strong> will be generated and delivered directly to the client as an attachment.
                </p>
              </div>

              <Field label="Client Name">
                <input
                  className={control}
                  readOnly
                  value={info.client || 'Not specified'}
                />
              </Field>

              <Field label="Recipient Email Address *">
                <input
                  type="email"
                  className={control}
                  placeholder="client@example.com"
                  value={recipientEmail}
                  onChange={(e) => {
                    setRecipientEmail(e.target.value);
                    setEmailStatus(null);
                  }}
                  autoFocus
                />
              </Field>

              <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
                <p><strong>Subject:</strong> Quotation - {info.project || 'Project'}</p>
                <p><strong>Attachment:</strong> quotation.pdf (includes client info, work areas, pricing, and quotation details)</p>
              </div>

              {emailStatus && (
                <div
                  className={`flex items-start gap-2 rounded-lg p-3 text-xs ${
                    emailStatus.type === 'success'
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border border-red-200 bg-red-50 text-red-800'
                  }`}
                >
                  {emailStatus.type === 'success' ? (
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  ) : (
                    <Info size={16} className="mt-0.5 shrink-0 text-red-600" />
                  )}
                  <span>{emailStatus.text}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEmailModalOpen(false);
                    setEmailStatus(null);
                  }}
                  disabled={isSendingEmail}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail}
                  className="bg-sky-800 hover:bg-sky-900"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Sending Quotation...
                    </>
                  ) : (
                    <>
                      <Send size={16} className="mr-2" />
                      Send Quotation
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Modal>

          {sectionSaved && step < 5 && <p role="status" className="qv2-saved"><CheckCircle2 size={16} />Section saved for this session.</p>}
          <div className="qv2-footer">
            {(step === 5) && <Button
              variant="outline"
              onClick={() => {
                openSection(4);
                setActionErrors({});
                setConfirmed(false);
              }}
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Services
            </Button>}
            <span className="hidden text-sm text-gray-400 sm:block">
              {steps[step]}
            </span>
            {step < 5 ? (
              <Button onClick={next}>
                {sectionSaved ? "Saved" : "Save Section"}
                <ArrowRight size={16} className="ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setComplete(true);
                }}
              >
                <CheckCircle2 size={16} className="mr-2" />
                Confirm Preview
              </Button>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
