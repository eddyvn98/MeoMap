const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { orderCode, amount, transactionId, smsContent, apiKey } = await req.json();

    // Validate API key
    const validApiKey = Deno.env.get('SMS_CONFIRM_API_KEY');
    if (apiKey !== validApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify topup exists
    const { data: topup, error: topupError } = await supabase
      .from('topup_requests')
      .select('*')
      .eq('order_code', orderCode)
      .single();

    if (topupError || !topup) {
      return new Response(
        JSON.stringify({ success: false, error: 'Topup not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check already confirmed
    if (topup.status === 'success') {
      return new Response(
        JSON.stringify({ success: true, message: 'Already confirmed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Confirm topup
    const { data: confirmData, error: confirmError } = await supabase.rpc('confirm_topup_payment', {
      p_order_code: orderCode,
      p_transaction_id: transactionId || `SMS_${Date.now()}`,
      p_payment_description: smsContent ? `SMS: ${smsContent.substring(0, 100)}` : 'Nạp tiền qua CK',
    });

    if (confirmError) {
      return new Response(
        JSON.stringify({ success: false, error: confirmError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: confirmData[0] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Deploy: supabase functions deploy sms-confirm
// URL: https://[project-ref].supabase.co/functions/v1/sms-confirm
*/
