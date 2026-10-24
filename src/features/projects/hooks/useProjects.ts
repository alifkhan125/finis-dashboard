/**
 * useProjects Hook
 *
 * Backend-backed project hooks for the projects feature.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, API_ENDPOINTS } from '@/services';
import type { Project, Floor, Room } from '@/shared/types';

interface UseProjectsParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    timeRange?: string;
    dateRange?: { start: Date; end: Date } | null;
}

type BackendProject = {
    id: string;
    name: string;
    companyId?: string;
    companyName?: string;
    company?: { id: string; name?: string | null } | null;
    client?: {
        companyId?: string;
        companyName?: string;
        logoUrl?: string | null;
        phone?: string;
        email?: string;
        website?: string;
        address?: string;
        primaryContact?: any;
    } | null;
    type?: string | null;
    isWholeHouse?: boolean | null;
    houseSections?: string[] | null;
    description?: string | null;
    status?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    budget?: number | null;
    spent?: number | null;
    remaining?: number | null;
    location?: string | null;
    address?: string | null;
    numFloors?: number | null;
    roomsPerFloor?: number | null;
    priority?: string | null;
    publicLink?: { url: string; enabled?: boolean; createdAt?: string } | null;
    floors?: Array<{
        id: string;
        projectId?: string;
        floorNumber?: number | null;
        number?: number | null;
        name?: string | null;
        type?: string | null;
        status?: string | null;
        progress?: number | null;
        totalRooms?: number | null;
        taskCounts?: { total: number; completed: number; inProgress: number; notStarted: number };
        rooms?: Array<{
            id: string;
            floorId?: string;
            number?: string | null;
            name?: string | null;
            type?: string | null;
            sizeSqft?: number | null;
            status?: string | null;
            progress?: number | null;
            roomGroup?: string | null;
            assignedWorkers?: string[] | null;
            tasks?: any[] | null;
            taskCounts?: { total: number; completed: number; inProgress: number; notStarted: number };
        }> | null;
        units?: Array<{
            id: string;
            floorId?: string;
            number?: string | null;
            name?: string | null;
            type?: string | null;
            sizeSqft?: number | null;
            status?: string | null;
            progress?: number | null;
            roomGroup?: string | null;
            assignedWorkers?: string[] | null;
            tasks?: any[] | null;
            taskCounts?: { total: number; completed: number; inProgress: number; notStarted: number };
        }> | null;
        tasks?: any[] | null;
    }>;
    tasks?: any[] | null;
    geofence?: Project['geofence'];
    progress?: number | null;
    hasBudget?: boolean | null;
    teamMembers?: Array<{
        id?: string;
        projectId?: string;
        userId?: string;
        role?: string;
        managerId?: string | null;
        createdAt?: string;
        user?: { id?: string; fullName?: string; avatarUrl?: string | null };
        fullName?: string;
        avatarUrl?: string | null;
    }> | null;
    team?: Project['team'];
    counts?: { tasks: number; teamMembers: number; floors: number };
    _count?: { floors?: number; tasks?: number; teamMembers?: number };
    createdAt?: string | null;
};

type BackendProjectListResponse = BackendProject[] | { success?: boolean; data?: BackendProject[] };
type BackendProjectDetailResponse = BackendProject | { success?: boolean; data?: BackendProject };

const getCurrentUserRole = () => {
    try {
        const raw = localStorage.getItem('auth_user');
        if (!raw) return '';
        const user = JSON.parse(raw) as { role?: string };
        return user.role ?? '';
    } catch {
        return '';
    }
};

const isSuperAdminRole = () => getCurrentUserRole() === 'super_admin';

const unwrap = <T,>(response: T | { success?: boolean; data?: T }): T => {
    if (response && typeof response === 'object' && 'data' in response) {
        return (response as { data: T }).data;
    }
    return response as T;
};

const normalizeStatus = (value?: string | null): Project['status'] => {
    if (value === 'completed' || value === 'active' || value === 'delayed' || value === 'planning') {
        return value;
    }
    return 'planning';
};

const normalizeType = (value?: string | null, isWholeHouse?: boolean | null): Project['type'] => {
    if (value === 'house' || isWholeHouse) {
        return 'house';
    }
    return 'apartment_building';
};

const toBackendProjectType = (value?: Project['type']) => {
    if (value === 'house') return 'house';
    if (value === 'apartment_building') return 'apartment';
    return undefined;
};

const toBackendHouseSections = (sections?: string[]) =>
    (sections ?? []).map((section) => section.trim().toLowerCase().replace(/\s+/g, '_'));

const mapRoom = (
    room: {
        id: string;
        floorId?: string;
        number?: string | null;
        name?: string | null;
        type?: string | null;
        sizeSqft?: number | null;
        status?: string | null;
        progress?: number | null;
        roomGroup?: string | null;
        assignedWorkers?: string[] | null;
        tasks?: any[] | null;
        taskCounts?: { total: number; completed: number; inProgress: number; notStarted: number };
    },
    floorId: string,
    roomIndex: number,
): Room => ({
    id: room.id,
    floorId: room.floorId || floorId,
    number: room.number || room.name || String(roomIndex + 1),
    name: room.name || `Unit ${roomIndex + 1}`,
    type: room.type ?? undefined,
    sizeSqft: room.sizeSqft,
    roomGroup: room.roomGroup || undefined,
    status: (room.status as Room['status']) || 'pending',
    progress: room.progress ?? 0,
    assignedWorkers: room.assignedWorkers ?? [],
    tasks: room.tasks ?? [],
    taskCounts: room.taskCounts,
});

const mapProject = (project: BackendProject): Project => {
    const floors: Floor[] = (project.floors ?? []).map((floor, floorIndex) => ({
        id: floor.id,
        projectId: floor.projectId || project.id,
        number: floor.floorNumber ?? floor.number ?? floorIndex + 1,
        name: floor.name || `Floor ${floorIndex + 1}`,
        type: floor.type === 'section' ? 'section' : 'floor',
        status: (floor.status as any) || 'pending',
        progress: floor.progress ?? 0,
        taskCounts: floor.taskCounts,
        totalRooms: floor.totalRooms ?? floor.units?.length ?? floor.rooms?.length ?? 0,
        rooms: (floor.units ?? floor.rooms ?? []).map((room, roomIndex) => mapRoom(room, floor.id, roomIndex)),
        tasks: floor.tasks ?? [],
    }));

    const budget = Number(project.budget ?? 0);

    // Support both old and new team member formats
    const rawTeamMembers = project.teamMembers ?? [];
    const team = project.team ?? rawTeamMembers.map((member) => {
        const fullName = member.user?.fullName || member.fullName || 'Team Member';
        const avatarUrl = member.user?.avatarUrl || member.avatarUrl;
        return {
            name: fullName,
            role: member.role || 'worker',
            image: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`,
        };
    });

    // Client info from new backend format
    const clientInfo = project.client;
    const companyId = clientInfo?.companyId || project.companyId || project.company?.id || '';
    const companyName = clientInfo?.companyName || project.companyName || project.company?.name || '';

    return {
        id: project.id,
        name: project.name,
        companyId,
        companyName,
        type: normalizeType(project.type, project.isWholeHouse),
        projectConfig: project.type === 'house' || project.isWholeHouse
            ? {
                houseType: project.isWholeHouse === false ? 'sections' : 'whole_house',
                sections: project.houseSections ?? [],
            }
            : undefined,
        description: project.description || '',
        status: normalizeStatus(project.status),
        ...(project.priority && { priority: project.priority }),
        startDate: project.startDate || project.createdAt || '',
        endDate: project.endDate || undefined,
        budget,
        spent: project.spent ?? null,
        remaining: project.remaining ?? null,
        address: project.location || project.address || '',
        client: clientInfo ? {
            companyId: clientInfo.companyId || companyId,
            companyName: clientInfo.companyName || companyName,
            logoUrl: clientInfo.logoUrl || null,
            phone: clientInfo.phone || '',
            email: clientInfo.email || '',
            website: clientInfo.website || '',
            address: clientInfo.address || '',
            primaryContact: clientInfo.primaryContact || null,
        } : undefined,
        publicLink: project.publicLink
            ? {
                url: project.publicLink.url,
                enabled: project.publicLink.enabled ?? true,
                createdAt: project.publicLink.createdAt || project.createdAt || new Date().toISOString(),
            }
            : undefined,
        floors,
        tasks: project.tasks ?? [],
        geofence: project.geofence || undefined,
        progress: Number(project.progress ?? 0),
        hasBudget: project.hasBudget ?? budget > 0,
        team,
        counts: project.counts || {
            tasks: project._count?.tasks ?? 0,
            teamMembers: project._count?.teamMembers ?? rawTeamMembers.length,
            floors: project._count?.floors ?? floors.length,
        },
        createdAt: project.createdAt || new Date().toISOString(),
    };
};

const buildCreatePayload = (data: Partial<Project>) => ({
    name: data.name,
    companyId: data.companyId,
    type: toBackendProjectType(data.type),
    description: data.description,
    startDate: data.startDate,
    endDate: data.endDate,
    budget: data.budget,
    progress: data.progress,
    location: data.address,
    status: data.status,
    isWholeHouse: data.type === 'house' ? data.projectConfig?.houseType !== 'sections' : undefined,
    houseSections: toBackendHouseSections(data.projectConfig?.sections),
    numFloors: data.floors?.length,
    numFloorsMin: (data as any).floorStart ? Number((data as any).floorStart) : undefined,
    numFloorsMax: (data as any).floorEnd ? Number((data as any).floorEnd) : undefined,
    unitPerFloor: data.type === 'apartment_building' ? data.floors?.[0]?.rooms.length : undefined,
    unitPerFloorMin: (data as any).unitStart ? Number((data as any).unitStart) : undefined,
    unitPerFloorMax: (data as any).unitEnd ? Number((data as any).unitEnd) : undefined,
    autoGenerateFloors: data.type === 'apartment_building' ? true : undefined,
});

const buildUpdatePayload = (data: Partial<Project>) => ({
    name: data.name,
    companyId: data.companyId,
    type: toBackendProjectType(data.type),
    description: data.description,
    startDate: data.startDate,
    endDate: data.endDate,
    numFloorsMin: (data as any).floorStart ? Number((data as any).floorStart) : undefined,
    numFloorsMax: (data as any).floorEnd ? Number((data as any).floorEnd) : undefined,
    unitPerFloorMin: (data as any).unitStart ? Number((data as any).unitStart) : undefined,
    unitPerFloorMax: (data as any).unitEnd ? Number((data as any).unitEnd) : undefined,
    budget: data.budget,
    progress: data.progress,
    location: data.address,
    status: data.status,
    isWholeHouse: data.type === 'house' ? data.projectConfig?.houseType !== 'sections' : undefined,
    houseSections: toBackendHouseSections(data.projectConfig?.sections),
    autoGenerateFloors: data.type === 'apartment_building' ? true : undefined,
});

// ─── Projects List ───────────────────────────────────────────────────────────

export function useProjects(params: UseProjectsParams = {}) {
    const role = getCurrentUserRole();
    return useQuery({
        queryKey: ['projects', role, params],
        queryFn: async () => {
            const searchParams = new URLSearchParams();
            if (params.search) searchParams.set('search', params.search);
            if (params.status && params.status !== 'all') searchParams.set('status', params.status);
            if (params.page) searchParams.set('page', String(params.page));
            if (params.limit) searchParams.set('limit', String(params.limit));

            const baseListEndpoint = isSuperAdminRole()
                ? API_ENDPOINTS.SUPER_ADMIN.PROJECTS.LIST
                : API_ENDPOINTS.PROJECTS.LIST;
            const endpoint = searchParams.toString()
                ? `${baseListEndpoint}?${searchParams.toString()}`
                : baseListEndpoint;

            const response = await apiClient.get<BackendProjectListResponse>(endpoint);
            const data = unwrap(response.data);
            return Array.isArray(data) ? data.map(mapProject) : [];
        },
        placeholderData: (previousData) => previousData,
    });
}

// ─── Single Project ──────────────────────────────────────────────────────────

export function useProject(id: string) {
    return useQuery({
        queryKey: ['project', id],
        queryFn: async () => {
            const endpoint = isSuperAdminRole()
                ? API_ENDPOINTS.SUPER_ADMIN.PROJECTS.PROFILE(id)
                : API_ENDPOINTS.PROJECTS.PROFILE(id);
            const response = await apiClient.get<BackendProjectDetailResponse>(
                endpoint
            );
            return mapProject(unwrap(response.data));
        },
        enabled: !!id,
    });
}

// ─── Project Floors ──────────────────────────────────────────────────────────

export function useProjectFloors(projectId: string) {
    return useQuery({
        queryKey: ['project-floors', projectId],
        queryFn: async () => {
            const response = await apiClient.get<any>(`/admin/projects/${projectId}/floor-plan`);
            const data = unwrap(response.data);
            return Array.isArray(data) ? data : [];
        },
        enabled: !!projectId,
    });
}

export function useCreateFloor() {
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: async ({ projectId, name }: { projectId: string; name: string }) => {
            const response = await apiClient.post<any>(
                API_ENDPOINTS.PROJECTS.FLOORS(projectId),
                { name }
            );
            return unwrap(response.data);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['project-floors', variables.projectId] });
            queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
        },
    });
    return {
        createFloor: mutation.mutateAsync,
        isCreating: mutation.isPending,
        error: mutation.error,
    };
}

export function useUpdateFloor() {
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: async ({
            projectId,
            floorId,
            data,
        }: {
            projectId: string;
            floorId: string;
            data: { name?: string; status?: string; progress?: number };
        }) => {
            const response = await apiClient.put<any>(
                API_ENDPOINTS.PROJECTS.FLOOR_DETAIL(projectId, floorId),
                data
            );
            return unwrap(response.data);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['project-floors', variables.projectId] });
            queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
        },
    });
    return {
        updateFloor: mutation.mutateAsync,
        isUpdating: mutation.isPending,
        error: mutation.error,
    };
}

export function useDeleteFloor() {
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: async ({ projectId, floorId }: { projectId: string; floorId: string }) => {
            await apiClient.delete(API_ENDPOINTS.PROJECTS.FLOOR_DETAIL(projectId, floorId));
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['project-floors', variables.projectId] });
            queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
        },
    });
    return {
        deleteFloor: mutation.mutateAsync,
        isDeleting: mutation.isPending,
        error: mutation.error,
    };
}

// ─── Project Rooms ───────────────────────────────────────────────────────────

export function useCreateRoom() {
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: async ({
            projectId,
            floorId,
            name,
        }: {
            projectId: string;
            floorId: string;
            name: string;
        }) => {
            const response = await apiClient.post<any>(
                API_ENDPOINTS.PROJECTS.ROOMS(projectId, floorId),
                { name }
            );
            return unwrap(response.data);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['project-floors', variables.projectId] });
            queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
        },
    });
    return {
        createRoom: mutation.mutateAsync,
        isCreating: mutation.isPending,
        error: mutation.error,
    };
}

export function useUpdateRoom() {
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: async ({
            projectId,
            roomId,
            data,
        }: {
            projectId: string;
            roomId: string;
            data: { name?: string; type?: string; sizeSqft?: number; status?: string; progress?: number };
        }) => {
            const response = await apiClient.put<any>(
                API_ENDPOINTS.PROJECTS.ROOM_DETAIL(projectId, roomId),
                data
            );
            return unwrap(response.data);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['project-floors', variables.projectId] });
            queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
        },
    });
    return {
        updateRoom: mutation.mutateAsync,
        isUpdating: mutation.isPending,
        error: mutation.error,
    };
}

export function useDeleteRoom() {
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: async ({ projectId, roomId }: { projectId: string; roomId: string }) => {
            await apiClient.delete(API_ENDPOINTS.PROJECTS.ROOM_DETAIL(projectId, roomId));
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['project-floors', variables.projectId] });
            queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
        },
    });
    return {
        deleteRoom: mutation.mutateAsync,
        isDeleting: mutation.isPending,
        error: mutation.error,
    };
}

// ─── Project Analysis ────────────────────────────────────────────────────────

export function useProjectAnalysis(projectId: string) {
    return useQuery({
        queryKey: ['project-analysis', projectId],
        queryFn: async () => {
            const endpoint = isSuperAdminRole()
                ? API_ENDPOINTS.SUPER_ADMIN.PROJECTS.ANALYSIS(projectId)
                : API_ENDPOINTS.PROJECTS.ANALYSIS(projectId);
            const response = await apiClient.get<any>(endpoint);
            return unwrap(response.data);
        },
        enabled: !!projectId,
    });
}

export function useProjectFloorPlan(projectId: string) {
    return useQuery({
        queryKey: ['project-floor-plan', projectId],
        queryFn: async () => {
            const endpoint = isSuperAdminRole()
                ? API_ENDPOINTS.SUPER_ADMIN.PROJECTS.FLOOR_PLAN(projectId)
                : API_ENDPOINTS.PROJECTS.FLOOR_PLAN(projectId);
            const response = await apiClient.get<any>(endpoint);
            const data = unwrap(response.data);
            return Array.isArray(data)
                ? data.map((floor: any, floorIndex: number) => ({
                    id: floor.id,
                    projectId,
                    number: floor.floorNumber ?? floor.number ?? floorIndex + 1,
                    name: floor.name || `Floor ${floorIndex + 1}`,
                    type: 'floor',
                    status: floor.status ?? 'pending',
                    progress: floor.progress ?? 0,
                    totalRooms: floor.totalUnits ?? floor.units?.length ?? 0,
                    taskCounts: floor.taskCounts,
                    rooms: (floor.units ?? []).map((unit: any, unitIndex: number) =>
                        mapRoom(
                            {
                                ...unit,
                                number: unit.number ?? unit.name,
                            },
                            floor.id,
                            unitIndex,
                        ),
                    ),
                    tasks: floor.tasks ?? [],
                }))
                : [];
        },
        enabled: !!projectId,
    });
}

export function useProjectApprovals(projectId: string) {
    return useQuery({
        queryKey: ['project-approvals', projectId],
        queryFn: async () => {
            const endpoint = isSuperAdminRole()
                ? API_ENDPOINTS.SUPER_ADMIN.PROJECTS.APPROVALS(projectId)
                : API_ENDPOINTS.PROJECTS.APPROVALS(projectId);
            const response = await apiClient.get<any>(endpoint);
            return unwrap(response.data);
        },
        enabled: !!projectId,
    });
}

// ─── Project Team ────────────────────────────────────────────────────────────

export function useProjectTeam(projectId: string) {
    return useQuery({
        queryKey: ['project-team', projectId],
        queryFn: async () => {
            const [managersRes, workersRes] = await Promise.all([
                apiClient.get<any>(API_ENDPOINTS.PROJECTS.TEAM_MANAGERS(projectId)),
                apiClient.get<any>(API_ENDPOINTS.PROJECTS.TEAM_WORKERS(projectId)),
            ]);
            const managers = unwrap(managersRes.data);
            const workers = unwrap(workersRes.data);
            return {
                managers: Array.isArray(managers) ? managers : [],
                workers: Array.isArray(workers) ? workers : [],
            };
        },
        enabled: !!projectId,
    });
}

export function useAddTeamManager() {
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
            const response = await apiClient.post<any>(
                API_ENDPOINTS.PROJECTS.TEAM_MANAGERS(projectId),
                { userId }
            );
            return unwrap(response.data);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['project-team', variables.projectId] });
            queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
        },
    });
    return {
        addManager: mutation.mutateAsync,
        isAdding: mutation.isPending,
        error: mutation.error,
    };
}

export function useAddTeamWorker() {
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: async ({
            projectId,
            userId,
            managerId,
        }: {
            projectId: string;
            userId: string;
            managerId?: string;
        }) => {
            const response = await apiClient.post<any>(
                API_ENDPOINTS.PROJECTS.TEAM_WORKERS(projectId),
                { userId, managerId }
            );
            return unwrap(response.data);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['project-team', variables.projectId] });
            queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
        },
    });
    return {
        addWorker: mutation.mutateAsync,
        isAdding: mutation.isPending,
        error: mutation.error,
    };
}

export function useRemoveTeamMember() {
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
            await apiClient.delete(API_ENDPOINTS.PROJECTS.TEAM_REMOVE(projectId, userId));
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['project-team', variables.projectId] });
            queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
        },
    });
    return {
        removeMember: mutation.mutateAsync,
        isRemoving: mutation.isPending,
        error: mutation.error,
    };
}

// ─── Available Team Members ──────────────────────────────────────────────────

export function useAvailableManagers() {
    return useQuery({
        queryKey: ['available-managers'],
        queryFn: async () => {
            const response = await apiClient.get<any>(API_ENDPOINTS.TEAM.AVAILABLE_MANAGERS);
            const data = unwrap(response.data);
            return Array.isArray(data) ? data : [];
        },
    });
}

export function useAvailableWorkers() {
    return useQuery({
        queryKey: ['available-workers'],
        queryFn: async () => {
            const response = await apiClient.get<any>(API_ENDPOINTS.TEAM.AVAILABLE_WORKERS);
            const data = unwrap(response.data);
            return Array.isArray(data) ? data : [];
        },
    });
}

// ─── Project Documents ───────────────────────────────────────────────────────

export function useProjectDocuments(projectId: string) {
    return useQuery({
        queryKey: ['project-documents', projectId],
        queryFn: async () => {
            const endpoint = isSuperAdminRole()
                ? API_ENDPOINTS.SUPER_ADMIN.PROJECTS.DOCUMENTS(projectId)
                : API_ENDPOINTS.PROJECTS.DOCUMENTS(projectId);
            const response = await apiClient.get<any>(endpoint);
            const data = unwrap(response.data);
            return data?.documents && Array.isArray(data.documents) ? data.documents : (Array.isArray(data) ? data : []);
        },
        enabled: !!projectId,
    });
}

export function useUploadProjectDocument() {
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: async ({ projectId, file }: { projectId: string; file: File }) => {
            const endpoint = isSuperAdminRole()
                ? API_ENDPOINTS.SUPER_ADMIN.PROJECTS.DOCUMENTS(projectId)
                : API_ENDPOINTS.PROJECTS.DOCUMENTS(projectId);
            const response = await apiClient.uploadFile<any>(
                endpoint,
                file
            );
            return unwrap(response.data);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['project-documents', variables.projectId] });
        },
    });
    return {
        uploadDocument: mutation.mutateAsync,
        isUploading: mutation.isPending,
        error: mutation.error,
    };
}

export function useDeleteProjectDocument() {
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: async ({ projectId, documentId }: { projectId: string; documentId: string }) => {
            const endpoint = isSuperAdminRole()
                ? API_ENDPOINTS.SUPER_ADMIN.PROJECTS.DOCUMENT_DELETE(projectId, documentId)
                : API_ENDPOINTS.PROJECTS.DOCUMENT_DELETE(projectId, documentId);
            const response = await apiClient.delete<any>(
                endpoint
            );
            return unwrap(response.data);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['project-documents', variables.projectId] });
        },
    });
    return {
        deleteDocument: mutation.mutateAsync,
        isDeleting: mutation.isPending,
        error: mutation.error,
    };
}

// ─── Create / Update / Delete Project ───────────────────────────────────────

export function useCreateProject() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (data: Partial<Project>) => {
            const response = await apiClient.post<BackendProjectDetailResponse>(
                API_ENDPOINTS.PROJECTS.CREATE,
                buildCreatePayload(data)
            );
            return mapProject(unwrap(response.data));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });

    return {
        createProject: mutation.mutateAsync,
        isCreating: mutation.isPending,
        error: mutation.error,
    };
}

export function useUpdateProject() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Project> }) => {
            const response = await apiClient.put<BackendProjectDetailResponse>(
                API_ENDPOINTS.PROJECTS.UPDATE(id),
                buildUpdatePayload(data)
            );
            return mapProject(unwrap(response.data));
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
        },
    });

    return {
        updateProject: (id: string, data: Partial<Project>) => mutation.mutateAsync({ id, data }),
        isUpdating: mutation.isPending,
        error: mutation.error,
    };
}

export function useDeleteProject() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(API_ENDPOINTS.PROJECTS.DELETE(id));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });

    return {
        deleteProject: mutation.mutateAsync,
        isDeleting: mutation.isPending,
        error: mutation.error,
    };
}

export function useSuspendProject() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await apiClient.patch(`/super-admin/projects/${id}/suspend`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['project'] });
        },
    });

    return {
        suspendProject: mutation.mutateAsync,
        isSuspending: mutation.isPending,
        error: mutation.error,
    };
}
