export const projectFieldLabels = {
  company: 'Company / Business Name',
  project: 'Project Name',
  client: 'Client Name',
  address: 'Project Address',
  phone: 'Phone Number',
  email: 'Email Address',
  start: 'Estimated Start Date',
  end: 'Estimated End Date',
} as const;

export type ProjectField = keyof typeof projectFieldLabels;

export function validateQuotationProject(info: Record<ProjectField, string>) {
  const errors: Partial<Record<ProjectField, string>> = {};
  for (const key of Object.keys(projectFieldLabels) as ProjectField[]) {
    if (!info[key].trim()) errors[key] = `${projectFieldLabels[key]} is required.`;
  }
  if (info.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email.trim())) {
    errors.email = 'Enter a valid email address (for example, name@company.com).';
  }
  if (info.start && info.end && info.end < info.start) {
    errors.end = 'Estimated End Date must be on or after Estimated Start Date.';
  }
  return errors;
}

export type QuotationErrors = Record<string, string>;
type AreaFloor = { id: string; label: string; selected: boolean; verified: boolean; units: { id: string; label: string; selected: boolean }[] };
export function validateQuotationAreas(floors: AreaFloor[], capacity: number): QuotationErrors {
  const errors: QuotationErrors = {};
  if (!floors.length) errors.building = 'Create the building floors before continuing.';
  else if (!floors.some(f => f.selected)) errors.floors = 'Select at least one workable floor.';
  for (const f of floors.filter(f => f.selected)) {
    if (!f.units.length) errors[`floor-${f.id}-units`] = `${f.label}: generate unit numbers or paste exact numbers.`;
    else if (f.units.length > capacity) errors[`floor-${f.id}-units`] = `${f.label}: remove extra units or increase Maximum Units per Floor (${capacity}).`;
    else if (!f.units.some(u => u.selected)) errors[`floor-${f.id}-units`] = `${f.label}: select at least one workable unit.`;
    for (const u of f.units) {
      if (!u.label.trim()) errors[`unit-${u.id}`] = 'Enter a unit number.';
      else if (f.units.some(other => other.id !== u.id && other.label.trim() === u.label.trim())) errors[`unit-${u.id}`] = 'This unit number is duplicated on this floor.';
    }
    if (!f.verified) errors[`floor-${f.id}-verification`] = `${f.label}: check the verification box after reviewing the unit numbers and selections.`;
  }
  return errors;
}

export function validateQuotationServices(services: { id: string; title: string; rate: number; reviewed: boolean; units: string[]; costs: { id: string; name: string; amount: number }[] }[], workableIds: Set<string>): QuotationErrors {
  const errors: QuotationErrors = {};
  if (!services.length) errors.templates = 'Select a template and click Configure Services to add at least one service.';
  for (const s of services) {
    if (!s.title.trim()) errors[`service-${s.id}-title`] = 'Enter a service title.';
    if (!Number.isFinite(s.rate) || s.rate < 0) errors[`service-${s.id}-rate`] = 'Enter a valid non-negative hourly rate.';
    if (!s.units.some(id => workableIds.has(id))) errors[`service-${s.id}-units`] = 'Select at least one workable unit for this service.';
    else if (s.units.some(id => !workableIds.has(id))) errors[`service-${s.id}-units`] = 'Remove unavailable assignments or apply this service to the current workable units.';
    for (const c of s.costs) {
      if (!c.name.trim()) errors[`cost-${c.id}-name`] = 'Enter a cost name or remove this cost.';
      if (!Number.isFinite(c.amount) || c.amount < 0) errors[`cost-${c.id}-amount`] = 'Enter a valid non-negative amount.';
    }
    if (!s.reviewed) errors[`service-${s.id}-review`] = 'Confirm that you reviewed the updated work areas, assignments, and pricing.';
  }
  return errors;
}
