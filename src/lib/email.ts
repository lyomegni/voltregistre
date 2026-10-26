/** Envoi d'e-mails transactionnels via l'API Brevo. Sans clé configurée, l'envoi est ignoré. */
export async function sendEmail(message: { to: string[]; subject: string; html: string }): Promise<boolean> {
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    console.warn(`[email] BREVO_API_KEY absente : e-mail « ${message.subject} » non envoyé`);
    return false;
  }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: process.env.ALERT_SENDER_EMAIL ?? "alertes@voltregistre.fr", name: "VoltRegistre" },
      to: message.to.map((email) => ({ email })),
      subject: message.subject,
      htmlContent: message.html,
    }),
  });
  if (!res.ok) {
    console.error(`[email] Échec Brevo ${res.status} : ${await res.text()}`);
    return false;
  }
  return true;
}
