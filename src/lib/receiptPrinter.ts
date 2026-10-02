import { generateQrCodeDataUrl } from './qrUtils';

export interface ReceiptData {
  ticketId: string;
  qrHash: string;
  customerName: string;
  customerPhone?: string;
  deviceModel: string;
  deviceType?: string;
  imei?: string;
  issueDescription: string;
  cost?: number;
  priority?: string;
  createdAt?: string;
  estimatedCompletion?: string | null;
  devicePasscode?: string;
  intakeCondition?: string;
  accessories?: string;
  warrantyMonths?: number;
  lang?: string;
}

export async function generateReceiptHtml(data: ReceiptData): Promise<string> {
  const lang = data.lang || localStorage.getItem('appLang') || 'tr';
  const isAr = lang === 'ar';
  const qrDataUrl = await generateQrCodeDataUrl(data.qrHash);
  const shortId = data.ticketId.split('-')[0].toUpperCase();
  const createdDate = data.createdAt ? new Date(data.createdAt).toLocaleString(isAr ? 'ar-SA' : 'tr-TR') : new Date().toLocaleString(isAr ? 'ar-SA' : 'tr-TR');
  const estDate = data.estimatedCompletion ? new Date(data.estimatedCompletion).toLocaleString(isAr ? 'ar-SA' : 'tr-TR') : null;
  const isExpress = data.priority === 'express';

  const t = {
    shopName: 'OXYGEN TECHNOLOGY',
    shopSub: isAr ? 'مركز صيانة الهواتف الذكية والأجهزة الإلكترونية' : 'Akıllı Telefon & Elektronik Servis Merkezi',
    voucherTitle: isAr ? 'إيصال استلام جهاز / سند صيانة' : 'CİHAZ KABUL & ONARIM FİŞİ',
    ticketNo: isAr ? 'رقم التذكرة:' : 'Talep No:',
    date: isAr ? 'تاريخ الاستلام:' : 'Kabul Tarihi:',
    estDate: isAr ? 'موعد التسليم المتوقع:' : 'Tahmini Teslimat:',
    priority: isAr ? 'الأولوية:' : 'Öncelik:',
    expressBadge: isAr ? '⚡ خدمة مستعجلة (EXPRESS)' : '⚡ ACİL SERVİS (EKSPRES)',
    normalBadge: isAr ? 'عادي (Normal)' : 'Normal',
    customer: isAr ? 'العميل:' : 'Müşteri:',
    phone: isAr ? 'الهاتف:' : 'Telefon:',
    device: isAr ? 'الجهاز:' : 'Cihaz:',
    imei: isAr ? 'IMEI / الرقم التسلسلي:' : 'IMEI / Seri No:',
    passcode: isAr ? 'رمز القفل / النمط:' : 'Kilit Kodu / Desen:',
    issue: isAr ? 'العطل / المشكلة المصرح بها:' : 'Bildirilen Arıza:',
    condition: isAr ? 'حالة الجهاز عند الاستلام (الأضرار السابقة):' : 'Teslim Alınma Durumu (Mevcut Hasarlar):',
    accessories: isAr ? 'الملحقات المسلمة مع الجهاز:' : 'Cihazla Alınan Aksesuarlar:',
    cost: isAr ? 'المبلغ التقديري / المتفق عليه:' : 'Tahmini / Onaylanan Ücret:',
    warranty: isAr ? 'فترة الضمان على القطع المستبدلة:' : 'Değişen Parça Garanti Süresi:',
    months: isAr ? 'أشهر' : 'Ay',
    noPasscode: isAr ? 'بدون رمز' : 'Şifresiz',
    none: isAr ? 'لا يوجد' : 'Yok',
    standardCondition: isAr ? 'سليم، خدوش استعمال عادية' : 'Normal kullanım izleri',
    disclaimerTitle: isAr ? 'شروط وأحكام الخدمة والضمان:' : 'Servis & Garanti Şartları:',
    disclaimer1: isAr 
      ? '1. يجب إبراز هذا الإيصال أو رمزه الإلكتروني عند استلام الجهاز.'
      : '1. Cihaz tesliminde bu servis fişinin ibraz edilmesi zorunludur.',
    disclaimer2: isAr 
      ? '2. المتجر غير مسؤول عن الأجهزة التي لا تُستلم خلال 90 يوماً من إشعار الجاهزية.'
      : '2. Hazır bildirimi yapıldıktan sonra 90 gün içinde teslim alınmayan cihazlardan firmamız sorumlu değildir.',
    disclaimer3: isAr 
      ? '3. الأجهزة المتعرضة للسوائل لا تشملها الكفالة بسبب قابلية تآكل الدوائر لاحقاً.'
      : '3. Sıvı temaslı cihazlar korozyon riski nedeniyle garanti kapsamı dışındadır.',
    disclaimer4: isAr 
      ? '4. الضمان ساري فقط على القطع التي تم استبدالها والمثبتة في الفاتورة.'
      : '4. Verilen garanti sadece servisimizde değiştirilen yedek parçalar için geçerlidir.',
    custSignature: isAr ? 'توقيع العميل' : 'Müşteri İmzası',
    shopSignature: isAr ? 'ختم وتوقيع المركز' : 'Yetkili Servis Kaşe / İmza'
  };

  return `
<!DOCTYPE html>
<html lang="${lang}" dir="${isAr ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8">
  <title>Receipt #TKT-${shortId}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 4mm;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
        background: #fff !important;
        color: #000 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      }
      .no-print {
        display: none !important;
      }
    }
    body {
      background: #f8fafc;
      color: #1e293b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.35;
      margin: 0 auto;
      max-width: 80mm;
      padding: 10px 4px;
    }
    .receipt-box {
      background: #fff;
      border: 1px dashed #cbd5e1;
      padding: 12px 10px;
      box-sizing: border-box;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .shop-title {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin: 0;
      color: #0f172a;
    }
    .shop-subtitle {
      font-size: 9px;
      color: #64748b;
      margin: 2px 0 6px 0;
    }
    .voucher-title {
      font-size: 11px;
      font-weight: 700;
      background: #0f172a;
      color: #fff;
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      margin-top: 2px;
    }
    .express-banner {
      background: #ef4444;
      color: #fff;
      font-weight: 800;
      text-align: center;
      padding: 4px;
      font-size: 11px;
      border-radius: 4px;
      margin: 6px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      padding-bottom: 2px;
      border-bottom: 1px dotted #e2e8f0;
    }
    .label {
      font-weight: 600;
      color: #475569;
      font-size: 10px;
    }
    .val {
      font-weight: 700;
      color: #0f172a;
      text-align: ${isAr ? 'left' : 'right'};
      max-width: 60%;
      word-break: break-word;
    }
    .section-title {
      font-weight: 800;
      font-size: 10px;
      text-transform: uppercase;
      background: #f1f5f9;
      padding: 3px 6px;
      margin: 8px 0 4px 0;
      border-radius: 2px;
      color: #0f172a;
    }
    .highlight-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 6px;
      margin: 4px 0 6px 0;
    }
    .qr-container {
      text-align: center;
      margin: 10px 0;
    }
    .qr-container img {
      width: 130px;
      height: 130px;
      display: inline-block;
      border: 1px solid #cbd5e1;
      padding: 2px;
      background: #fff;
    }
    .hash-text {
      font-family: monospace;
      font-size: 8px;
      color: #64748b;
      margin-top: 3px;
      word-break: break-all;
    }
    .terms {
      font-size: 8px;
      color: #64748b;
      line-height: 1.25;
      margin-top: 8px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 6px;
    }
    .terms p {
      margin: 2px 0;
    }
    .signature-area {
      display: flex;
      justify-content: space-between;
      margin-top: 18px;
      padding-top: 12px;
    }
    .sig-col {
      width: 48%;
      text-align: center;
      border-top: 1px solid #0f172a;
      padding-top: 4px;
      font-size: 9px;
      font-weight: 600;
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="receipt-box">
    <!-- Header -->
    <div class="header">
      <h1 class="shop-title">${t.shopName}</h1>
      <p class="shop-subtitle">${t.shopSub}</p>
      <div class="voucher-title">${t.voucherTitle}</div>
    </div>

    ${isExpress ? `<div class="express-banner">${t.expressBadge}</div>` : ''}

    <!-- Ticket & Date Info -->
    <div class="row">
      <span class="label">${t.ticketNo}</span>
      <span class="val" style="font-size:13px; color:#e11d48;">#TKT-${shortId}</span>
    </div>
    <div class="row">
      <span class="label">${t.date}</span>
      <span class="val">${createdDate}</span>
    </div>
    ${estDate ? `
    <div class="row" style="background:#fef3c7; padding:2px 4px; border-radius:2px;">
      <span class="label" style="color:#b45309;">${t.estDate}</span>
      <span class="val" style="color:#b45309;">${estDate}</span>
    </div>` : ''}

    <!-- Customer Details -->
    <div class="section-title">${isAr ? 'بيانات العميل' : 'Müşteri Bilgileri'}</div>
    <div class="row">
      <span class="label">${t.customer}</span>
      <span class="val">${data.customerName}</span>
    </div>
    <div class="row">
      <span class="label">${t.phone}</span>
      <span class="val">${data.customerPhone || '—'}</span>
    </div>

    <!-- Device Details -->
    <div class="section-title">${isAr ? 'بيانات الجهاز' : 'Cihaz Bilgileri'}</div>
    <div class="row">
      <span class="label">${t.device}</span>
      <span class="val">${data.deviceModel}</span>
    </div>
    ${data.imei ? `
    <div class="row">
      <span class="label">${t.imei}</span>
      <span class="val">${data.imei}</span>
    </div>` : ''}
    <div class="row">
      <span class="label">${t.passcode}</span>
      <span class="val">${data.devicePasscode ? data.devicePasscode : t.noPasscode}</span>
    </div>

    <!-- Condition & Accessories -->
    <div class="highlight-box">
      <div style="font-weight:700; color:#334155; font-size:9.5px; margin-bottom:2px;">${t.condition}</div>
      <div style="font-size:9.5px; color:#0f172a;">${data.intakeCondition || t.standardCondition}</div>
      ${data.accessories ? `
      <div style="margin-top:4px; font-weight:700; color:#334155; font-size:9.5px;">${t.accessories}</div>
      <div style="font-size:9.5px; color:#0f172a;">${data.accessories}</div>` : ''}
    </div>

    <!-- Issue & Pricing -->
    <div class="row">
      <span class="label">${t.issue}</span>
      <span class="val">${data.issueDescription}</span>
    </div>
    <div class="row" style="border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-top:4px;">
      <span class="label" style="font-size:11px; color:#0f172a;">${t.cost}</span>
      <span class="val" style="font-size:14px; color:#059669;">${data.cost ? `₺${data.cost}` : '—'}</span>
    </div>
    <div class="row">
      <span class="label">${t.warranty}</span>
      <span class="val">${data.warrantyMonths || 3} ${t.months}</span>
    </div>

    <!-- QR Tracking Code -->
    <div class="qr-container">
      <img src="${qrDataUrl}" alt="QR Tracking Code">
      <div class="hash-text">${data.qrHash}</div>
      <div style="font-size:9px; font-weight:600; color:#475569; margin-top:2px;">
        ${isAr ? 'امسح الرمز للاستعلام عن حالة الجهاز فوراً' : 'Cihaz durumunu sorgulamak için QR kodu taratın'}
      </div>
    </div>

    <!-- Terms -->
    <div class="terms">
      <div style="font-weight:700; margin-bottom:2px;">${t.disclaimerTitle}</div>
      <p>${t.disclaimer1}</p>
      <p>${t.disclaimer2}</p>
      <p>${t.disclaimer3}</p>
      <p>${t.disclaimer4}</p>
    </div>

    <!-- Signatures -->
    <div class="signature-area">
      <div class="sig-col">${t.custSignature}</div>
      <div class="sig-col">${t.shopSignature}</div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Triggers the browser print dialog for a repair ticket receipt using an invisible iframe
 */
export async function printRepairReceipt(data: ReceiptData): Promise<void> {
  const html = await generateReceiptHtml(data);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!frameDoc) {
    throw new Error('Could not access print frame document');
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  // Wait for images (QR code) to render
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      iframe.remove();
    }, 2000);
  }, 400);
}

/**
 * Opens an interactive printable preview modal in the UI
 */
export async function openReceiptPreviewModal(data: ReceiptData): Promise<void> {
  const lang = data.lang || localStorage.getItem('appLang') || 'tr';
  const isAr = lang === 'ar';
  const html = await generateReceiptHtml(data);

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-[150] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6';

  modal.innerHTML = `
    <div class="glass-panel p-4 sm:p-6 rounded-2xl flex flex-col gap-4 max-w-md w-full max-h-[95vh] overflow-hidden animate-in fade-in zoom-in duration-300">
      <div class="flex items-center justify-between pb-2 border-b border-primary/20">
        <h3 class="font-bold text-lg text-primary flex items-center gap-2">
          <span class="material-symbols-outlined">receipt_long</span>
          ${isAr ? 'معاينة إيصال الاستلام' : 'Makbuz Önizleme'}
        </h3>
        <button id="close-preview-modal" class="text-on-surface-variant hover:text-primary transition-colors p-1">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- Scrollable Receipt Container -->
      <div class="flex-1 overflow-y-auto no-scrollbar rounded-lg shadow-inner bg-white/5 p-2">
        <iframe id="preview-frame" class="w-full min-h-[460px] rounded bg-white" style="border:none;"></iframe>
      </div>

      <!-- Bottom Action Buttons -->
      <div class="flex gap-3 pt-2">
        <button id="cancel-preview-btn" class="w-1/2 bg-black/40 border border-white/10 text-on-surface py-3 rounded-xl font-bold hover:bg-white/5 transition-colors">
          ${isAr ? 'إغلاق' : 'Kapat'}
        </button>
        <button id="do-print-btn" class="w-1/2 btn-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(227,30,36,0.39)]">
          <span class="material-symbols-outlined">print</span>
          ${isAr ? 'طباعة الإيصال' : 'Yazdır'}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const iframe = modal.querySelector('#preview-frame') as HTMLIFrameElement;
  if (iframe) {
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }
  }

  const closeModal = () => modal.remove();
  modal.querySelector('#close-preview-modal')?.addEventListener('click', closeModal);
  modal.querySelector('#cancel-preview-btn')?.addEventListener('click', closeModal);

  modal.querySelector('#do-print-btn')?.addEventListener('click', () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}
