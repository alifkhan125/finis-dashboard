import { useEffect, useState, useCallback } from 'react';
import { Check, ShieldCheck, Rocket, Building2, CreditCard } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { selectAuthToken, selectAuthUser } from '@/store/authSlice';
import { useAppSelector } from '@/store/hooks';
import { getMySubscription, getPublicPlans, type SubscriptionPlanApi } from '../services/subscriptionApi';
import { StripePaymentModal } from '../components/StripePaymentModal';

function featureText(plan: SubscriptionPlanApi) {
  return [
    plan.maxCompanies === null || plan.maxCompanies === undefined ? 'Unlimited companies' : `Up to ${plan.maxCompanies} companies`,
    plan.maxProjects === null || plan.maxProjects === undefined ? 'Unlimited projects' : `Up to ${plan.maxProjects} projects`,
    plan.maxUsers === null || plan.maxUsers === undefined ? 'Unlimited users' : `Up to ${plan.maxUsers} users`,
    plan.hasGeofencing ? 'Geofencing access' : 'No geofencing',
    plan.hasAdvancedReporting ? 'Advanced reporting' : 'Standard reporting',
    plan.hasWhiteLabel ? 'White-label branding' : 'Default branding',
  ];
}

interface PublicSubscriptionPlansPageProps {
  isDashboardView?: boolean;
}

interface AdminSubscriptionStatus {
  tenantId: string | null;
  plan: {
    id: string;
    name: string;
    priceMonthly?: number | null;
    priceYearly?: number | null;
    visibility?: 'public' | 'private';
    maxCompanies?: number | null;
    maxProjects?: number | null;
    maxUsers?: number | null;
    hasGeofencing?: boolean;
    hasAdvancedReporting?: boolean;
    hasCustomReporting?: boolean;
    hasWhiteLabel?: boolean;
    supportLevel?: string | null;
  } | null;
  subscriptionStatus: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  planInterval?: string | null;
  isActive: boolean;
  isExpired: boolean;
}

