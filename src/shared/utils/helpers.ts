import { PayrollConfig } from '@/shared/types';

export class PayrollCalculator {
    /**
     * Calculate Canadian payroll deductions and contributions
     */
    static calculatePayroll(
        hoursWorked: number,
        hourlyRate: number,
        config: PayrollConfig
    ) {
        const grossPay = hoursWorked * hourlyRate;

        // Calculate deductions
        const cppEmployee = (grossPay * config.cppEmployee) / 100;
        const eiEmployee = (grossPay * config.eiEmployee) / 100;
        const federalTax = (grossPay * config.federalTax) / 100;
        const provincialTax = (grossPay * config.provincialTax) / 100;

        const totalDeductions = cppEmployee + eiEmployee + federalTax + provincialTax;

        // Calculate employer contributions
        const cppEmployer = (grossPay * config.cppEmployer) / 100;
        const eiEmployer = (grossPay * config.eiEmployer) / 100;
        const wsibEmployer = (grossPay * config.wsibEmployer) / 100;

        // Calculate vacation pay
        const vacationPay = (grossPay * config.vacationPay) / 100;

        // Calculate net pay
        const netPay = grossPay - totalDeductions;

        return {
            grossPay: parseFloat(grossPay.toFixed(2)),
            deductions: {
                cppEmployee: parseFloat(cppEmployee.toFixed(2)),
                eiEmployee: parseFloat(eiEmployee.toFixed(2)),
                federalTax: parseFloat(federalTax.toFixed(2)),
                provincialTax: parseFloat(provincialTax.toFixed(2))
            },
            totalDeductions: parseFloat(totalDeductions.toFixed(2)),
            employerContributions: {
                cppEmployer: parseFloat(cppEmployer.toFixed(2)),
                eiEmployer: parseFloat(eiEmployer.toFixed(2)),
                wsibEmployer: parseFloat(wsibEmployer.toFixed(2))
            },
            vacationPay: parseFloat(vacationPay.toFixed(2)),
            netPay: parseFloat(netPay.toFixed(2))
        };
    }

    /**
     * Format currency in CAD
     */
    static formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD'
        }).format(amount);
    }

    /**
     * Calculate total employer cost
     */
    static calculateEmployerCost(
        grossPay: number,
        employerContributions: {
            cppEmployer: number;
            eiEmployer: number;
            wsibEmployer: number;
        }
    ): number {
        const total =
            grossPay +
            employerContributions.cppEmployer +
            employerContributions.eiEmployer +
            employerContributions.wsibEmployer;
        return parseFloat(total.toFixed(2));
    }
}

/**
 * Generate a unique shareable link
 */
export function generatePublicLink(_type: 'company' | 'project', id: string, name: string): string {
    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return `https://finispro.app/public/${id}-${slug}`;
}

/**
 * Format date range for reports
 */
export function formatDateRange(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const formatter = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    return `${formatter.format(start)} - ${formatter.format(end)}`;
}

/**
 * Format 24h or ISO time string to 12h AM/PM format (e.g. 08:00 AM, 05:00 PM)
 */
export function formatTimeAMPM(timeStr?: string): string {
    if (!timeStr) return '--:--';
    const trimmed = timeStr.trim();
    const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (ampmMatch) {
        const hrs = parseInt(ampmMatch[1], 10).toString().padStart(2, '0');
        const mins = ampmMatch[2];
        const ampm = ampmMatch[3].toUpperCase();
        return `${hrs}:${mins} ${ampm}`;
    }
    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})/);
    if (match24) {
        let hrs = parseInt(match24[1], 10);
        const mins = match24[2];
        if (!isNaN(hrs)) {
            const ampm = hrs >= 12 ? 'PM' : 'AM';
            hrs = hrs % 12 || 12;
            return `${hrs.toString().padStart(2, '0')}:${mins} ${ampm}`;
        }
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    return trimmed;
}

