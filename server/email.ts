// Resend Integration for Automated Email Delivery
import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

export async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

interface ProductDeliveryData {
  customerEmail: string;
  customerName: string;
  orderId: string;
  products: Array<{
    name: string;
    category: string;
    price: string;
  }>;
  totalAmount: string;
  blockchainTxId: string;
}

function getDeliveryContent(product: { name: string; category: string }): string {
  const category = product.category?.toLowerCase() || '';
  
  if (category.includes('coaching') || category.includes('session')) {
    return `
      <div style="background: #1a1a2e; padding: 20px; border-radius: 8px; margin: 15px 0;">
        <h3 style="color: #00d9ff; margin: 0 0 10px 0;">📅 Book Your Session</h3>
        <p style="color: #ccc; margin: 0;">Your Executive Transformation Session is ready to be scheduled. Click below to choose your preferred time:</p>
        <a href="https://calendly.com/masowe-faith-group/executive-session" style="display: inline-block; background: #00d9ff; color: #000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 15px;">Schedule Your Session →</a>
        <p style="color: #888; font-size: 12px; margin-top: 15px;">Sessions include: Pre-session assessment • 90-minute breakthrough call • Recording • 30-day action plan</p>
      </div>
    `;
  }
  
  if (category.includes('course') || category.includes('masterclass')) {
    return `
      <div style="background: #1a1a2e; padding: 20px; border-radius: 8px; margin: 15px 0;">
        <h3 style="color: #00d9ff; margin: 0 0 10px 0;">🎓 Access Your Course</h3>
        <p style="color: #ccc; margin: 0;">Your course is ready! Access all modules, workbooks, and bonus materials:</p>
        <a href="https://courses.masowefaithgroup.com/access" style="display: inline-block; background: #00d9ff; color: #000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 15px;">Start Learning →</a>
        <p style="color: #888; font-size: 12px; margin-top: 15px;">Lifetime access • All future updates included</p>
      </div>
    `;
  }
  
  if (category.includes('audio') || category.includes('meditation')) {
    return `
      <div style="background: #1a1a2e; padding: 20px; border-radius: 8px; margin: 15px 0;">
        <h3 style="color: #00d9ff; margin: 0 0 10px 0;">🎧 Download Your Audio Program</h3>
        <p style="color: #ccc; margin: 0;">Your audio files are ready for download:</p>
        <a href="https://downloads.masowefaithgroup.com/audio" style="display: inline-block; background: #00d9ff; color: #000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 15px;">Download Now →</a>
        <p style="color: #888; font-size: 12px; margin-top: 15px;">High-quality MP3 files • Accompanying scripts included</p>
      </div>
    `;
  }
  
  if (category.includes('e-book') || category.includes('ebook')) {
    return `
      <div style="background: #1a1a2e; padding: 20px; border-radius: 8px; margin: 15px 0;">
        <h3 style="color: #00d9ff; margin: 0 0 10px 0;">📚 Download Your E-Book</h3>
        <p style="color: #ccc; margin: 0;">Your digital book is ready:</p>
        <a href="https://downloads.masowefaithgroup.com/ebooks" style="display: inline-block; background: #00d9ff; color: #000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 15px;">Download PDF →</a>
        <p style="color: #888; font-size: 12px; margin-top: 15px;">PDF format • Works on all devices</p>
      </div>
    `;
  }
  
  if (category.includes('workbook') || category.includes('planner')) {
    return `
      <div style="background: #1a1a2e; padding: 20px; border-radius: 8px; margin: 15px 0;">
        <h3 style="color: #00d9ff; margin: 0 0 10px 0;">📝 Download Your Workbook</h3>
        <p style="color: #ccc; margin: 0;">Your interactive workbook is ready:</p>
        <a href="https://downloads.masowefaithgroup.com/workbooks" style="display: inline-block; background: #00d9ff; color: #000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 15px;">Download Now →</a>
        <p style="color: #888; font-size: 12px; margin-top: 15px;">Print-ready PDF • Compatible with GoodNotes & Notability</p>
      </div>
    `;
  }
  
  return `
    <div style="background: #1a1a2e; padding: 20px; border-radius: 8px; margin: 15px 0;">
      <h3 style="color: #00d9ff; margin: 0 0 10px 0;">📦 Access Your Product</h3>
      <p style="color: #ccc; margin: 0;">Your digital product is ready:</p>
      <a href="https://downloads.masowefaithgroup.com/products" style="display: inline-block; background: #00d9ff; color: #000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 15px;">Access Now →</a>
    </div>
  `;
}

