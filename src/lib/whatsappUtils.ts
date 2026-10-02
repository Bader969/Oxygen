/**
 * WhatsApp integration utility for Oxygen Technology repair service
 */

export interface WhatsAppNotificationPayload {
  customerName: string;
  customerPhone?: string;
  deviceModel: string;
  cost?: number;
  ticketId: string;
  status?: string;
  lang?: string;
}

export function cleanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  // Turkey local standard: 05xx -> 905xx
  if (cleaned.startsWith('05') && cleaned.length === 11) {
    cleaned = '9' + cleaned;
  }
  return cleaned;
}

export function buildWhatsAppMessage(payload: WhatsAppNotificationPayload): string {
  const lang = payload.lang || localStorage.getItem('appLang') || 'tr';
  const shortId = payload.ticketId.split('-')[0].toUpperCase();
  const costStr = payload.cost !== undefined ? `₺${payload.cost}` : '0 ₺';
  const status = payload.status || 'ready_for_pickup';

  if (lang === 'ar') {
    if (status === 'ready_for_pickup' || status === 'completed') {
      return `مرحباً ${payload.customerName}، نود إعلامك بأن جهازك (${payload.deviceModel}) قد اكتمل إصلاحه وهو جاهز للاستلام الآن.\nالمبلغ المستحق: ${costStr}\nرقم التذكرة: #TKT-${shortId}\nشكراً لاختياركم Oxygen Technology.`;
    }
    if (status === 'in_progress') {
      return `مرحباً ${payload.customerName}، جهازك (${payload.deviceModel}) قيد الإصلاح حالياً بواسطة فنيي Oxygen Technology.\nرقم التذكرة: #TKT-${shortId}\nسنبلغكم فور الانتهاء.`;
    }
    return `مرحباً ${payload.customerName}، بخصوص جهازك (${payload.deviceModel}) لدى Oxygen Technology - رقم التذكرة: #TKT-${shortId}.`;
  }

  // Default: Turkish
  if (status === 'ready_for_pickup' || status === 'completed') {
    return `Merhaba ${payload.customerName}, ${payload.deviceModel} cihazınızın onarımı tamamlanmış olup servisimizden teslime hazırdır.\nÖdenecek Tutar: ${costStr}\nTakip No: #TKT-${shortId}\nOxygen Technology'yi tercih ettiğiniz için teşekkür ederiz.`;
  }
  if (status === 'in_progress') {
    return `Merhaba ${payload.customerName}, ${payload.deviceModel} cihazınızın atölyemizde onarım işlemine başlanmıştır.\nTakip No: #TKT-${shortId}\nİşlem tamamlandığında tarafınıza bilgi verilecektir. Oxygen Technology.`;
  }
  return `Merhaba ${payload.customerName}, ${payload.deviceModel} cihazınızın servis durumu hk. Takip No: #TKT-${shortId}. Oxygen Technology.`;
}

export function sendWhatsAppNotification(payload: WhatsAppNotificationPayload): boolean {
  if (!payload.customerPhone || payload.customerPhone.trim() === '') {
    const lang = payload.lang || localStorage.getItem('appLang') || 'tr';
    const msg = lang === 'ar' ? 'رقم هاتف العميل غير مسجل' : 'Müşterinin telefon numarası kayıtlı değil';
    if ((window as any).showToast) {
      (window as any).showToast(msg, 'warning');
    } else {
      alert(msg);
    }
    return false;
  }

  const phone = cleanPhoneNumber(payload.customerPhone);
  const text = buildWhatsAppMessage(payload);
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
  return true;
}
