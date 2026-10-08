import { supabase } from './supabaseClient';

export interface RepairTicketPayload {
  customerId: string;
  deviceModel: string;
  issueDescription: string;
  cost?: number;
  deposit?: number;
  paymentMethod?: string;
  deviceId?: string;
  priority?: 'normal' | 'express' | 'low';
  estimatedCompletion?: string | null;
  devicePasscode?: string;
  intakeCondition?: string;
  accessories?: string;
  technicianNotes?: string;
  warrantyMonths?: number;
  completedAt?: string | null;
}

/**
 * Creates a new repair ticket.
 * Supabase handles generating the UUID and the unique `qr_hash` by default.
 */
export const createRepairTicket = async (payload: RepairTicketPayload) => {
  // If deposit is specified, also note it in technician_notes as fallback persistence
  let techNotes = payload.technicianNotes || '';
  if (payload.deposit !== undefined && payload.deposit > 0) {
    const remaining = Math.max(0, (payload.cost || 0) - payload.deposit);
    const depositNote = `[KAPORA: ₺${payload.deposit} | KALAN: ₺${remaining}${payload.paymentMethod ? ` | ÖDEME: ${payload.paymentMethod}` : ''}]`;
    if (!techNotes.includes('KAPORA:')) {
      techNotes = techNotes ? `${depositNote}\n${techNotes}` : depositNote;
    }
  }

  const insertPayload: any = {
    customer_id: payload.customerId,
    device_model: payload.deviceModel,
    issue_description: payload.issueDescription,
    cost: payload.cost,
    status: 'pending',
    priority: payload.priority || 'normal',
    estimated_completion: payload.estimatedCompletion || null,
    device_passcode: payload.devicePasscode || null,
    intake_condition: payload.intakeCondition || null,
    accessories: payload.accessories || null,
    technician_notes: techNotes || null,
    warranty_months: payload.warrantyMonths ?? 3
  };
  if (payload.deposit !== undefined) insertPayload.deposit = payload.deposit;
  if (payload.paymentMethod) insertPayload.payment_method = payload.paymentMethod;
  if (payload.deviceId) {
    insertPayload.device_id = payload.deviceId;
  }

  let { data, error } = await supabase
    .from('repairs')
    .insert([insertPayload])
    .select()
    .single();

  // Graceful fallback retry if database schema is not updated with extra columns yet
  if (error && (error.message.includes('column') || error.message.includes('device_id'))) {
    console.warn("Extended columns not fully migrated in repairs table. Retrying with basic columns...", error.message);
    const fallbackPayload: any = {
      customer_id: payload.customerId,
      device_model: payload.deviceModel,
      issue_description: payload.issueDescription,
      cost: payload.cost,
      status: 'pending'
    };
    if (payload.deviceId) fallbackPayload.device_id = payload.deviceId;

    const retryRes = await supabase
      .from('repairs')
      .insert([fallbackPayload])
      .select()
      .single();

    if (retryRes.error && retryRes.error.message.includes('device_id')) {
      delete fallbackPayload.device_id;
      const retryWithoutDevice = await supabase
        .from('repairs')
        .insert([fallbackPayload])
        .select()
        .single();
      data = retryWithoutDevice.data;
      error = retryWithoutDevice.error;
    } else {
      data = retryRes.data;
      error = retryRes.error;
    }
  }

  if (error) {
    console.error('Error creating repair ticket:', error);
    throw error;
  }

  return data;
};

/**
 * Updates a ticket's status or cost.
 * This will trigger the Supabase Database Webhook to notify the Edge Function.
 */
export const updateRepairStatusAndCost = async (repairId: string, status: string, cost?: number) => {
  const updatePayload: any = { status };
  if (cost !== undefined) {
    updatePayload.cost = cost;
  }

  const { data, error } = await supabase
    .from('repairs')
    .update(updatePayload)
    .eq('id', repairId)
    .select()
    .single();

  if (error) {
    console.error('Error updating repair ticket:', error);
    throw error;
  }

  return data;
};

export const getRepairs = async () => {
  const { data, error } = await supabase
    .from('repairs')
    .select(`
      *,
      customers (
        name,
        phone,
        preferred_language
      )
    `)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching repairs:', error);
    throw error;
  }
  return data;
};

