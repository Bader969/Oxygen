import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req) => {
  try {
    const body = await req.json();
    const { record, old_record } = body;

    // Only proceed if record exists
    if (!record || !record.customer_id) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
    }

    // Initialize Supabase client using Service Role key to bypass RLS for internal tasks
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the associated customer
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("name, preferred_language, phone")
      .eq("id", record.customer_id)
      .single();

    if (customerError || !customer) {
      console.error("Error fetching customer:", customerError);
      return new Response(JSON.stringify({ error: "Customer not found" }), { status: 404 });
    }

    // Construct the dynamic payload requested by the pipeline
    const automationPayload = {
      customer_name: customer.name,
      customer_phone: customer.phone,
      device_model: record.device_model,
      status: record.status,
      cost: record.cost,
      preferred_language: customer.preferred_language,
      qr_hash: record.qr_hash,
      repair_id: record.id,
      timestamp: new Date().toISOString()
    };

    // The external webhook URL (Make.com, Whapi, etc.) should be stored as an Edge Function Secret
    const webhookUrl = Deno.env.get("EXTERNAL_WEBHOOK_URL");
    
    if (webhookUrl) {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(automationPayload)
      });
      
      if (!response.ok) {
        console.error("Failed to trigger external webhook:", await response.text());
      } else {
        console.log("Successfully triggered external webhook with payload:", automationPayload);
      }
    } else {
      console.warn("EXTERNAL_WEBHOOK_URL not set. Payload generated but not sent. Payload:", automationPayload);
    }

    return new Response(JSON.stringify({ success: true, payload: automationPayload }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Error processing webhook:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