export async function sendOrderConfirmation(data: ProductDeliveryData): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const productDeliveryBlocks = data.products.map(p => `
      <div style="border-bottom: 1px solid #333; padding: 15px 0;">
        <h4 style="color: #fff; margin: 0;">${p.name}</h4>
        <p style="color: #888; margin: 5px 0;">$${p.price}</p>
        ${getDeliveryContent(p)}
      </div>
    `).join('');

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; background: #0a0a0f; font-family: 'Segoe UI', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #00d9ff; font-size: 24px; margin: 0; font-family: 'Cormorant Garamond', Georgia, serif;">MASOWE FAITH GROUP LTD</h1>
      <p style="color: #666; font-size: 12px; font-family: 'Space Mono', monospace; margin: 5px 0;">Autonomous Global Ledger System</p>
    </div>
    
    <!-- Main Content -->
    <div style="background: #12121a; border: 1px solid #1e1e2e; border-radius: 12px; padding: 30px;">
      
      <h2 style="color: #00d9ff; margin: 0 0 10px 0;">✨ Thank You For Your Order!</h2>
      <p style="color: #ccc; margin: 0 0 20px 0;">Dear ${data.customerName || 'Valued Customer'},</p>
      <p style="color: #aaa; margin: 0 0 25px 0;">Your purchase has been verified and recorded on our blockchain. Here's everything you need:</p>
      
      <!-- Order Details -->
      <div style="background: #0a0a0f; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
        <p style="color: #888; font-size: 12px; margin: 0 0 5px 0;">ORDER ID</p>
        <p style="color: #fff; font-family: 'Space Mono', monospace; margin: 0;">${data.orderId}</p>
      </div>
      
      <!-- Products with Delivery -->
      <h3 style="color: #fff; margin: 0 0 15px 0;">Your Products</h3>
      ${productDeliveryBlocks}
      
      <!-- Total -->
      <div style="background: #1a1a2e; padding: 15px; border-radius: 8px; margin-top: 20px; display: flex; justify-content: space-between;">
        <span style="color: #888;">Total Paid</span>
        <span style="color: #00d9ff; font-weight: bold; font-size: 18px;">$${data.totalAmount}</span>
      </div>
      
      <!-- Blockchain Verification -->
      <div style="border-top: 1px solid #333; margin-top: 25px; padding-top: 20px;">
        <p style="color: #888; font-size: 12px; margin: 0 0 5px 0;">🔗 BLOCKCHAIN VERIFICATION</p>
        <p style="color: #00d9ff; font-family: 'Space Mono', monospace; font-size: 11px; word-break: break-all; margin: 0;">${data.blockchainTxId}</p>
        <p style="color: #666; font-size: 11px; margin: 10px 0 0 0;">This transaction is permanently recorded on the MASOWE Global Ledger with SHA-256 cryptographic proof.</p>
      </div>
      
    </div>
    
    <!-- Support Section -->
    <div style="text-align: center; margin-top: 30px; padding: 20px; background: #12121a; border-radius: 8px;">
      <p style="color: #888; margin: 0 0 10px 0;">Need help? Our AI assistant is available 24/7</p>
      <a href="${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : ''}/store" style="color: #00d9ff; text-decoration: none;">Visit our store →</a>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 30px;">
      <p style="color: #666; font-size: 11px; margin: 0;">MASOWE FAITH GROUP LTD</p>
      <p style="color: #444; font-size: 10px; margin: 5px 0;">Operated by HRH SAINT TARIRO MASAWI</p>
      <p style="color: #333; font-size: 9px; font-family: 'Space Mono', monospace;">Identity Key: MKEY-MNM-TAC-001-2024</p>
    </div>
    
  </div>
</body>
</html>
    `;

    await client.emails.send({
      from: fromEmail || 'MASOWE FAITH GROUP <onboarding@resend.dev>',
      to: data.customerEmail,
      subject: `✨ Your Order is Ready - ${data.products[0]?.name || 'Digital Products'}`,
      html: emailHtml,
    });

    console.log(`[EMAIL] Order confirmation sent to ${data.customerEmail} for order ${data.orderId}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send order confirmation:', error);
    return false;
  }
}

export async function sendFollowUpEmail(customerEmail: string, customerName: string, productName: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background: #0a0a0f; font-family: 'Segoe UI', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #00d9ff; font-size: 24px; margin: 0;">MASOWE FAITH GROUP LTD</h1>
    </div>
    <div style="background: #12121a; border-radius: 12px; padding: 30px;">
      <h2 style="color: #fff; margin: 0 0 15px 0;">How's your journey going? 🌟</h2>
      <p style="color: #ccc;">Hi ${customerName || 'there'},</p>
      <p style="color: #aaa;">We hope you're enjoying <strong style="color: #00d9ff;">${productName}</strong>!</p>
      <p style="color: #aaa;">If you have any questions or need support, our AI assistant is available 24/7 to help you.</p>
      <p style="color: #888; margin-top: 25px;">Blessings on your transformation journey,<br><span style="color: #00d9ff;">The MASOWE Team</span></p>
    </div>
  </div>
</body>
</html>
    `;

    await client.emails.send({
      from: fromEmail || 'MASOWE FAITH GROUP <onboarding@resend.dev>',
      to: customerEmail,
      subject: `How's your journey with ${productName}? 🌟`,
      html: emailHtml,
    });

    console.log(`[EMAIL] Follow-up sent to ${customerEmail}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send follow-up:', error);
    return false;
  }
}