/**
 * Fetches the repair record based on a scanned QR hash.
 * Also joins the customer's details.
 */
export const getRepairByQrHash = async (qrHash: string) => {
  const { data, error } = await supabase
    .from('repairs')
    .select(`
      *,
      customers (
        name,
        phone,
        preferred_language
      )
    `)
    .eq('qr_hash', qrHash)
    .single();

  if (error) {
    console.error('Error fetching repair by QR hash:', error);
    throw error;
  }

  return data;
};

/**
 * Utility to create a customer. Required before creating a ticket.
 */
export const createCustomer = async (name: string, phone: string, preferredLanguage: 'ar' | 'tr') => {
  const { data, error } = await supabase
    .from('customers')
    .insert([
      {
        name,
        phone,
        preferred_language: preferredLanguage
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating customer:', error);
    throw error;
  }

  return data;
};

/**
 * Fetches all customers.
 */
export const getCustomers = async () => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching customers:', error);
    throw error;
  }
  return data || [];
};

/**
 * Updates an existing customer's details.
 */
export const updateCustomer = async (id: string, name: string, phone: string, preferredLanguage: 'ar' | 'tr') => {
  const { data, error } = await supabase
    .from('customers')
    .update({ name, phone, preferred_language: preferredLanguage })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
  return data;
};

/**
 * Deletes a customer.
 */
export const deleteCustomer = async (id: string) => {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
};

/**
 * Fetches all devices.
 */