/**
 * Calculate hours between two times
 */
export function calculateHours(startTime: string, endTime: string): number {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diff = end.getTime() - start.getTime();
    return parseFloat((diff / (1000 * 60 * 60)).toFixed(2));
}

/**
 * Get status badge color
 */
export function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        active: 'bg-green-100 text-green-800',
        inactive: 'bg-gray-100 text-gray-800',
        pending: 'bg-yellow-100 text-yellow-800',
        approved: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
        denied: 'bg-red-100 text-red-800',
        completed: 'bg-blue-100 text-blue-800',
        in_progress: 'bg-purple-100 text-purple-800',
        planning: 'bg-gray-100 text-gray-800',
        disabled: 'bg-red-100 text-red-800',
        present: 'bg-green-100 text-green-800',
        absent: 'bg-red-100 text-red-800',
        late: 'bg-orange-100 text-orange-800',
        early_departure: 'bg-orange-100 text-orange-800',
        paid: 'bg-blue-100 text-blue-800',
        draft: 'bg-gray-100 text-gray-800',
        suspended: 'bg-red-100 text-red-800',
        trial: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c * 1000; // Distance in meters
    return parseFloat(distance.toFixed(2));
}

/**
 * Check if a point is inside a polygon (geofence)
 */
export function isPointInPolygon(
    point: { lat: number; lng: number },
    polygon: Array<{ lat: number; lng: number }>
): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lat;
        const yi = polygon[i].lng;
        const xj = polygon[j].lat;
        const yj = polygon[j].lng;

        const intersect =
            yi > point.lng !== yj > point.lng &&
            point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Generate random ID
 */
export function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}

/**
 * Truncate text
 */
export function truncate(text: string, length: number): string {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

/**
 * Build a full URL for an asset. If the value is already an absolute URL, return it.
 * Otherwise prefix with `VITE_API_BASE_URL`.
 */
export function getFullUrl(value?: string): string | undefined {
    if (!value) return undefined;
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    const base = (import.meta.env.VITE_API_BASE_URL as string) || '';
    return `${base}${value.startsWith('/') ? '' : '/'}${value}`;
}

/**
 * Capitalize words in a string, replacing underscores/hyphens with spaces.
 * e.g. "super_admin" -> "Super Admin", "in_progress" -> "In Progress"
 */
export function capitalize(str?: string | null): string {
    if (!str) return '';
    return str
        .toString()
        .replace(/[_-]+/g, ' ')
        .trim()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Format user role to Title Case / friendly display.
 * e.g. "super_admin" -> "Super Admin", "admin" -> "Admin", "manager" -> "Manager", "worker" -> "Worker"
 */
export function formatRole(role?: string | null): string {
    if (!role) return '';
    const map: Record<string, string> = {
        super_admin: 'Super Admin',
        admin: 'Admin',
        manager: 'Manager',
        worker: 'Worker',
    };
    return map[role.toLowerCase()] || capitalize(role);
}

/**
 * Format status code to Title Case.
 * e.g. "active" -> "Active", "in_progress" -> "In Progress", "early_departure" -> "Early Departure"
 */
export function formatStatus(status?: string | null): string {
    if (!status) return '';
    const map: Record<string, string> = {
        active: 'Active',
        inactive: 'Inactive',
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        denied: 'Denied',
        completed: 'Completed',
        in_progress: 'In Progress',
        planning: 'Planning',
        disabled: 'Disabled',
        present: 'Present',
        absent: 'Absent',
        late: 'Late',
        early_departure: 'Early Departure',
        paid: 'Paid',
        unpaid: 'Unpaid',
        overdue: 'Overdue',
        draft: 'Draft',
        suspended: 'Suspended',
        trial: 'Trial',
        cancelled: 'Cancelled',
        inside: 'Inside',
        outside: 'Outside',
    };
    return map[status.toLowerCase()] || capitalize(status);
}

