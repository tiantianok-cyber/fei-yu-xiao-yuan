import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Find orders completed more than 3 days ago
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: completedOrders, error: fetchError } = await supabase
    .from('orders')
    .select('id, buyer_id, seller_id')
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .lt('completed_at', threeDaysAgo);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let createdCount = 0;

  for (const order of completedOrders || []) {
    // Check what reviews already exist for this order
    const { data: existingReviews } = await supabase
      .from('reviews')
      .select('reviewer_role')
      .eq('order_id', order.id);

    const existingRoles = new Set((existingReviews || []).map(r => r.reviewer_role));

    // Auto-create buyer review (buyer reviews seller) if missing
    if (!existingRoles.has('buyer')) {
      const { error } = await supabase.from('reviews').insert({
        order_id: order.id,
        reviewer_id: order.buyer_id,
        reviewee_id: order.seller_id,
        reviewer_role: 'buyer',
        cooperation_score: 4,
        description_match_score: 4,
        is_default: true,
        content: '系统默认好评',
      });
      if (!error) createdCount++;
    }

    // Auto-create seller review (seller reviews buyer) if missing
    if (!existingRoles.has('seller')) {
      const { error } = await supabase.from('reviews').insert({
        order_id: order.id,
        reviewer_id: order.seller_id,
        reviewee_id: order.buyer_id,
        reviewer_role: 'seller',
        cooperation_score: 4,
        is_default: true,
        content: '系统默认好评',
      });
      if (!error) createdCount++;
    }
  }

  return new Response(JSON.stringify({ success: true, createdCount }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
