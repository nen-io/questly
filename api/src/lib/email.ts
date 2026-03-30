import nodemailer from 'nodemailer';

const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = (process.env.SMTP_SECURE || 'false') === 'true';

const isConfigured = Boolean(
    process.env.SMTP_HOST
    && process.env.SMTP_FROM_EMAIL
    && process.env.APP_BASE_URL,
);

const transporter = isConfigured
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: smtpPort,
        secure: smtpSecure,
        auth: process.env.SMTP_USER
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            }
            : undefined,
    })
    : null;

const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

interface ThemeTokens {
    fontSans?: string;
    fontDisplay?: string;
    background?: string;
    foreground?: string;
    card?: string;
    cardForeground?: string;
    primary?: string;
    primaryForeground?: string;
    secondary?: string;
    secondaryForeground?: string;
    accent?: string;
    accentForeground?: string;
    border?: string;
    heroFrom?: string;
    heroVia?: string;
    heroTo?: string;
}

interface EmailTemplateInput {
    appName: string;
    heading: string;
    eyebrow: string;
    intro: string;
    bodyHtml: string;
    ctaLabel?: string;
    ctaUrl?: string;
    footer?: string;
    theme: ThemeTokens;
}

export const canSendEmail = () => isConfigured && Boolean(transporter);

export const renderThemedEmail = (input: EmailTemplateInput) => {
    const theme = {
        background: input.theme.background || '#fff7f2',
        foreground: input.theme.foreground || '#2f1f27',
        card: input.theme.card || '#fffdfb',
        cardForeground: input.theme.cardForeground || '#2f1f27',
        primary: input.theme.primary || '#d65c65',
        primaryForeground: input.theme.primaryForeground || '#fff8f4',
        secondary: input.theme.secondary || '#f7d6c3',
        secondaryForeground: input.theme.secondaryForeground || '#51343c',
        accent: input.theme.accent || '#f2b880',
        accentForeground: input.theme.accentForeground || '#3d241d',
        border: input.theme.border || '#efccbf',
        heroFrom: input.theme.heroFrom || '#fff1e5',
        heroVia: input.theme.heroVia || '#ffd9d5',
        heroTo: input.theme.heroTo || '#f4d7ff',
    };

    return `
      <div style="margin:0;padding:32px 16px;background:${theme.background};font-family:'Segoe UI',Arial,sans-serif;color:${theme.foreground};">
        <div style="max-width:640px;margin:0 auto;border:1px solid ${theme.border};border-radius:28px;overflow:hidden;background:${theme.card};box-shadow:0 24px 80px rgba(15,23,42,0.10);">
          <div style="padding:40px 40px 28px;background:linear-gradient(135deg,${theme.heroFrom},${theme.heroVia},${theme.heroTo});">
            <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:${theme.secondary};color:${theme.secondaryForeground};font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">
              ${escapeHtml(input.eyebrow)}
            </div>
            <h1 style="margin:18px 0 10px;font-size:34px;line-height:1.05;color:${theme.foreground};font-family:Georgia,serif;">
              ${escapeHtml(input.heading)}
            </h1>
            <p style="margin:0;font-size:16px;line-height:1.7;color:${theme.foreground};opacity:0.82;">
              ${escapeHtml(input.intro)}
            </p>
          </div>
          <div style="padding:32px 40px 36px;color:${theme.cardForeground};font-size:15px;line-height:1.75;">
            ${input.bodyHtml}
            ${input.ctaLabel && input.ctaUrl ? `
              <div style="margin-top:28px;">
                <a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;padding:14px 22px;border-radius:16px;background:${theme.primary};color:${theme.primaryForeground};text-decoration:none;font-weight:700;">
                  ${escapeHtml(input.ctaLabel)}
                </a>
              </div>
            ` : ''}
          </div>
          <div style="padding:18px 40px 32px;border-top:1px solid ${theme.border};font-size:13px;line-height:1.7;color:${theme.foreground};opacity:0.68;">
            <p style="margin:0 0 6px;">${escapeHtml(input.appName)}</p>
            <p style="margin:0;">${escapeHtml(input.footer || 'This message was sent because notifications are enabled for your account.')}</p>
          </div>
        </div>
      </div>
    `;
};

export const sendEmail = async (payload: {
    to: string;
    subject: string;
    html: string;
}) => {
    if (!transporter || !canSendEmail()) {
        throw new Error('SMTP is not configured');
    }

    await transporter.sendMail({
        from: process.env.SMTP_FROM_NAME
            ? `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`
            : process.env.SMTP_FROM_EMAIL,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
    });
};
