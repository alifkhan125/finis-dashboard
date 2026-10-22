import { useEffect, useState, useRef } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { Select } from '@/shared/components/ui/Select';
import { Camera, Building2, Globe, Mail, Phone, MapPin } from 'lucide-react';
import { Company } from '@/shared/types';
import { useCreateCompanyMutation, useGetAdminsQuery, useUpdateCompanyMutation } from '@/store/companiesApi';
import { useMeQuery } from '@/store/authApi';

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCompany: (company: Partial<Company>) => void;
}

type CreateCompanyPayload = Partial<Company> & { ownerId: string };

const EMPTY_FORM = {
  name: '',
  industry: '',
  description: '',
  website: '',
  phone: '',
  email: '',
  size: '',
  address: '',
  logoUrl: '',
};

export function CreateCompanyModal({ isOpen, onClose, onCreateCompany }: CreateCompanyModalProps) {
  const [createCompanyMutation, { isLoading: isCreating }] = useCreateCompanyMutation();
  const [updateCompanyMutation] = useUpdateCompanyMutation();
  const { data: me } = useMeQuery();
  const isSuperAdmin = me?.role === 'super_admin';
  const { data: admins } = useGetAdminsQuery({ role: 'admin' }, {
    skip: !isOpen || !isSuperAdmin,
  });

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [ownerId, setOwnerId] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<{ name?: string; ownerId?: string; server?: string }>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!ownerId && me?.id) {
      setOwnerId(me.id);
    }
  }, [me?.id, ownerId]);

  // ── Helpers ──────────────────────────────────────────────────────────
  const set = (field: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((s) => ({ ...s, [field]: e.target.value }));
      if (field === 'name') setErrors((s) => ({ ...s, name: undefined }));
    };

  const setSelect = (field: keyof typeof EMPTY_FORM) =>
    (e: { target: { value: string; name?: string } }) => {
      setFormData((s) => ({ ...s, [field]: e.target.value }));
    };

  const resolveOwnerId = (): string | undefined => {
    if (ownerId) return ownerId;
    if (me?.id) return me.id;
    return undefined;
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!formData.name.trim()) next.name = 'Company name is required.';
    if (!resolveOwnerId()) next.ownerId = 'Owner is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const formatServerError = (err: any): string => {
    const data = err?.data ?? err?.response?.data ?? err?.error ?? err;
    const fieldLabels: Record<string, string> = {
      name: 'Company name', ownerId: 'Owner', email: 'Email',
      phone: 'Phone', website: 'Website', address: 'Address',
      companySize: 'Company size',
    };
    const translate = (msg: string) => {
      if (!msg) return '';
      if (/ownerId/i.test(msg) && /required|empty|must be/i.test(msg)) return 'Owner is required.';
      if (/must be an email|is not an email/i.test(msg)) return 'Please enter a valid email address.';
      if (/should not be empty|must not be empty/i.test(msg)) return 'This field cannot be empty.';
      if (/must be enum value/i.test(msg)) return 'Please select a valid option.';
      return msg.replace(/\[|\]|\"/g, '');
    };

    if (data && Array.isArray(data.message) && data.message.length > 0) {
      return data.message.map((item: any) => {
        if (typeof item === 'string') return translate(item);
        if (item?.constraints) {
          const label = fieldLabels[item.property] ?? item.property ?? '';
          const msgs = Object.values(item.constraints).map((m: any) => translate(String(m)));
          return `${label}: ${msgs.join(', ')}`.trim();
        }
        return '';
      }).filter(Boolean).join('\n');
    }
    if (data && typeof data.message === 'string') return translate(data.message);
    if (data?.error) return String(data.error);
    if (err?.message) return String(err.message);
    return 'Something went wrong. Please try again.';
  };

  const resetAndClose = () => {
    setFormData(EMPTY_FORM);
    setLogoFile(null);
    setOwnerId(undefined);
    setErrors({});
    onClose();
  };

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors((s) => ({ ...s, server: undefined }));
    if (!validate()) return;

    const resolvedOwnerId = resolveOwnerId()!;

    try {
      let created: any;

      const payload: CreateCompanyPayload = {
        name: formData.name.trim(),
        ownerId: resolvedOwnerId,
        ...(formData.industry    && { industry:    formData.industry }),
        ...(formData.description && { description: formData.description }),
        ...(formData.phone       && { phone:       formData.phone }),
        ...(formData.email       && { email:       formData.email }),
        ...(formData.website     && { website:     formData.website }),
        ...(formData.address     && { address:     formData.address }),
        ...(formData.size        && { companySize: formData.size }),
      };
      
      // 1. Create the company instantly using JSON payload
      created = await createCompanyMutation(payload).unwrap();

      // 2. Upload the logo in the background if selected
      if (logoFile && created?.id) {
        const fd = new FormData();
        fd.append('logo', logoFile as Blob);
        
        // Fire and forget (runs in background without blocking UI)
        updateCompanyMutation({ id: created.id, data: fd }).unwrap()
          .catch(err => console.error('Failed to upload background logo:', err));
      }

      onCreateCompany(created);
      resetAndClose();
    } catch (err: any) {
      console.error('Create company failed', err);
      setErrors((s) => ({ ...s, server: formatServerError(err) }));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Add New Company" className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Server error */}
        {errors.server && (
          <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <span className="mt-0.5 text-red-500 text-base leading-none">⚠</span>
            <p className="text-sm text-red-700 font-medium whitespace-pre-wrap">{errors.server}</p>
          </div>
        )}

        {/* Logo & Basic Info */}
        <div className="flex gap-6 items-start">
          {/* Logo upload */}
          <div className="space-y-2">
            <label className="text-sm font-black text-[#1D4F6D] uppercase tracking-widest">Logo</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="h-32 w-32 rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group overflow-hidden relative"
            >
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setLogoFile(f);
                  setFormData((s) => ({ ...s, logoUrl: URL.createObjectURL(f) }));
                }}
              />
              {formData.logoUrl ? (
                <img src={formData.logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <>
                  <Camera className="h-8 w-8 text-gray-400 group-hover:text-blue-500 mb-2" />
                  <span className="text-[10px] font-bold text-gray-400 group-hover:text-blue-500 uppercase">Upload</span>
                </>
              )}
            </div>
          </div>

          {/* Name / Owner / Industry */}
          <div className="flex-1 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-black text-[#1D4F6D] uppercase tracking-widest flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Company Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Acme Construction"
                value={formData.name}
                onChange={set('name')}
                className={`h-12 rounded-xl text-sm font-medium ${errors.name ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : ''}`}
              />
              {errors.name && <p className="text-xs text-red-600 font-medium">{errors.name}</p>}
            </div>

            {/* Owner */}
            <div className="space-y-1.5">
              <label className="text-sm font-black text-[#1D4F6D] uppercase tracking-widest">
                Owner <span className="text-red-500">*</span>
              </label>
              <Select
                placeholder={me?.fullName ? `Current user: ${me.fullName}` : 'Assign to current user'}
                options={[
                  { label: me?.fullName ? `Current user: ${me.fullName}` : 'Assign to current user', value: '' },
                  ...(isSuperAdmin ? admins?.map((a) => ({ label: `${a.fullName} — ${a.email}`, value: a.id })) ?? [] : []),
                ]}
                value={ownerId ?? ''}
                onChange={(e) => {
                  setOwnerId(e.target.value || undefined);
                  setErrors((s) => ({ ...s, ownerId: undefined }));
                }}
                className={`h-12 rounded-xl text-sm font-medium w-full ${errors.ownerId ? 'border-red-400' : 'border-gray-200'}`}
              />
              {errors.ownerId && <p className="text-xs text-red-600 font-medium">{errors.ownerId}</p>}
            </div>

            {/* Industry */}
            <div className="space-y-1.5">
              <label className="text-sm font-black text-[#1D4F6D] uppercase tracking-widest">Industry</label>
              <Select
                placeholder="Select industry"
                options={[
                  { label: 'Construction', value: 'construction' },
                  { label: 'Architecture', value: 'architecture' },
                  { label: 'Engineering', value: 'engineering' },
                  { label: 'Supplier', value: 'supplier' },
                ]}
                value={formData.industry}
                onChange={setSelect('industry')}
                className="h-12 rounded-xl text-sm font-medium"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-black text-[#1D4F6D] uppercase tracking-widest">Description</label>
          <textarea
            className="flex min-h-[80px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
            placeholder="Brief description of the company..."
            value={formData.description}
            onChange={set('description')}
          />
        </div>

        {/* Website + Size */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-black text-[#1D4F6D] uppercase tracking-widest flex items-center gap-2">
              <Globe className="h-4 w-4" /> Website
            </label>
            <Input placeholder="https://" value={formData.website} onChange={set('website')} className="h-12 rounded-xl text-sm font-medium" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-black text-[#1D4F6D] uppercase tracking-widest">Company Size</label>
            <Select
              placeholder="Select size"
              options={[
                { label: '1–10 Employees', value: 'small' },
                { label: '11–50 Employees', value: 'medium' },
                { label: '50+ Employees', value: 'large' },
              ]}
              value={formData.size}
              onChange={setSelect('size')}
              className="h-12 rounded-xl text-sm font-medium"
            />
          </div>
        </div>

        {/* Phone + Email */}
        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100">
          <div className="space-y-1.5">
            <label className="text-sm font-black text-[#1D4F6D] uppercase tracking-widest flex items-center gap-2">
              <Phone className="h-4 w-4" /> Phone
            </label>
            <Input placeholder="+1 (555) 000-0000" value={formData.phone} onChange={set('phone')} className="h-12 rounded-xl text-sm font-medium" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-black text-[#1D4F6D] uppercase tracking-widest flex items-center gap-2">
              <Mail className="h-4 w-4" /> Email
            </label>
            <Input type="email" placeholder="contact@company.com" value={formData.email} onChange={set('email')} className="h-12 rounded-xl text-sm font-medium" />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-1.5 pt-4 border-t border-gray-100">
          <label className="text-sm font-black text-[#1D4F6D] uppercase tracking-widest flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Business Address
          </label>
          <Input placeholder="123 Business St, City, State, Zip" value={formData.address} onChange={set('address')} className="h-12 rounded-xl text-sm font-medium" />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={resetAndClose} className="h-11 px-6 rounded-xl font-bold">
            Cancel
          </Button>
          <Button type="submit" disabled={isCreating} className="h-11 px-8 rounded-xl bg-[#1D4F6D] hover:bg-[#153a50] text-white font-bold shadow-lg shadow-blue-900/10">
            {isCreating ? 'Creating...' : 'Create Company'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
