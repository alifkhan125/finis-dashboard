import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthUser {
    id: string;
    email: string;
    phone?: string | null;
    fullName: string;
    role: string;
    avatarUrl?: string | null;
    tenantId?: string | null;
    isSwitched?: boolean;
    originalRole?: string;
    activeCompanyId?: string;
}

interface AuthState {
    token: string | null;
    user: AuthUser | null;
    originalSuperAdminToken: string | null;
    originalSuperAdminUser: AuthUser | null;
}

const initialState: AuthState = {
    token: localStorage.getItem('auth_token'),
    user: (() => {
        try {
            const stored = localStorage.getItem('auth_user');
            return stored ? (JSON.parse(stored) as AuthUser) : null;
        } catch {
            return null;
        }
    })(),
    originalSuperAdminToken: localStorage.getItem('original_super_admin_token'),
    originalSuperAdminUser: (() => {
        try {
            const stored = localStorage.getItem('original_super_admin_user');
            return stored ? (JSON.parse(stored) as AuthUser) : null;
        } catch {
            return null;
        }
    })(),
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setAuth(
            state,
            action: PayloadAction<{ token: string; user: AuthUser }>,
        ) {
            state.token = action.payload.token;
            state.user = action.payload.user;
            localStorage.setItem('auth_token', action.payload.token);
            localStorage.setItem('auth_user', JSON.stringify(action.payload.user));
        },
        switchToCompany(
            state,
            action: PayloadAction<{ token: string; user: AuthUser }>,
        ) {
            if (state.token && !state.originalSuperAdminToken) {
                state.originalSuperAdminToken = state.token;
                state.originalSuperAdminUser = state.user;
                localStorage.setItem('original_super_admin_token', state.token);
                if (state.user) {
                    localStorage.setItem('original_super_admin_user', JSON.stringify(state.user));
                }
            }
            state.token = action.payload.token;
            state.user = action.payload.user;
            localStorage.setItem('auth_token', action.payload.token);
            localStorage.setItem('auth_user', JSON.stringify(action.payload.user));
        },
        returnFromSwitched(
            state,
            action: PayloadAction<{ token: string; user: AuthUser }>,
        ) {
            state.token = action.payload.token;
            state.user = action.payload.user;
            state.originalSuperAdminToken = null;
            state.originalSuperAdminUser = null;
            localStorage.setItem('auth_token', action.payload.token);
            localStorage.setItem('auth_user', JSON.stringify(action.payload.user));
            localStorage.removeItem('original_super_admin_token');
            localStorage.removeItem('original_super_admin_user');
        },
        updateAuthUser(state, action: PayloadAction<Partial<AuthUser>>) {
            if (!state.user) return;
            state.user = { ...state.user, ...action.payload };
            localStorage.setItem('auth_user', JSON.stringify(state.user));
        },
        clearAuth(state) {
            state.token = null;
            state.user = null;
            state.originalSuperAdminToken = null;
            state.originalSuperAdminUser = null;
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            localStorage.removeItem('original_super_admin_token');
            localStorage.removeItem('original_super_admin_user');
        },
    },
});

export const { setAuth, switchToCompany, returnFromSwitched, updateAuthUser, clearAuth } = authSlice.actions;
export default authSlice.reducer;

export const selectAuthUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthToken = (state: { auth: AuthState }) => state.auth.token;
export const selectIsSwitched = (state: { auth: AuthState }) =>
    Boolean(state.auth.user?.isSwitched || state.auth.originalSuperAdminToken);
export const selectOriginalSuperAdminToken = (state: { auth: AuthState }) => state.auth.originalSuperAdminToken;
