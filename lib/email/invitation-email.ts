type InvitationEmailParams = {
  toEmail: string;
  inviterEmail: string;
  projectName: string;
  role: 'member' | 'viewer';
  inviteLink: string;
  expiresAt: string;
};

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderInvitationEmailHtml(params: InvitationEmailParams): string {
  const safeProjectName = escapeHtml(params.projectName);
  const safeInviterEmail = escapeHtml(params.inviterEmail);
  const safeRole = params.role === 'member' ? 'Member' : 'Viewer';
  const expiresLabel = new Date(params.expiresAt).toLocaleString();

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>You're invited to ${safeProjectName}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:24px;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <img src="https://blueprintly.ai/favicon.ico" alt="Blueprintly" width="28" height="28" style="border-radius:6px;display:block;" />
                  <span style="color:#e2e8f0;font-size:14px;font-weight:600;letter-spacing:.02em;">Blueprintly</span>
                </div>
                <h1 style="margin:16px 0 0;font-size:24px;line-height:1.2;color:#ffffff;">You've been invited to collaborate</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155;">
                  <strong>${safeInviterEmail}</strong> invited you to join
                  <strong>${safeProjectName}</strong> on Blueprintly.
                </p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                  Your role: <strong>${safeRole}</strong>
                </p>

                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px 0;">
                  <tr>
                    <td align="center" style="border-radius:10px;background:linear-gradient(135deg,#22c55e,#14b8a6);">
                      <a href="${params.inviteLink}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:700;color:#0f172a;text-decoration:none;">
                        Accept invitation
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#64748b;">
                  This link expires on ${escapeHtml(expiresLabel)}.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;word-break:break-all;">
                  If the button doesn't work, copy and paste this URL:<br />
                  ${escapeHtml(params.inviteLink)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendProjectInvitationEmail(params: InvitationEmailParams): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.INVITATION_EMAIL_FROM || process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  if (!fromAddress) {
    throw new Error('INVITATION_EMAIL_FROM (or RESEND_FROM_EMAIL) is not configured');
  }

  const subject = `You're invited to ${params.projectName} on Blueprintly`;
  const html = renderInvitationEmailHtml(params);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [params.toEmail],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to send invitation email: HTTP ${response.status} ${text.slice(0, 300)}`);
  }
}

