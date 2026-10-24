import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Trash2, DollarSign, RefreshCw } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Badge } from '@/shared/components/ui/Badge';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { useAppSelector } from '@/store/hooks';
import { selectAuthToken, selectAuthUser } from '@/store/authSlice';
import { PublicSubscriptionPlansPage } from './PublicSubscriptionPlansPage';
import {
  createPlan,
  deletePlan,
  getPlans,
  updatePlan,
  type SubscriptionPlanApi,
} from '../services/subscriptionApi';

function normalizeFeatureList(plan: SubscriptionPlanApi) {
  return [
    plan.hasGeofencing ? 'Geofencing' : null,
    plan.hasAdvancedReporting ? 'Advanced reporting' : null,
    plan.hasCustomReporting ? 'Custom reporting' : null,
    plan.hasWhiteLabel ? 'White label' : null,
    plan.supportLevel ? `Support: ${plan.supportLevel}` : null,
  ].filter(Boolean) as string[];
}

type PlanFormState = {
  name: string;
  priceMonthly: string;
  priceYearly: string;
  maxCompanies: string;
  maxProjects: string;
  maxUsers: string;
  supportLevel: string;
  hasGeofencing: boolean;
  hasAdvancedReporting: boolean;
  hasCustomReporting: boolean;
  hasWhiteLabel: boolean;
  isActive: boolean;
  visibility: 'public' | 'private';
};

const initialForm: PlanFormState = {
  name: '',
  priceMonthly: '0',
  priceYearly: '0',
  maxCompanies: '',
  maxProjects: '',
  maxUsers: '',
  supportLevel: 'standard',
  hasGeofencing: false,
  hasAdvancedReporting: false,
  hasCustomReporting: false,
  hasWhiteLabel: false,
  isActive: true,
  visibility: 'public',
};

