import Mailjet from 'node-mailjet';

const mailjetApiKey = process.env.MAILJET_API_KEY;
const mailjetSecretKey = process.env.MAILJET_SECRET_KEY;

let mailjetClient: Mailjet | null = null;

function getMailjet(): Mailjet | null {
  if (!mailjetApiKey || !mailjetSecretKey) {
    console.warn('Mailjet API keys are not configured - emails will be skipped');
    return null;
  }
  if (!mailjetClient) {
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
  cc?: string[];
  subject: string;
  textContent: string;
  htmlContent: string;
}

export async function sendEmail(options: SendEmailOptions) {
  const mailjet = getMailjet();

  if (!mailjet) {
    console.warn('Skipping email send - Mailjet not configured');
    return null;
  }

  const message: Record<string, unknown> = {
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
  };

  if (options.cc && options.cc.length > 0) {
    message.Cc = options.cc.map((email) => ({ Email: email, Name: email }));
  }

  const result = await mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [message],
  });

  return result;
}

interface InvoiceLineItemEmail {
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
}

interface InvoiceEmailOptions {
  invoiceNumber: string;
  invoiceId: string;
  recipientEmail: string;
  recipientName: string;
  organizationName: string;
  amountDue: string;
  dueDate?: string;
  lineItems?: InvoiceLineItemEmail[];
  viewToken?: string;
  cc?: string[];
  customSubject?: string;
  customMessage?: string;
}

function formatCurrencyEmail(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

export async function sendInvoiceEmail(options: InvoiceEmailOptions) {
  const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.adventii.com';
  const invoiceUrl = options.viewToken
    ? `${portalUrl}/invoice/${options.viewToken}`
    : `${portalUrl}/invoices/${options.invoiceId}`;

  const subject = options.customSubject || `Invoice ${options.invoiceNumber} from Adventii Media`;

  const defaultGreeting = `A new invoice has been issued for ${options.organizationName}.`;
  const messageBody = options.customMessage || defaultGreeting;

  // Build line items text
  const lineItemsText = options.lineItems && options.lineItems.length > 0
    ? '\nLine Items:\n' + options.lineItems.map(
        (li) => `  - ${li.description}: ${formatCurrencyEmail(li.amount)}`
      ).join('\n') + '\n'
    : '';

  const textContent = `
Hello ${options.recipientName},

${messageBody}

Invoice Number: ${options.invoiceNumber}
Amount Due: ${options.amountDue}
${options.dueDate ? `Due Date: ${options.dueDate}` : ''}
${lineItemsText}
View your invoice online:
${invoiceUrl}

Thank you for your business!

Adventii Media
Real Solutions. Real Results.
  `.trim();

  // Build line items HTML
  const lineItemsHtml = options.lineItems && options.lineItems.length > 0
    ? `
    <div style="background: white; border-radius: 8px; padding: 0; margin-bottom: 20px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #525252; text-transform: uppercase; font-weight: 500;">Description</th>
            <th style="padding: 10px 16px; text-align: right; font-size: 12px; color: #525252; text-transform: uppercase; font-weight: 500;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${options.lineItems.map((li) => `
          <tr style="border-top: 1px solid #f3f4f6;">
            <td style="padding: 10px 16px; font-size: 14px; color: #1A1A1A;">${li.description}</td>
            <td style="padding: 10px 16px; font-size: 14px; color: #1A1A1A; text-align: right; font-weight: 500;">${formatCurrencyEmail(li.amount)}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    `
    : '';

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

    <p style="margin: 0 0 20px 0; white-space: pre-line;">${messageBody.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>

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

    ${lineItemsHtml}

    <div style="text-align: center;">
      <a href="${invoiceUrl}" style="display: inline-block; background: #6B46C1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500;">View Invoice Details</a>
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
    cc: options.cc,
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

// ============================================================================
// INVOICE REMINDER EMAIL
// ============================================================================

interface InvoiceReminderEmailOptions {
  invoiceNumber: string;
  recipientEmail: string;
  recipientName: string;
  amountDue: string;
  dueDate?: string;
  viewToken: string;
  cc?: string[];
}

export async function sendInvoiceReminderEmail(options: InvoiceReminderEmailOptions) {
  const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.adventii.com';
  const invoiceUrl = `${portalUrl}/invoice/${options.viewToken}`;

  const subject = `Reminder: Invoice ${options.invoiceNumber} from Adventii Media`;

  const textContent = `
Hello ${options.recipientName},

This is a friendly reminder that invoice ${options.invoiceNumber} is still outstanding.

Amount Due: ${options.amountDue}
${options.dueDate ? `Due Date: ${options.dueDate}` : ''}

View your invoice online:
${invoiceUrl}

If you have already made payment, please disregard this reminder.

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

    <p style="margin: 0 0 20px 0;">This is a friendly reminder that invoice <strong>${options.invoiceNumber}</strong> is still outstanding.</p>

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

    <p style="margin: 20px 0 0 0; font-size: 13px; color: #737373;">If you have already made payment, please disregard this reminder.</p>
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
    cc: options.cc,
    subject,
    textContent,
    htmlContent,
  });
}

// ============================================================================
// COMMENT NOTIFICATION EMAILS
// ============================================================================

interface CommentNotificationOptions {
  invoiceNumber: string;
  invoiceId: string;
  commentAuthor: string;
  commentContent: string;
  viewUrl: string;
  recipientEmail: string;
  recipientName: string;
}

export async function sendCommentNotificationToStaff(options: CommentNotificationOptions) {
  const subject = `New question on Invoice ${options.invoiceNumber}`;

  const textContent = `
Hello ${options.recipientName},

${options.commentAuthor} asked a question on invoice ${options.invoiceNumber}:

"${options.commentContent}"

View and reply:
${options.viewUrl}

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
    <p style="margin: 0 0 20px 0;">Hello ${options.recipientName},</p>

    <p style="margin: 0 0 10px 0;"><strong>${options.commentAuthor}</strong> asked a question on invoice <strong>${options.invoiceNumber}</strong>:</p>

    <div style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #6B46C1;">
      <p style="margin: 0; color: #525252; white-space: pre-line;">${options.commentContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    </div>

    <div style="text-align: center;">
      <a href="${options.viewUrl}" style="display: inline-block; background: #6B46C1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500;">View & Reply</a>
    </div>
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

export async function sendCommentNotificationToClient(options: CommentNotificationOptions) {
  const subject = `Reply on Invoice ${options.invoiceNumber}`;

  const textContent = `
Hello ${options.recipientName},

${options.commentAuthor} replied to your question on invoice ${options.invoiceNumber}:

"${options.commentContent}"

View the full conversation:
${options.viewUrl}

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
    <p style="margin: 0 0 20px 0;">Hello ${options.recipientName},</p>

    <p style="margin: 0 0 10px 0;"><strong>${options.commentAuthor}</strong> replied to your question on invoice <strong>${options.invoiceNumber}</strong>:</p>

    <div style="background: white; border-radius: 8px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #6B46C1;">
      <p style="margin: 0; color: #525252; white-space: pre-line;">${options.commentContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    </div>

    <div style="text-align: center;">
      <a href="${options.viewUrl}" style="display: inline-block; background: #6B46C1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 500;">View Conversation</a>
    </div>
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
