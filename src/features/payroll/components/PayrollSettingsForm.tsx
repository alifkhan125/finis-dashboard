import { useEffect, useState, useMemo } from 'react';
import { 
  useGetPayrollConfigQuery, 
  useUpdatePayrollConfigMutation,
  useResetPayrollConfigMutation 
} from '@/store/payrollApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Calculator, 
  ShieldCheck, 
  UserCheck, 
  Building2, 
  Calendar,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Percent,
  Sparkles
} from 'lucide-react';
import { formatCurrency } from '@/shared/utils';

export function PayrollSettingsForm() {
  const { data: config, isLoading, refetch } = useGetPayrollConfigQuery();
  const [updateConfig, { isLoading: isUpdating }] = useUpdatePayrollConfigMutation();
  const [resetConfig, { isLoading: isResetting }] = useResetPayrollConfigMutation();

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    period: 'biweekly',
    cppEmployeeRate: 5.95,
    cppEmployerRate: 5.95,
    eiEmployeeRate: 1.63,
    eiEmployerRate: 2.28,
    federalTaxRate: 15.0,
    provincialTaxRate: 5.05,
    wsibRate: 2.0,
    vacationPayRate: 4.0,
  });

  // Simulator state
  const [simHours, setSimHours] = useState<number>(40);
  const [simHourlyRate, setSimHourlyRate] = useState<number>(30);

  useEffect(() => {
    if (config) {
      const cleanRate = (val?: number, fallback = 0) => {
        if (val === undefined || val === null) return fallback;
        return Math.round(val * 100) / 100;
      };

      setFormData({
        period: config.period || 'biweekly',
        cppEmployeeRate: cleanRate(config.employeeDeductions?.cppEmployeeRate, 5.95),
        cppEmployerRate: cleanRate(config.employerContributions?.cppEmployerRate, 5.95),
        eiEmployeeRate: cleanRate(config.employeeDeductions?.eiEmployeeRate, 1.63),
        eiEmployerRate: cleanRate(config.employerContributions?.eiEmployerRate, 2.28),
        federalTaxRate: cleanRate(config.employeeDeductions?.federalTaxRate, 15.0),
        provincialTaxRate: cleanRate(config.employeeDeductions?.provincialTaxRate, 5.05),
        wsibRate: cleanRate(config.employerContributions?.wsibRate, 2.0),
        vacationPayRate: cleanRate(config.employerContributions?.vacationPayRate, 4.0),
      });
    }
  }, [config]);

  const handleChange = (field: string, value: string) => {
    if (field === 'period') {
      setFormData((prev) => ({ ...prev, [field]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: parseFloat(value) || 0 }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    try {
      await updateConfig({
        period: formData.period,
        cppEmployeeRate: formData.cppEmployeeRate, 
        cppEmployerRate: formData.cppEmployerRate,
        eiEmployeeRate: formData.eiEmployeeRate,
        eiEmployerRate: formData.eiEmployerRate,
        federalTaxRate: formData.federalTaxRate,
        provincialTaxRate: formData.provincialTaxRate,
        wsibRate: formData.wsibRate,
        vacationPayRate: formData.vacationPayRate,
      }).unwrap();
      
      setNotification({
        type: 'success',
        message: 'Canadian payroll statutory configuration saved successfully!'
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: 'Failed to update config: ' + (err?.data?.message || err?.message || 'Unknown error')
      });
    }
  };

  const handleResetToDefaults = async () => {
    if (!window.confirm('Are you sure you want to reset all rates to official Canadian CRA statutory defaults?')) {
      return;
    }
    setNotification(null);
    try {
      await resetConfig().unwrap();
      await refetch();
      setNotification({
        type: 'success',
        message: 'Payroll rates reset to Canadian CRA official statutory defaults.'
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: 'Failed to reset: ' + (err?.data?.message || err?.message || 'Unknown error')
      });
    }
  };

  // Calculations for preview
  const totalEmployeeDeductionPercent = useMemo(() => {
    return (
      (formData.cppEmployeeRate || 0) +
      (formData.eiEmployeeRate || 0) +
      (formData.federalTaxRate || 0) +
      (formData.provincialTaxRate || 0)
    );
  }, [formData]);

  const totalEmployerContributionPercent = useMemo(() => {
    return (
      (formData.cppEmployerRate || 0) +
      (formData.eiEmployerRate || 0) +
      (formData.wsibRate || 0) +
      (formData.vacationPayRate || 0)
    );
  }, [formData]);

  // Simulation calculations
  const simGross = Math.round(simHours * simHourlyRate * 100) / 100;
  const simCppEmp = Math.round(simGross * (formData.cppEmployeeRate / 100) * 100) / 100;
  const simEiEmp = Math.round(simGross * (formData.eiEmployeeRate / 100) * 100) / 100;
  const simFedTax = Math.round(simGross * (formData.federalTaxRate / 100) * 100) / 100;
  const simProvTax = Math.round(simGross * (formData.provincialTaxRate / 100) * 100) / 100;
  const simTotalDeductions = Math.round((simCppEmp + simEiEmp + simFedTax + simProvTax) * 100) / 100;
  const simNetPay = Math.round((simGross - simTotalDeductions) * 100) / 100;

  const simCppEmpr = Math.round(simGross * (formData.cppEmployerRate / 100) * 100) / 100;
  const simEiEmpr = Math.round(simGross * (formData.eiEmployerRate / 100) * 100) / 100;
  const simWsib = Math.round(simGross * (formData.wsibRate / 100) * 100) / 100;
  const simVacation = Math.round(simGross * (formData.vacationPayRate / 100) * 100) / 100;
  const simTotalEmployerCost = Math.round((simGross + simCppEmpr + simEiEmpr + simWsib + simVacation) * 100) / 100;

  if (isLoading) {
    return (
      <Card className="p-8 text-center border-border/60">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="h-7 w-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Loading Canadian statutory payroll configuration...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Notification Banner */}
      {notification && (
        <div 
          className={`p-4 rounded-xl flex items-center justify-between text-sm font-medium transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-xs opacity-70 hover:opacity-100 uppercase font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Settings Card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/40 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Canadian Statutory Payroll Deduction Rates</CardTitle>
              </div>
              <CardDescription className="mt-1">
                Configure CRA-compliant statutory formulas for employee tax deductions and employer contribution expenses.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetToDefaults}
                disabled={isResetting || isUpdating}
                className="gap-2 text-xs font-medium border-border/80"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                Reset Defaults
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Pay Period Frequency Setting */}
            <div className="p-4 rounded-xl bg-muted/20 border border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Company Default Pay Period Frequency
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Defines the recurring cycle length used for period boundaries and report groupings.
                  </p>
                </div>
                <select
                  value={formData.period}
                  onChange={(e) => handleChange('period', e.target.value)}
                  className="px-3.5 py-2 text-sm bg-background border border-border rounded-lg font-medium focus:ring-2 focus:ring-primary focus:outline-none min-w-[170px]"
                >
                  <option value="weekly">Weekly (52 Cycles/yr)</option>
                  <option value="biweekly">Bi-Weekly (26 Cycles/yr)</option>
                  <option value="monthly">Monthly (12 Cycles/yr)</option>
                </select>
              </div>
            </div>

            {/* Two Column Grid for Deductions vs Contributions */}
            <div className="grid gap-6 lg:grid-cols-2">
              
              {/* Card 1: Employee Statutory Deductions */}
              <div className="p-5 rounded-xl border border-border/60 bg-card space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Employee Statutory Deductions</h4>
                      <p className="text-xs text-muted-foreground">Withheld directly from gross earnings</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-200 text-xs font-semibold">
                    Total: {totalEmployeeDeductionPercent.toFixed(2)}%
                  </Badge>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">Federal Tax Rate (%)</label>
                      <span className="text-[11px] text-muted-foreground">CRA Tier 1</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.federalTaxRate}
                        onChange={(e) => handleChange('federalTaxRate', e.target.value)}
                        className="pr-8 font-medium"
                      />
                      <Percent className="h-3.5 w-3.5 absolute right-3 top-3 text-muted-foreground/60" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Default: 15.00% base bracket</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">Provincial Tax Rate (%)</label>
                      <span className="text-[11px] text-muted-foreground">Ontario (ON)</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.provincialTaxRate}
                        onChange={(e) => handleChange('provincialTaxRate', e.target.value)}
                        className="pr-8 font-medium"
                      />
                      <Percent className="h-3.5 w-3.5 absolute right-3 top-3 text-muted-foreground/60" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Default: 5.05% ON first tier</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">CPP Employee Rate (%)</label>
                      <span className="text-[11px] text-muted-foreground">Pension Plan</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.cppEmployeeRate}
                        onChange={(e) => handleChange('cppEmployeeRate', e.target.value)}
                        className="pr-8 font-medium"
                      />
                      <Percent className="h-3.5 w-3.5 absolute right-3 top-3 text-muted-foreground/60" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Statutory base: 5.95%</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">EI Employee Rate (%)</label>
                      <span className="text-[11px] text-muted-foreground">Employment Ins.</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.eiEmployeeRate}
                        onChange={(e) => handleChange('eiEmployeeRate', e.target.value)}
                        className="pr-8 font-medium"
                      />
                      <Percent className="h-3.5 w-3.5 absolute right-3 top-3 text-muted-foreground/60" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Statutory base: 1.63% - 1.66%</p>
                  </div>
                </div>
              </div>

              {/* Card 2: Employer Statutory Contributions */}
              <div className="p-5 rounded-xl border border-border/60 bg-card space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Employer Statutory Contributions</h4>
                      <p className="text-xs text-muted-foreground">Company overhead incurred above gross pay</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-200 text-xs font-semibold">
                    Total: +{totalEmployerContributionPercent.toFixed(2)}%
                  </Badge>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">CPP Employer Match (%)</label>
                      <span className="text-[11px] text-muted-foreground">1:1 Match</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.cppEmployerRate}
                        onChange={(e) => handleChange('cppEmployerRate', e.target.value)}
                        className="pr-8 font-medium"
                      />
                      <Percent className="h-3.5 w-3.5 absolute right-3 top-3 text-muted-foreground/60" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">100% of employee rate (5.95%)</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">EI Employer Match (%)</label>
                      <span className="text-[11px] text-muted-foreground">1.4x Factor</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.eiEmployerRate}
                        onChange={(e) => handleChange('eiEmployerRate', e.target.value)}
                        className="pr-8 font-medium"
                      />
                      <Percent className="h-3.5 w-3.5 absolute right-3 top-3 text-muted-foreground/60" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">1.4 times employee rate (2.28%)</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">WSIB Premium Rate (%)</label>
                      <span className="text-[11px] text-muted-foreground">Workplace Safety</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.wsibRate}
                        onChange={(e) => handleChange('wsibRate', e.target.value)}
                        className="pr-8 font-medium"
                      />
                      <Percent className="h-3.5 w-3.5 absolute right-3 top-3 text-muted-foreground/60" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Industry standard avg: 2.00%</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">Vacation Pay Rate (%)</label>
                      <span className="text-[11px] text-muted-foreground">Statutory Accrual</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.vacationPayRate}
                        onChange={(e) => handleChange('vacationPayRate', e.target.value)}
                        className="pr-8 font-medium"
                      />
                      <Percent className="h-3.5 w-3.5 absolute right-3 top-3 text-muted-foreground/60" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Statutory minimum: 4.00% (2 wks)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-border/40 gap-4">
              <p className="text-xs text-muted-foreground">
                Changes take effect immediately on all subsequent payroll runs and tax reports.
              </p>
              <Button 
                type="submit" 
                disabled={isUpdating} 
                className="w-full sm:w-auto px-7 gap-2 shadow-sm font-medium"
              >
                <Save className="h-4 w-4" />
                {isUpdating ? 'Saving Changes...' : 'Save Configuration'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Live Interactive Simulator Card */}
      <Card className="border-border/60 shadow-sm bg-slate-900 text-white">
        <CardHeader className="pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-emerald-400" />
              <CardTitle className="text-base text-white">Live Payroll Calculation Simulator</CardTitle>
            </div>
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
              Live Test Engine
            </Badge>
          </div>
          <CardDescription className="text-slate-400 text-xs">
            Enter hypothetical hours and hourly wage to verify your configured deduction formulas in real time.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-5 space-y-6">
          {/* Inputs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Logged Hours</label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={simHours}
                  onChange={(e) => setSimHours(parseFloat(e.target.value) || 0)}
                  className="bg-slate-800 border-slate-700 text-white font-medium"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">hrs</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Hourly Wage Rate ($)</label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={simHourlyRate}
                  onChange={(e) => setSimHourlyRate(parseFloat(e.target.value) || 0)}
                  className="bg-slate-800 border-slate-700 text-white font-medium"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">$/hr</span>
              </div>
            </div>
          </div>

          {/* Results Summary Box */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Gross Pay</p>
              <p className="text-lg font-bold text-white mt-0.5">{formatCurrency(simGross)}</p>
              <p className="text-[10px] text-slate-500">{simHours}h × ${simHourlyRate}/h</p>
            </div>

            <div>
              <p className="text-[11px] text-rose-400 uppercase font-semibold">Employee Deductions</p>
              <p className="text-lg font-bold text-rose-400 mt-0.5">-{formatCurrency(simTotalDeductions)}</p>
              <p className="text-[10px] text-rose-400/70">{totalEmployeeDeductionPercent.toFixed(1)}% statutory</p>
            </div>

            <div>
              <p className="text-[11px] text-emerald-400 uppercase font-semibold">Take-Home Net Pay</p>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">{formatCurrency(simNetPay)}</p>
              <p className="text-[10px] text-emerald-400/70">Disbursed to worker</p>
            </div>

            <div>
              <p className="text-[11px] text-sky-400 uppercase font-semibold">Total Employer Cost</p>
              <p className="text-lg font-bold text-sky-400 mt-0.5">{formatCurrency(simTotalEmployerCost)}</p>
              <p className="text-[10px] text-sky-400/70">Gross + {totalEmployerContributionPercent.toFixed(1)}% match</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