export function SubscriptionPlansPage() {
  const token = useAppSelector(selectAuthToken);
  const authUser = useAppSelector(selectAuthUser);
  const isSuperAdmin = authUser?.role === 'super_admin';

  const [plans, setPlans] = useState<SubscriptionPlanApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanApi | null>(null);
  const [form, setForm] = useState<PlanFormState>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadPlans = async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      const response = await getPlans(token || undefined);
      setPlans(response.data.plans);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      void loadPlans();
    }
  }, [token, isSuperAdmin]);

  const stats = useMemo(() => {
    const active = plans.filter((p) => p.isActive).length;
    const average = plans.length
      ? Math.round(plans.reduce((sum, p) => sum + (p.priceMonthly || 0), 0) / plans.length)
      : 0;
    return { total: plans.length, active, average };
  }, [plans]);

  if (!isSuperAdmin) {
    return <PublicSubscriptionPlansPage isDashboardView={true} />;
  }

  const openCreate = () => {
    setEditingPlan(null);
    setFormError('');
    setForm(initialForm);
    setFormOpen(true);
  };

  const openEdit = (plan: SubscriptionPlanApi) => {
    setEditingPlan(plan);
    setFormError('');
    setForm({
      name: plan.name,
      priceMonthly: String(plan.priceMonthly ?? 0),
      priceYearly: String(plan.priceYearly ?? 0),
      maxCompanies: plan.maxCompanies === null || plan.maxCompanies === undefined ? '' : String(plan.maxCompanies),
      maxProjects: plan.maxProjects === null || plan.maxProjects === undefined ? '' : String(plan.maxProjects),
      maxUsers: plan.maxUsers === null || plan.maxUsers === undefined ? '' : String(plan.maxUsers),
      supportLevel: plan.supportLevel ?? 'standard',
      hasGeofencing: Boolean(plan.hasGeofencing),
      hasAdvancedReporting: Boolean(plan.hasAdvancedReporting),
      hasCustomReporting: Boolean(plan.hasCustomReporting),
      hasWhiteLabel: Boolean(plan.hasWhiteLabel),
      isActive: Boolean(plan.isActive),
      visibility: plan.visibility ?? 'public',
    });
    setFormOpen(true);
  };

  const submitForm = async () => {
    const payload = {
      name: form.name.trim(),
      priceMonthly: Number(form.priceMonthly || 0),
      priceYearly: form.priceYearly === '' ? undefined : Number(form.priceYearly || 0),
      maxCompanies: form.maxCompanies === '' ? undefined : Number(form.maxCompanies),
      maxProjects: form.maxProjects === '' ? undefined : Number(form.maxProjects),
      maxUsers: form.maxUsers === '' ? undefined : Number(form.maxUsers),
      hasGeofencing: form.hasGeofencing,
      hasAdvancedReporting: form.hasAdvancedReporting,
      hasCustomReporting: form.hasCustomReporting,
      hasWhiteLabel: form.hasWhiteLabel,
      supportLevel: form.supportLevel.trim() || undefined,
      isActive: form.isActive,
      visibility: form.visibility,
    };

    setIsSaving(true);
    setFormError('');
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, payload, token || undefined);
      } else {
        await createPlan(payload, token || undefined);
      }
      setFormOpen(false);
      setEditingPlan(null);
      setForm(initialForm);
      await loadPlans();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save subscription plan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this plan?')) return;
    await deletePlan(id, token || undefined);
    await loadPlans();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Center"
        description="Manage subscription tiers, pricing, and package performance"
        icon={DollarSign}
      >
        <Button variant="outline" onClick={loadPlans}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Plan
        </Button>
      </PageHeader>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="text-sm text-gray-600">Total Plans</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-gray-600">Active Plans</div>
          <div className="text-3xl font-bold text-green-600 mt-2">{stats.active}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-gray-600">Average Monthly Price</div>
          <div className="text-3xl font-bold text-purple-600 mt-2">${stats.average}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="text-sm text-gray-500">Loading plans...</div>
        ) : (
          plans.map((plan) => (
            <Card key={plan.id} className={`p-6 ${!plan.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <Badge className={plan.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {plan.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <Badge className={plan.visibility === 'private' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}>
                  {plan.visibility === 'private' ? 'Private' : 'Public'}
                </Badge>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">${plan.priceMonthly}</span>
                  <span className="text-gray-600">/ monthly</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Yearly: ${plan.priceYearly ?? 0}
                </div>
              </div>
              <div className="space-y-2 mb-6 text-sm">
                {normalizeFeatureList(plan).length > 0 ? (
                  normalizeFeatureList(plan).map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      <span>{feature}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400">No extra features configured</div>
                )}
              </div>
              <div className="border-t pt-4 mb-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Companies:</span>
                  <span className="font-semibold">
                    {plan.maxCompanies === null || plan.maxCompanies === undefined ? 'Unlimited' : plan.maxCompanies}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Projects:</span>
                  <span className="font-semibold">
                    {plan.maxProjects === null || plan.maxProjects === undefined ? 'Unlimited' : plan.maxProjects}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Users:</span>
                  <span className="font-semibold">
                    {plan.maxUsers === null || plan.maxUsers === undefined ? 'Unlimited' : plan.maxUsers}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => openEdit(plan)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button variant="outline" onClick={() => handleDelete(plan.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
        maxWidth="2xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formError && <div className="md:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Plan Name</label>
            <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Visibility *</label>
            <select
              required
              value={form.visibility}
              onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value as 'public' | 'private' }))}
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
            >
              <option value="public">Public </option>
              <option value="private">Private </option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Monthly Price</label>
            <Input type="number" value={form.priceMonthly} onChange={(e) => setForm((prev) => ({ ...prev, priceMonthly: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Yearly Price</label>
            <Input type="number" value={form.priceYearly} onChange={(e) => setForm((prev) => ({ ...prev, priceYearly: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Max Companies</label>
            <Input type="number" value={form.maxCompanies} onChange={(e) => setForm((prev) => ({ ...prev, maxCompanies: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Max Projects</label>
            <Input type="number" value={form.maxProjects} onChange={(e) => setForm((prev) => ({ ...prev, maxProjects: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Max Users</label>
            <Input type="number" value={form.maxUsers} onChange={(e) => setForm((prev) => ({ ...prev, maxUsers: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Support Level</label>
            <Input value={form.supportLevel} onChange={(e) => setForm((prev) => ({ ...prev, supportLevel: e.target.value }))} />
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
            <input type="checkbox" checked={form.hasGeofencing} onChange={(e) => setForm((prev) => ({ ...prev, hasGeofencing: e.target.checked }))} />
            <span className="text-sm font-medium">Geofencing</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
            <input type="checkbox" checked={form.hasAdvancedReporting} onChange={(e) => setForm((prev) => ({ ...prev, hasAdvancedReporting: e.target.checked }))} />
            <span className="text-sm font-medium">Advanced Reporting</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
            <input type="checkbox" checked={form.hasCustomReporting} onChange={(e) => setForm((prev) => ({ ...prev, hasCustomReporting: e.target.checked }))} />
            <span className="text-sm font-medium">Custom Reporting</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
            <input type="checkbox" checked={form.hasWhiteLabel} onChange={(e) => setForm((prev) => ({ ...prev, hasWhiteLabel: e.target.checked }))} />
            <span className="text-sm font-medium">White Label</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 md:col-span-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
            <span className="text-sm font-medium">Active</span>
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button onClick={submitForm} disabled={isSaving}>{isSaving ? 'Saving...' : editingPlan ? 'Save Changes' : 'Create Plan'}</Button>
        </div>
      </Modal>
    </div>
  );
}
