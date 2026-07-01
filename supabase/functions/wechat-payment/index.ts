import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Aes } from "npm:wechatpay-axios-plugin";

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const MCH_API_V3_KEY = Deno.env.get("MCH_API_V3_KEY") || "";

    // Decrypt callback data
    const { resource } = body;
    const plaintext = await Aes.AesGcm.decrypt(
      resource.ciphertext,
      MCH_API_V3_KEY,
      resource.nonce,
      resource.associated_data
    );
    const obj = JSON.parse(plaintext);

    const trade_state = obj.trade_state;
    const order_no = obj.out_trade_no;

    if (trade_state === "SUCCESS") {
      // 1. Get order info
      const { data: order, error: orderError } = await supabaseClient
        .from("orders")
        .select("*")
        .eq("order_no", order_no)
        .single();

      if (orderError || !order) {
        throw new Error("Order does not exist");
      }

      if (order.status !== "paid") {
        // 2. Update order status
        const { error: updateError } = await supabaseClient
          .from("orders")
          .update({ status: "paid", updated_at: new Date().toISOString() })
          .eq("order_no", order_no)
          .eq("status", "pending");

        if (updateError) {
          throw new Error("Failed to update order status");
        }

        // 3. Upgrade membership
        // 这里可以直接调用之前创建的 upgrade_membership RPC 或逻辑
        // 我们在数据库层面已经有了 upgrade_membership 函数
        await supabaseClient.rpc("upgrade_membership", {
          p_user_id: order.user_id,
          p_plan: order.plan_type,
          p_amount: order.total_amount,
        });

        console.log(`[SUCCESS] 订单 ${order_no} Payment successful, membership activated`);
      }
    }

    return new Response(JSON.stringify({ code: "SUCCESS", message: "Success" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error(`[ERROR] Webhook processing failed: ${error.message}`);
    return new Response(JSON.stringify({ code: "FAIL", message: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
