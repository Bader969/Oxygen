import { supabase } from './supabaseClient';

export interface RepairTicketPayload {
  customerId: string;
  deviceModel: string;
  issueDescription: string;
  cost?: number;
  deviceId?: string;
}

/**
 * Creates a new repair ticket.
 * Supabase handles generating the UUID and the unique `qr_hash` by default.
 */
export const createRepairTicket = async (payload: RepairTicketPayload) => {
  const insertPayload: any = {
    customer_id: payload.customerId,
    device_model: payload.deviceModel,
    issue_description: payload.issueDescription,
    cost: payload.cost,
    status: 'pending'
  };
  if (payload.deviceId) {
    insertPayload.device_id = payload.deviceId;
  }
  let { data, error } = await supabase
    .from('repairs')
    .insert([insertPayload])
    .select()
    .single();

  // Graceful fallback retry if database schema is not updated/cached with device_id column yet
  if (error && error.message.includes('device_id') && payload.deviceId) {
    console.warn("device_id column not found in repairs table. Retrying insert without device_id...");
    delete insertPayload.device_id;
    const retryRes = await supabase
      .from('repairs')
      .insert([insertPayload])
      .select()
      .single();
    data = retryRes.data;
    error = retryRes.error;
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
 * Fetches users via staff_users view (admins only).
 */
export const getStaffUsers = async () => {
  const { data, error } = await supabase
    .from('staff_users')
    .select('*');

  if (error) {
    console.error('Error fetching staff users:', error);
    throw error;
  }
  return data || [];
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
export const updateRepair = async (id: string, payload: { deviceModel?: string, issueDescription?: string, status?: string, cost?: number }) => {
  const updatePayload: any = {};
  if (payload.deviceModel !== undefined) updatePayload.device_model = payload.deviceModel;
  if (payload.issueDescription !== undefined) updatePayload.issue_description = payload.issueDescription;
  if (payload.status !== undefined) updatePayload.status = payload.status;
  if (payload.cost !== undefined) updatePayload.cost = payload.cost;

  const { data, error } = await supabase
    .from('repairs')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating repair:', error);
    throw error;
  }
  return data;
};
