export interface WorkshopSettings {
  // 1. Shop Identity
  shopName: string;
  shopSubtitle: string;
  shopPhone: string;
  shopAddress: string;
  shopTaxNumber: string;
  receiptDisclaimerTr: string;
  receiptDisclaimerAr: string;

  // 2. Repair Defaults & SLA
  defaultWarrantyMonths: number;
  defaultSlaHoursNormal: number;
  defaultSlaHoursExpress: number;
  defaultCurrency: string;
  expressSurcharge: number;

  // 3. WhatsApp Templates
  whatsappReadyTemplateTr: string;
  whatsappReadyTemplateAr: string;
  whatsappProgressTemplateTr: string;
  whatsappProgressTemplateAr: string;

  // 4. Hardware & Printer
  printerPaperWidth: '80mm' | '58mm';
  printShowQr: boolean;
  maskPasscodeOnReceipt: boolean;
  autoOpenPrintAfterCreate: boolean;

  // 5. Sound & Interface
  soundEffectsEnabled: boolean;
  sidebarAutoCollapse: boolean;
}

export const defaultSettings: WorkshopSettings = {
  shopName: 'Oxygen Technology',
  shopSubtitle: 'Profesyonel Cihaz Onarım & Servis Merkezi',
  shopPhone: '+90 555 123 4567',
  shopAddress: 'Bağdat Caddesi No: 42, Kadıköy / İstanbul',
  shopTaxNumber: 'V.K.N: 8492019382',
  receiptDisclaimerTr: '1. Cihaz tesliminde bu servis fişinin ibraz edilmesi zorunludur.\n2. Hazır bildirimi yapıldıktan sonra 90 gün içinde teslim alınmayan cihazlardan firmamız sorumlu değildir.\n3. Sıvı temaslı cihazlar korozyon riski nedeniyle garanti kapsamı dışındadır.\n4. Verilen garanti sadece servisimizde değiştirilen yedek parçalar için geçerlidir.',
  receiptDisclaimerAr: '1. يجب إبراز هذا الإيصال أو رمزه الإلكتروني عند استلام الجهاز.\n2. المتجر غير مسؤول عن الأجهزة التي لا تُستلم خلال 90 يوماً من إشعار الجاهزية.\n3. الأجهزة المتعرضة للسوائل لا تشملها الكفالة بسبب قابلية تآكل الدوائر لاحقاً.\n4. الضمان ساري فقط على القطع التي تم استبدالها والمثبتة في الفاتورة.',
  
  defaultWarrantyMonths: 3,
  defaultSlaHoursNormal: 24,
  defaultSlaHoursExpress: 3,
  defaultCurrency: '₺',
  expressSurcharge: 200,

  whatsappReadyTemplateTr: 'Merhaba {customer}, {device} cihazınızın onarımı tamamlanmış olup servisimizden teslime hazırdır.\nÖdenecek Tutar: {cost}\nTakip No: #{ticketId}\n{shopName} tercih ettiğiniz için teşekkür ederiz.',
  whatsappReadyTemplateAr: 'مرحباً {customer}، نود إعلامك بأن جهازك ({device}) قد اكتمل إصلاحه وهو جاهز للاستلام الآن.\nالمبلغ المستحق: {cost}\nرقم التذكرة: #{ticketId}\nشكراً لاختياركم {shopName}.',
  whatsappProgressTemplateTr: 'Merhaba {customer}, {device} cihazınız uzmanlarımız tarafından onarım işlemine alınmıştır.\nTakip No: #{ticketId}\nİşlem tamamlandığında tarafınıza bilgi verilecektir. {shopName}',
  whatsappProgressTemplateAr: 'مرحباً {customer}، جهازك ({device}) قيد الفحص والإصلاح حالياً بواسطة خبراء {shopName}.\nرقم التذكرة: #{ticketId}\nسنوافيكم فور الانتهاء.',

  printerPaperWidth: '80mm',
  printShowQr: true,
  maskPasscodeOnReceipt: false,
  autoOpenPrintAfterCreate: true,

  soundEffectsEnabled: true,
  sidebarAutoCollapse: false
};

