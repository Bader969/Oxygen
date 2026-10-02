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

import { getSettings } from './settingsManager';

export function buildWhatsAppMessage(payload: WhatsAppNotificationPayload): string {
  const lang = payload.lang || localStorage.getItem('appLang') || 'tr';
  const shortId = payload.ticketId.split('-')[0].toUpperCase();
  const settings = getSettings();
  const costStr = payload.cost !== undefined ? `${payload.cost} ${settings.defaultCurrency}` : `0 ${settings.defaultCurrency}`;
  const status = payload.status || 'ready_for_pickup';

  const replaceVars = (tmpl: string) => {
    return tmpl
      .replace(/{customer}/g, payload.customerName || '')
      .replace(/{device}/g, payload.deviceModel || '')
      .replace(/{ticketId}/g, shortId)
      .replace(/{cost}/g, costStr)
      .replace(/{shopName}/g, settings.shopName)
      .replace(/{shopPhone}/g, settings.shopPhone);
  };

  if (lang === 'ar') {
    if (status === 'ready_for_pickup' || status === 'completed') {
      return replaceVars(settings.whatsappReadyTemplateAr);
    }
    if (status === 'in_progress') {
      return replaceVars(settings.whatsappProgressTemplateAr);
    }
    return `مرحباً ${payload.customerName}، بخصوص جهازك (${payload.deviceModel}) لدى ${settings.shopName} - رقم التذكرة: #TKT-${shortId}.`;
  }

  // Default: Turkish
  if (status === 'ready_for_pickup' || status === 'completed') {
    return replaceVars(settings.whatsappReadyTemplateTr);
  }
  if (status === 'in_progress') {
    return replaceVars(settings.whatsappProgressTemplateTr);
  }
  return `Merhaba ${payload.customerName}, ${payload.deviceModel} cihazınızın servis durumu hk. Takip No: #TKT-${shortId}. ${settings.shopName}`;
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
