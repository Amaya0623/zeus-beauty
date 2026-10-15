import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webPush from "npm:web-push";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { title, body } = payload;

    // 🛡️ PARCHE SALVAVIDAS: Garantiza que la suscripción sea un Objeto JSON válido
    let subscription = payload.subscription;
    if (typeof subscription === 'string') {
        subscription = JSON.parse(subscription);
    }

    if (!subscription || !subscription.endpoint) {
        throw new Error('El objeto de suscripción es inválido o está vacío.');
    }

    const PUBLIC_VAPID_KEY = "BHKFJnWSHmcY2Q4o-J93NiUq8SeARR9oDFYLmtaSnud4bBFXiZC4VZzvmCnA5MypqXY-rZdvHwudBGb_mnafQj4";
    const PRIVATE_VAPID_KEY = "Xa3BCekv1jceVq07zvqsoXn_3hzRAi85F9-raHezhe8";

    webPush.setVapidDetails(
      "mailto:soporte@zeusbarber.com",
      PUBLIC_VAPID_KEY,
      PRIVATE_VAPID_KEY
    );

    console.log("🚀 Disparando Push a:", subscription.endpoint);

    const pushResult = await webPush.sendNotification(
        subscription, 
        JSON.stringify({ 
            title: title || 'Zeus Barber Pro', 
            body: body || 'Alguien interactuó con tu sistema.', 
            url: '/' 
        })
    );

    return new Response(JSON.stringify({ success: true, status: pushResult.statusCode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("❌ Falla crítica enviando Push:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