const STORAGE_KEY = 'oxygen_workshop_settings';

export function getSettings(): WorkshopSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultSettings };
    const parsed = JSON.parse(raw);
    return { ...defaultSettings, ...parsed };
  } catch (err) {
    console.error('Failed to parse workshop settings, using defaults', err);
    return { ...defaultSettings };
  }
}

export function saveSettings(partial: Partial<WorkshopSettings>): WorkshopSettings {
  const current = getSettings();
  const updated = { ...current, ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('oxygen-settings-changed', { detail: updated }));
  }
  return updated;
}

export function resetSettings(): WorkshopSettings {
  localStorage.removeItem(STORAGE_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('oxygen-settings-changed', { detail: defaultSettings }));
  }
  return { ...defaultSettings };
}

/**
 * Web Audio API synthesized sounds (zero external file dependencies)
 */
export function playBeepSound(type: 'scan' | 'success' | 'warn' = 'scan'): void {
  const settings = getSettings();
  if (!settings.soundEffectsEnabled) return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'scan') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } else if (type === 'warn') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (err) {
    // Ignore audio autoplay restrictions
  }
}

/**
 * Clean CSV export with UTF-8 BOM for Microsoft Excel compatibility
 */
export function exportRepairsToCsv(repairs: any[]): void {
  if (!repairs || repairs.length === 0) {
    const lang = localStorage.getItem('appLang') || 'tr';
    const msg = lang === 'ar' ? 'لا توجد بيانات للتصدير' : 'Dışa aktarılacak onarım verisi bulunamadı';
    (window as any).showToast ? (window as any).showToast(msg, 'warning') : alert(msg);
    return;
  }

  const headers = [
    'Talep ID',
    'Tarih',
    'Müşteri Adı',
    'Telefon',
    'Cihaz Modeli',
    'Cihaz Türü',
    'IMEI / Seri No',
    'Sorun Açıklaması',
    'Öncelik',
    'Durum',
    'Ücret (₺)',
    'Garanti (Ay)',
    'Kilit Kodu',
    'Giriş Durumu',
    'Aksesuarlar',
    'Uzman Notları',
    'Teslimat Tarihi'
  ];

  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = repairs.map(r => [
    `#TKT-${(r.id || '').substring(0, 6).toUpperCase()}`,
    r.created_at ? new Date(r.created_at).toLocaleString('tr-TR') : '',
    r.customers?.name || '',
    r.customers?.phone || '',
    r.device_model || '',
    r.device_type || '',
    r.imei || '',
    r.issue_description || '',
    r.priority || 'normal',
    r.status || '',
    r.cost !== undefined ? r.cost : '',
    r.warranty_months !== undefined ? r.warranty_months : '',
    r.device_passcode || '',
    r.intake_condition || '',
    r.accessories || '',
    r.technician_notes || '',
    r.completed_at ? new Date(r.completed_at).toLocaleString('tr-TR') : ''
  ]);

  const csvContent = '\uFEFF' + [
    headers.map(escapeCell).join(';'),
    ...rows.map(row => row.map(escapeCell).join(';'))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `oxygen_onarim_raporu_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportCustomersToCsv(customers: any[]): void {
  if (!customers || customers.length === 0) {
    const lang = localStorage.getItem('appLang') || 'tr';
    const msg = lang === 'ar' ? 'لا يوجد عملاء للتصدير' : 'Dışa aktarılacak müşteri bulunamadı';
    (window as any).showToast ? (window as any).showToast(msg, 'warning') : alert(msg);
    return;
  }

  const headers = ['Müşteri ID', 'Kayıt Tarihi', 'Ad Soyad', 'Telefon', 'E-posta'];
  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = customers.map(c => [
    c.id || '',
    c.created_at ? new Date(c.created_at).toLocaleString('tr-TR') : '',
    c.name || '',
    c.phone || '',
    c.email || ''
  ]);

  const csvContent = '\uFEFF' + [
    headers.map(escapeCell).join(';'),
    ...rows.map(row => row.map(escapeCell).join(';'))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `oxygen_musteriler_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