export function PublicSubscriptionPlansPage({ isDashboardView = false }: PublicSubscriptionPlansPageProps = {}) {
  const authToken = useAppSelector(selectAuthToken);
  const authUser = useAppSelector(selectAuthUser);
  const isSuperAdmin = authUser?.role === 'super_admin';
  const [plans, setPlans] = useState<SubscriptionPlanApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<AdminSubscriptionStatus | null>(null);
  const [buyOpen, setBuyOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanApi | null>(null);
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [email, setEmail] = useState('');

  const applyStatus = (status: Omit<AdminSubscriptionStatus, 'isActive'> & { isActive?: boolean }) => {
    const isActive = status.isActive ?? (status.subscriptionStatus === 'active' && !status.isExpired);
    setSubscriptionStatus({ ...status, isActive });
  };

  const loadStatus = useCallback(async () => {
    if (!authToken) return;
    try {
      // This endpoint supports both admin and super_admin and returns the
      // currently authenticated user's tenant, avoiding cross-controller URL
      // composition and preventing another tenant's plan from being shown.
      const response = await getMySubscription(authToken);
      const responseData = response?.data as unknown as AdminSubscriptionStatus & { data?: AdminSubscriptionStatus };
      const status = responseData?.data ?? responseData ?? response;
      if (status?.tenantId !== undefined) applyStatus(status);
    } catch {
      // ignore status fetch failure
    }
  }, [authToken, isSuperAdmin]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await getPublicPlans();
        setPlans(response.data.plans.filter((plan) => plan.isActive !== false));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  // Derive the cards from both responses so a later public-plan response cannot
  // overwrite an active private plan that was loaded with the subscription.
  const currentPlan = subscriptionStatus?.isActive ? subscriptionStatus.plan : null;
  const displayedPlans = currentPlan && !plans.some((plan) => plan.id === currentPlan.id)
    ? [...plans, currentPlan as SubscriptionPlanApi]
    : plans;

  const openBuyModal = (plan: SubscriptionPlanApi, nextInterval: 'monthly' | 'yearly') => {
    if (!isSuperAdmin && subscriptionStatus?.subscriptionStatus === 'active' && !subscriptionStatus.isExpired) {
      return;
    }
    setSelectedPlan(plan);
    setInterval(nextInterval);
    setEmail(authUser?.email || '');
    setBuyOpen(true);
  };

  return (
    <div className={isDashboardView ? "space-y-6 pb-12" : "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(29,79,109,0.14),_transparent_28%),linear-gradient(180deg,_#f8fbfe_0%,_#eef4f8_100%)] text-gray-900"}>
      <div className={isDashboardView ? "space-y-6" : "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8"}>
        {isDashboardView ? (
          <PageHeader
            title="My Subscription"
            description="Choose a subscription plan to activate and manage your workspace"
            icon={CreditCard}
          />
        ) : (
          <header className="rounded-[24px] border border-white/60 bg-white/80 px-5 py-4 shadow-[0_18px_60px_-28px_rgba(15,23,42,0.22)] backdrop-blur">
            <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">Subscription Plans</h1>
          </header>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1D4F6D] border-t-transparent" />
            <p className="text-sm font-medium text-gray-500">Loading plans...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {subscriptionStatus?.isActive && subscriptionStatus?.plan && (
              <div className="rounded-[24px] border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 via-emerald-50/40 to-white p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-900/10 shrink-0">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-xl font-black text-gray-900">{subscriptionStatus.plan.name} Plan</h3>
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                          Current Plan
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 font-medium mt-1">
                        Billed {subscriptionStatus.planInterval || 'monthly'} • Next renewal:{' '}
                        <span className="font-semibold text-gray-700">
                          {subscriptionStatus.currentPeriodEnd
                            ? new Date(subscriptionStatus.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Active'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-2xl font-black text-gray-900">
                        ${subscriptionStatus.planInterval === 'yearly' ? subscriptionStatus.plan.priceYearly : subscriptionStatus.plan.priceMonthly}
                      </span>
                      <span className="text-xs font-semibold text-gray-400 block">
                        /{subscriptionStatus.planInterval === 'yearly' ? 'year' : 'month'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {displayedPlans.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[260px] rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center shadow-sm">
                <CreditCard className="h-10 w-10 text-gray-300 mb-3" />
                <h3 className="text-base font-bold text-gray-900">No Subscription Plans Available</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">There are currently no active subscription plans configured.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {displayedPlans.map((plan, index) => {
                  const isCurrentPlan = Boolean(
                    subscriptionStatus?.isActive &&
                    (subscriptionStatus?.plan?.id === plan.id ||
                      subscriptionStatus?.plan?.name?.trim().toLowerCase() === plan.name.trim().toLowerCase())
                  );

                  return (
                    <Card
                      key={plan.id}
                      className={
                        isCurrentPlan
                          ? "relative overflow-hidden rounded-[24px] border-2 border-emerald-500 bg-white p-6 shadow-md transition-all duration-200 flex flex-col justify-between"
                          : isDashboardView
                          ? "relative overflow-hidden rounded-[24px] border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                          : "relative overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_18px_60px_-18px_rgba(15,23,42,0.18)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_90px_-20px_rgba(15,23,42,0.26)] flex flex-col justify-between"
                      }
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isCurrentPlan ? 'bg-emerald-100 text-emerald-700' : 'bg-[#1D4F6D]/10 text-[#1D4F6D]'}`}>
                              {index === 0 ? <ShieldCheck className="h-5 w-5" /> : index === 1 ? <Rocket className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-2xl font-black tracking-tight text-gray-900">{plan.name}</h3>
                                {isCurrentPlan && (
                                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                    Current
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Monthly billing</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-4xl font-black tracking-tight text-gray-900">${plan.priceMonthly}</span>
                            <span className="text-sm font-semibold text-gray-500">/ month</span>
                          </div>
                          <p className="mt-1.5 text-xs font-medium text-gray-500">
                            Yearly: <span className="font-bold text-gray-900">${plan.priceYearly ?? 0}</span>
                          </p>
                        </div>

                        <div className="mt-6 space-y-2.5 rounded-2xl bg-gray-50/70 p-4">
                          {featureText(plan).map((feature) => (
                            <div key={feature} className="flex items-start gap-2.5 text-xs font-medium text-gray-700">
                              <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                <Check className="h-3 w-3" />
                              </div>
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-gray-500">
                          <div className="rounded-xl bg-gray-50/80 border border-gray-100/60 p-2.5">
                            <div className="text-[10px] uppercase tracking-[0.16em] text-gray-400">Companies</div>
                            <div className="mt-1 text-base font-black text-gray-900">
                              {plan.maxCompanies === null || plan.maxCompanies === undefined ? '∞' : plan.maxCompanies}
                            </div>
                          </div>
                          <div className="rounded-xl bg-gray-50/80 border border-gray-100/60 p-2.5">
                            <div className="text-[10px] uppercase tracking-[0.16em] text-gray-400">Projects</div>
                            <div className="mt-1 text-base font-black text-gray-900">
                              {plan.maxProjects === null || plan.maxProjects === undefined ? '∞' : plan.maxProjects}
                            </div>
                          </div>
                          <div className="rounded-xl bg-gray-50/80 border border-gray-100/60 p-2.5">
                            <div className="text-[10px] uppercase tracking-[0.16em] text-gray-400">Users</div>
                            <div className="mt-1 text-base font-black text-gray-900">
                              {plan.maxUsers === null || plan.maxUsers === undefined ? '∞' : plan.maxUsers}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-2">
                        {isCurrentPlan ? (
                          <div className="rounded-xl bg-emerald-50 border border-emerald-200 py-2.5 text-center text-xs font-bold text-emerald-700">
                            Current Plan
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              className="h-11 rounded-xl bg-[#1D4F6D] text-white hover:bg-[#153a50] font-semibold text-xs shadow-sm transition-all"
                              disabled={!isSuperAdmin && subscriptionStatus?.isActive}
                              onClick={() => openBuyModal(plan, 'monthly')}
                            >
                              Buy Monthly
                            </Button>
                            <Button
                              variant="outline"
                              className="h-11 rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-xs transition-all"
                              disabled={!isSuperAdmin && subscriptionStatus?.isActive}
                              onClick={() => openBuyModal(plan, 'yearly')}
                            >
                              Buy Yearly
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <StripePaymentModal
        isOpen={buyOpen}
        onClose={() => setBuyOpen(false)}
        plan={selectedPlan}
        interval={interval}
        email={authUser?.email || email}
        onSuccess={() => {
          void loadStatus();
        }}
      />
    </div>
  );
}
