export type UserRole = 'admin' | 'technician' | 'receptionist';

export interface UserSessionLike {
    email?: string | null;
    user_metadata?: {
        role?: string;
        [key: string]: any;
    };
}

/**
 * Resolves the role of the user with hardcoded root admin override.
 */
export function getUserRole(user?: UserSessionLike | null, storedRole?: string | null): UserRole {
    if (user?.email === 'admin@oxygen.com') return 'admin';
    const role = (user?.user_metadata?.role || storedRole || 'technician').toLowerCase();
    if (role === 'admin' || role === 'owner') return 'admin';
    if (role === 'receptionist' || role === 'reception') return 'receptionist';
    return 'technician';
}

export function canDeleteTicket(user?: UserSessionLike | null, storedRole?: string | null): boolean {
    return getUserRole(user, storedRole) === 'admin';
}

export function canManageUsers(user?: UserSessionLike | null, storedRole?: string | null): boolean {
    return getUserRole(user, storedRole) === 'admin';
}

export function canAccessAdminPanel(user?: UserSessionLike | null, storedRole?: string | null): boolean {
    return getUserRole(user, storedRole) === 'admin';
}

export function canModifySettings(user?: UserSessionLike | null, storedRole?: string | null): boolean {
    return getUserRole(user, storedRole) === 'admin';
}
