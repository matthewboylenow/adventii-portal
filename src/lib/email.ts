import Mailjet from 'node-mailjet';

const mailjetApiKey = process.env.MAILJET_API_KEY;
const mailjetSecretKey = process.env.MAILJET_SECRET_KEY;

let mailjetClient: Mailjet | null = null;

function getMailjet(): Mailjet {
  if (!mailjetClient) {
    if (!mailjetApiKey || !mailjetSecretKey) {
      throw new Error('Mailjet API keys are not configured');
    }
    mailjetClient = new Mailjet({
      apiKey: mailjetApiKey,
      apiSecret: mailjetSecretKey,
    });
  }
  return mailjetClient;
}

interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  textContent: string;
  htmlContent: string;
}

export async function sendEmail(options: SendEmailOptions) {
  const mailjet = getMailjet();

  const result = await mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        From: {
          Email: process.env.MAILJET_FROM_EMAIL || 'noreply@adventiimedia.com',
          Name: process.env.MAILJET_FROM_NAME || 'Adventii Media',
        },
        To: [
          {
            Email: options.to,
            Name: options.toName || options.to,
          },
        ],
        Subject: options.subject,
        TextPart: options.textContent,
        HTMLPart: options.htmlContent,
      },
    ],
  });

  return result;
}

interface InvoiceEmailOptions {
  invoiceNumber: string;
  invoiceId: string;
  recipientEmail: string;
  recipientName: string;
  organizationName: string;
  amountDue: string;
  dueDate?: string;
}

export async function sendInvoiceEmail(options: InvoiceEmailOptions) {
  const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.adventii.com';
  const invoiceUrl = `${portalUrl}/invoices/${options.invoiceId}`;

  const subject = `Invoice ${options.invoiceNumber} from Adventii Media`;

  const textContent = `
Hello ${options.recipientName},

A new invoice has been issued for ${options.organizationName}.

Invoice Number: ${options.invoiceNumber}
Amount Due: ${options.amountDue}
${options.dueDate ? `Due Date: ${options.dueDate}` : ''}

View and pay your invoice online:
${invoiceUrl}

Thank you for your business!

Adventii Media
Real Solutions. Real Results.
  `.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1A1A1A; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="font-size: 24px; letter-spacing: 2px; color: #6B46C1; margin: 0;">ADVENTII MEDIA</h1>
  </div>

  <div style="background: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
    <p style="margin: 0 0 20px 0;">Hello ${options.recipientName},</p>

    <p style="margin: 0 0 20px 0;">A new invoice has been issued for <strong>${options.organizationName}</strong>.</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #525252;">Invoice Number</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${options.invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #525252;">Amount Due</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #6B46C1; font-size: 18px;">${options.amountDue}</td>
        </tr>
        ${options.dueDate ? `
        <tr>
          <td style="padding: 8px 0; color: #525252;">Due Date</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${options.dueDate}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="text-align: center;">
      <a href="${invoiceUrl}" style="display: inline-block; background: #6B46C1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500;">View Invoice</a>
    </div>
  </div>

  <div style="text-align: center; color: #737373; font-size: 14px;">
    <p style="margin: 0 0 10px 0;">Thank you for your business!</p>
    <p style="margin: 0; font-weight: 500;">Adventii Media</p>
    <p style="margin: 5px 0 0 0; font-size: 12px;">Real Solutions. Real Results.</p>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to: options.recipientEmail,
    toName: options.recipientName,
    subject,
    textContent,
    htmlContent,
  });
}

interface ApprovalRequestEmailOptions {
  workOrderId: string;
  eventName: string;
  eventDate: string;
  approverEmail: string;
  approverName: string;
  approvalToken: string;
}

export async function sendApprovalRequestEmail(options: ApprovalRequestEmailOptions) {
  const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.adventii.com';
  const approvalUrl = `${portalUrl}/approve/${options.approvalToken}`;

  const subject = `Approval Required: ${options.eventName}`;

  const textContent = `
Hello ${options.approverName},

A work order requires your approval.

Event: ${options.eventName}
Date: ${options.eventDate}

Please review and sign to approve:
${approvalUrl}

Thank you,
Adventii Media
  `.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1A1A1A; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="font-size: 24px; letter-spacing: 2px; color: #6B46C1; margin: 0;">ADVENTII MEDIA</h1>
  </div>

  <div style="background: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
    <p style="margin: 0 0 20px 0;">Hello ${options.approverName},</p>

    <p style="margin: 0 0 20px 0;">A work order requires your approval.</p>

    <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #525252;">Event</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${options.eventName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #525252;">Date</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${options.eventDate}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center;">
      <a href="${approvalUrl}" style="display: inline-block; background: #6B46C1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500;">Review & Approve</a>
    </div>
  </div>

  <div style="text-align: center; color: #737373; font-size: 14px;">
    <p style="margin: 0;">Adventii Media</p>
    <p style="margin: 5px 0 0 0; font-size: 12px;">Real Solutions. Real Results.</p>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to: options.approverEmail,
    toName: options.approverName,
    subject,
    textContent,
    htmlContent,
  });
}
