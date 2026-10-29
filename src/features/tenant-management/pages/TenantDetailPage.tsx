import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, CalendarClock, Globe2, Mail, ShieldCheck, Users } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { useAppSelector } from '@/store/hooks';
import { selectAuthToken } from '@/store/authSlice';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { getTenantById, type TenantDetailApi } from '../services/subscriptionApi';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = useAppSelector(selectAuthToken);
  const [tenant, setTenant] = useState<TenantDetailApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!id) {
      setError('Tenant ID is missing.');
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    setError(null);
    void getTenantById(id, token || undefined)
      .then((response) => {
        if (active) setTenant(response.data);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load tenant details.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [id, token]);

  if (loading) {
    return <Card className="p-10 text-center text-sm text-gray-500">Loading tenant details...</Card>;
  }

  if (error || !tenant) {
    return (
      <Card className="p-10 text-center">
        <h2 className="text-lg font-bold text-gray-900">Unable to open tenant</h2>
        <p className="mt-2 text-sm text-gray-500">{error ?? 'Tenant not found.'}</p>
        <Link to={ROUTES.TENANTS}><Button className="mt-5">Back to tenants</Button></Link>
      </Card>
    );
  }

  const subscriptionStatus = tenant.subscription?.status ?? 'none';

  return (
    <div className="space-y-6">
      <PageHeader title={tenant.name} description="Tenant subscription, usage, companies, and administrators" icon={Building2}>
        <Link to={ROUTES.TENANTS}>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to tenants</Button>
        </Link>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5"><div className="text-xs font-bold uppercase text-gray-400">Plan</div><div className="mt-2 text-xl font-black">{tenant.plan?.name ?? 'N/A'}</div></Card>
        <Card className="p-5"><div className="text-xs font-bold uppercase text-gray-400">Subscription</div><Badge className="mt-2 capitalize">{subscriptionStatus.replace('_', ' ')}</Badge></Card>
        <Card className="p-5"><div className="text-xs font-bold uppercase text-gray-400">Billing interval</div><div className="mt-2 text-xl font-black capitalize">{tenant.subscription?.planInterval ?? '—'}</div></Card>
        <Card className="p-5"><div className="text-xs font-bold uppercase text-gray-400">Billed amount</div><div className="mt-2 text-xl font-black">{formatMoney(tenant.subscription?.billedAmount)}</div></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-black text-gray-900">Tenant information</h3>
          <div className="mt-5 space-y-4 text-sm">
            <div className="flex items-center gap-3"><Globe2 className="h-4 w-4 text-gray-400" /><span>{tenant.domain || 'No domain'}</span></div>
            <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-gray-400" /><span>{tenant.billingEmail || 'No billing email'}</span></div>
            <div className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-gray-400" /><Badge className="capitalize">{tenant.status}</Badge></div>
            <div className="flex items-center gap-3"><CalendarClock className="h-4 w-4 text-gray-400" /><span>{formatDate(tenant.subscription?.currentPeriodStart)} — {formatDate(tenant.subscription?.currentPeriodEnd)}</span></div>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-black text-gray-900">Plan usage</h3>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {(['companies', 'projects', 'users'] as const).map((key) => (
              <div key={key} className="rounded-2xl bg-gray-50 p-4 text-center">
                <div className="text-xl font-black">{tenant.usage?.[key]?.used ?? 0}</div>
                <div className="mt-1 text-xs capitalize text-gray-500">{key} / {tenant.usage?.[key]?.max ?? 'Unlimited'}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b p-6"><h3 className="flex items-center gap-2 font-black"><Building2 className="h-5 w-5" />Companies ({tenant.companies?.length ?? 0})</h3></div>
        <div className="divide-y">
          {tenant.companies?.length ? tenant.companies.map((company) => (
            <div key={company.id} className="flex items-center justify-between p-5"><div><div className="font-bold">{company.name}</div><div className="text-xs text-gray-500">{company._count?.projects ?? 0} projects</div></div><Badge>{company.isActive ? 'Active' : 'Inactive'}</Badge></div>
          )) : <div className="p-6 text-sm text-gray-500">No companies found.</div>}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b p-6"><h3 className="flex items-center gap-2 font-black"><Users className="h-5 w-5" />Administrators ({tenant.users?.length ?? 0})</h3></div>
        <div className="divide-y">
          {tenant.users?.length ? tenant.users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-5"><div><div className="font-bold">{user.fullName}</div><div className="text-xs text-gray-500">{user.email}</div></div><Badge className="capitalize">{user.status}</Badge></div>
          )) : <div className="p-6 text-sm text-gray-500">No administrators found.</div>}
        </div>
      </Card>
    </div>
  );
}
