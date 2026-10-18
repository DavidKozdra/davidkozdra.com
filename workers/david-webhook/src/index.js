// Relays messages from forms on davidkozdra.com to David's Discord channel.
// A form posts { source, title, fields: [{ name, value, inline }] } and this
// Worker builds the Discord message, so the webhook URL never reaches a browser.

const MAX_BODY_LENGTH = 8 * 1024;
const MAX_FIELDS = 10;
// Discord rejects embeds over 6000 characters in total.
const EMBED_BUDGET = 5500;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((entry) => entry.trim());
    if (!allowedOrigins.includes(origin)) return new Response("Forbidden", { status: 403 });

    const cors = { "Access-Control-Allow-Origin": origin, Vary: "Origin" };
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }
    if (request.method !== "POST") return reply(405, "Use POST.", cors);

    const body = await request.text();
    if (body.length > MAX_BODY_LENGTH) return reply(413, "Message is too long.", cors);

    let message;
    try {
      message = JSON.parse(body);
    } catch {
      return reply(400, "Body must be JSON.", cors);
    }

    const embed = toEmbed(message);
    if (!embed) return reply(400, "Expected a title and a fields array.", cors);

    const discord = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Keep visitors from pinging @everyone through form text.
      body: JSON.stringify({ allowed_mentions: { parse: [] }, embeds: [embed] })
    });
    if (!discord.ok) {
      console.error("Discord rejected the message", discord.status, await discord.text());
      return reply(502, "Couldn't deliver the message.", cors);
    }

    return new Response(null, { status: 204, headers: cors });
  }
};

function reply(status, text, headers) {
  return new Response(text, { status, headers: { ...headers, "Content-Type": "text/plain" } });
}

function clip(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function toEmbed(message) {
  const title = clip(message?.title, 256);
  if (!title || !Array.isArray(message.fields)) return null;

  const source = clip(message.source, 100);
  let budget = EMBED_BUDGET - title.length - source.length;
  const fields = [];
  for (const field of message.fields.slice(0, MAX_FIELDS)) {
    const name = clip(field?.name, 256);
    const value = clip(field?.value, 1024);
    if (!name || !value || name.length + value.length > budget) continue;
    budget -= name.length + value.length;
    fields.push({ name, value, inline: field.inline === true });
  }

  return {
    title,
    color: 0xd4af37,
    fields,
    ...(source && { footer: { text: source } }),
    timestamp: new Date().toISOString()
  };
}
