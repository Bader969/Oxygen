import { describe, it, expect } from 'vitest';
import { 
    getUserRole, 
    canDeleteTicket, 
    canManageUsers, 
    canAccessAdminPanel 
} from '../src/lib/permissions';

describe('Roles & Permissions Verification', () => {
    it('recognizes root admin email regardless of metadata', () => {
        const rootAdminUser = { email: 'admin@oxygen.com', user_metadata: { role: 'technician' } };
        expect(getUserRole(rootAdminUser)).toBe('admin');
        expect(canDeleteTicket(rootAdminUser)).toBe(true);
        expect(canManageUsers(rootAdminUser)).toBe(true);
        expect(canAccessAdminPanel(rootAdminUser)).toBe(true);
    });

    it('recognizes metadata admin user', () => {
        const metadataAdmin = { email: 'boss@oxygen.com', user_metadata: { role: 'admin' } };
        expect(getUserRole(metadataAdmin)).toBe('admin');
        expect(canDeleteTicket(metadataAdmin)).toBe(true);
        expect(canManageUsers(metadataAdmin)).toBe(true);
        expect(canAccessAdminPanel(metadataAdmin)).toBe(true);
    });

    it('blocks regular technicians from deleting tickets or managing users', () => {
        const technician = { email: 'tech1@oxygen.com', user_metadata: { role: 'technician' } };
        expect(getUserRole(technician)).toBe('technician');
        expect(canDeleteTicket(technician)).toBe(false);
        expect(canManageUsers(technician)).toBe(false);
        expect(canAccessAdminPanel(technician)).toBe(false);
    });

    it('blocks receptionists from deleting tickets or accessing admin panel', () => {
        const receptionist = { email: 'front@oxygen.com', user_metadata: { role: 'receptionist' } };
        expect(getUserRole(receptionist)).toBe('receptionist');
        expect(canDeleteTicket(receptionist)).toBe(false);
        expect(canManageUsers(receptionist)).toBe(false);
        expect(canAccessAdminPanel(receptionist)).toBe(false);
    });

    it('falls back to localStorage role when user metadata is missing', () => {
        const sessionWithoutRole = { email: 'custom@oxygen.com', user_metadata: {} };
        expect(getUserRole(sessionWithoutRole, 'admin')).toBe('admin');
        expect(getUserRole(sessionWithoutRole, 'technician')).toBe('technician');
    });

    it('defaults to technician when session and role are undefined', () => {
        expect(getUserRole(null, null)).toBe('technician');
        expect(canDeleteTicket(null, null)).toBe(false);
    });
});