export const getDevices = async () => {
  const { data, error } = await supabase
    .from('devices')
    .select(`
      *,
      customers (
        name
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    // If table doesn't exist yet, return empty list gracefully
    if (error.message.includes('relation "devices" does not exist')) {
      console.warn('Devices table does not exist. Please run migration.');
      return [];
    }
    console.error('Error fetching devices:', error);
    throw error;
  }
  return data || [];
};

/**
 * Creates a new device.
 */
export const createDevice = async (customerId: string, brand: string, model: string, type: string, imei: string) => {
  const { data, error } = await supabase
    .from('devices')
    .insert([{ customer_id: customerId, brand, model, type, imei }])
    .select()
    .single();

  if (error) {
    console.error('Error creating device:', error);
    throw error;
  }
  return data;
};

/**
 * Updates an existing device.
 */
export const updateDevice = async (id: string, brand: string, model: string, type: string, imei: string) => {
  const { data, error } = await supabase
    .from('devices')
    .update({ brand, model, type, imei })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating device:', error);
    throw error;
  }
  return data;
};

/**
 * Deletes a device.
 */
export const deleteDevice = async (id: string) => {
  const { error } = await supabase
    .from('devices')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting device:', error);
    throw error;
  }
};

/**
 * Deletes a repair ticket.
 */
export const deleteRepair = async (id: string) => {
  const { error } = await supabase
    .from('repairs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting repair ticket:', error);
    throw error;
  }
};

/**
 * Fetches users via secure get_staff_users RPC (admins only).
 */
export const getStaffUsers = async () => {
  const { data, error } = await supabase.rpc('get_staff_users');

  if (error) {
    // Fallback to view query in case migration is still pending
    const fallback = await supabase.from('staff_users').select('*');
    if (fallback.error) {
      console.error('Error fetching staff users:', error);
      throw error;
    }
    return fallback.data || [];
  }
  return data || [];
};

/**
 * Fetches extended staff users including name and permissions, with fallback to get_staff_users
 */
export const getStaffUsersExtended = async () => {
  try {
    const { data, error } = await supabase.rpc('get_staff_users_extended');
    if (!error && data) {
      return data;
    }
  } catch (e) {
    console.warn('get_staff_users_extended unavailable, falling back:', e);
  }

  // Graceful fallback to basic getStaffUsers
  const basicUsers = await getStaffUsers();
  return (basicUsers || []).map((u: any) => ({
    ...u,
    name: u.name || u.email?.split('@')[0] || 'User',
    permissions: u.permissions || (u.role === 'admin' 
      ? ['manage_settings', 'view_finances', 'manage_workshop', 'delete_records', 'manage_staff'] 
      : ['manage_workshop'])
  }));
};

/**
 * Admin updates target user's role via RPC.
 */
export const adminUpdateUserRole = async (targetUserId: string, newRole: string) => {
  const { data, error } = await supabase
    .rpc('admin_update_user_role', { target_user_id: targetUserId, new_role: newRole });

  if (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
  return data;
};

/**
 * Admin updates target user's detailed metadata (role, name, permissions)
 */
export const adminUpdateUserDetails = async (
  targetUserId: string,
  details: { role?: string; name?: string; permissions?: string[] }
) => {
  try {
    const { data, error } = await supabase.rpc('admin_update_user_details', {
      target_user_id: targetUserId,
      new_role: details.role || null,
      new_name: details.name || null,
      new_permissions: details.permissions ? JSON.stringify(details.permissions) : null
    });
    if (!error) return data;
    console.warn('admin_update_user_details RPC returned error, attempting fallback:', error);
  } catch (e) {
    console.warn('admin_update_user_details RPC failed, attempting fallback:', e);
  }

  // Fallback to updating just the role if details RPC is not yet loaded in Supabase
  if (details.role) {
    return await adminUpdateUserRole(targetUserId, details.role);
  }
  return true;
};

/**
 * Admin resets target user's password via RPC
 */
export const adminResetUserPassword = async (targetUserId: string, newPassword: string) => {
  const { data, error } = await supabase.rpc('admin_reset_user_password', {
    target_user_id: targetUserId,
    new_password: newPassword
  });

  if (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
  return data;
};

/**
 * Admin deletes target user via RPC.
 */
export const adminDeleteUser = async (targetUserId: string) => {
  const { data, error } = await supabase
    .rpc('admin_delete_user', { target_user_id: targetUserId });

  if (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
  return data;
};

/**
 * Fully updates a repair ticket's details.
 */
export const updateRepair = async (id: string, payload: { 
  deviceModel?: string;
  issueDescription?: string;
  status?: string;
  cost?: number;
  priority?: 'normal' | 'express' | 'low';
  estimatedCompletion?: string | null;
  devicePasscode?: string;
  intakeCondition?: string;
  accessories?: string;
  technicianNotes?: string;
  warrantyMonths?: number;
  completedAt?: string | null;
}) => {
  const updatePayload: any = {};
  if (payload.deviceModel !== undefined) updatePayload.device_model = payload.deviceModel;
  if (payload.issueDescription !== undefined) updatePayload.issue_description = payload.issueDescription;
  if (payload.status !== undefined) updatePayload.status = payload.status;
  if (payload.cost !== undefined) updatePayload.cost = payload.cost;
  if (payload.priority !== undefined) updatePayload.priority = payload.priority;
  if (payload.estimatedCompletion !== undefined) updatePayload.estimated_completion = payload.estimatedCompletion;
  if (payload.devicePasscode !== undefined) updatePayload.device_passcode = payload.devicePasscode;
  if (payload.intakeCondition !== undefined) updatePayload.intake_condition = payload.intakeCondition;
  if (payload.accessories !== undefined) updatePayload.accessories = payload.accessories;
  if (payload.technicianNotes !== undefined) updatePayload.technician_notes = payload.technicianNotes;
  if (payload.warrantyMonths !== undefined) updatePayload.warranty_months = payload.warrantyMonths;
  if (payload.completedAt !== undefined) updatePayload.completed_at = payload.completedAt;

  let { data, error } = await supabase
    .from('repairs')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error && error.message.includes('column')) {
    console.warn("Update with extended columns failed, falling back to basic columns:", error.message);
    const basicPayload: any = {};
    if (payload.deviceModel !== undefined) basicPayload.device_model = payload.deviceModel;
    if (payload.issueDescription !== undefined) basicPayload.issue_description = payload.issueDescription;
    if (payload.status !== undefined) basicPayload.status = payload.status;
    if (payload.cost !== undefined) basicPayload.cost = payload.cost;

    const retry = await supabase.from('repairs').update(basicPayload).eq('id', id).select().single();
    if (retry.error) throw retry.error;
    data = retry.data;
    error = null;
  }

  if (error) {
    console.error('Error updating repair:', error);
    throw error;
  }
  return data;
};

/**
 * Marks a ticket as delivered/completed with timestamp.
 */
export const markRepairDelivered = async (id: string) => {
  return await updateRepair(id, {
    status: 'completed',
    completedAt: new Date().toISOString()
  });
};

