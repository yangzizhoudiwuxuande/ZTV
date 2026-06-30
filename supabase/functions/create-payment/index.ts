import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Wechatpay } from "npm:wechatpay-axios-plugin";
import ShortUniqueId from "npm:short-unique-id";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { sku_code, user_id, plan_type } = await req.json();

    if (!sku_code || !user_id || !plan_type) {
      throw new Error("Missing parameters");
    }

    // 1. Get product info
    const { data: sku, error: skuError } = await supabaseClient
      .from("sku")
      .select("*")
      .eq("sku_code", sku_code)
      .single();

    if (skuError || !sku) {
      throw new Error("Product does not exist");
    }

    // 2. Generate order number
    const uid = new ShortUniqueId({ length: 8 });
    const yymmdd = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const order_no = `ORD-${yymmdd}-${uid.rnd()}`;

    // 3. Call WeChat Pay
    const MERCHANT_ID = Deno.env.get("MERCHANT_ID");
    const MERCHANT_APP_ID = Deno.env.get("MERCHANT_APP_ID");
    const MCH_CERT_SERIAL_NO = Deno.env.get("MCH_CERT_SERIAL_NO");
    const MCH_PRIVATE_KEY = Deno.env.get("MCH_PRIVATE_KEY")?.replace(/\\n/g, '\n');
    const WECHAT_PAY_PUBLIC_KEY_ID = Deno.env.get("WECHAT_PAY_PUBLIC_KEY_ID");
    const WECHAT_PAY_PUBLIC_KEY = Deno.env.get("WECHAT_PAY_PUBLIC_KEY")?.replace(/\\n/g, '\n');

    const notifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/wechat-payment-webhook`;

    const wxpay = new Wechatpay({
      mchid: MERCHANT_ID,
      serial: MCH_CERT_SERIAL_NO,
      privateKey: MCH_PRIVATE_KEY,
      certs: { [WECHAT_PAY_PUBLIC_KEY_ID!]: WECHAT_PAY_PUBLIC_KEY },
    });

    const res = await wxpay.v3.pay.transactions.native.post(
      {
        mchid: MERCHANT_ID,
        out_trade_no: order_no,
        appid: MERCHANT_APP_ID,
        description: `ZTV Premium - ${plan_type === 'monthly' ? 'Monthly' : 'Yearly'}Membership`,
        notify_url: notifyUrl,
        amount: { total: Math.round(sku.price * 100) },
      },
      { headers: { "Wechatpay-Serial": WECHAT_PAY_PUBLIC_KEY_ID } }
    );

    if (!res.data.code_url) {
      throw new Error(res.data.message || "WeChat Pay order creation failed");
    }

    // 4. Save order
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        order_no,
        user_id,
        status: "pending",
        wechat_pay_url: res.data.code_url,
        total_amount: sku.price,
        sku_code,
        plan_type,
      })
      .select()
      .single();

    if (orderError) {
      throw new Error(orderError.message);
    }

    return new Response(JSON.stringify({ order_no: order.order_no, code_url: res.data.code_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
