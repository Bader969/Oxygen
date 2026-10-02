import { 
  getSettings, 
  saveSettings, 
  resetSettings, 
  exportRepairsToCsv, 
  exportCustomersToCsv, 
  playBeepSound 
} from './lib/settingsManager';
import { getRepairs, getCustomers } from './lib/repairService';
import { checkAuthSession, signOut } from './lib/authService';
import { applyTranslation } from './lib/i18n';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    applyTranslation();
    initTabs();
    loadCurrentSettings();
    initWhatsAppPreview();
    initActionButtons();
    loadProfileDetails();
  } catch (err) {
    console.error('Settings initialization error', err);
  }
});

function initTabs() {
  const tabBtns = document.querySelectorAll('.settings-tab-btn');
  const tabContents = document.querySelectorAll('.settings-tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');

      // Update button styles
      tabBtns.forEach(b => {
        b.classList.remove('bg-primary', 'text-black', 'shadow-[0_0_15px_rgba(255,180,171,0.3)]', 'font-bold');
        b.classList.add('bg-black/30', 'text-on-surface-variant', 'hover:bg-white/5');
      });
      btn.classList.add('bg-primary', 'text-black', 'shadow-[0_0_15px_rgba(255,180,171,0.3)]', 'font-bold');
      btn.classList.remove('bg-black/30', 'text-on-surface-variant', 'hover:bg-white/5');

      // Update tab contents
      tabContents.forEach(content => {
        if (content.id === `tab-content-${targetId}`) {
          content.classList.remove('hidden');
        } else {
          content.classList.add('hidden');
        }
      });
    });
  });
}

function loadCurrentSettings() {
  const s = getSettings();

  // 1. Shop Identity
  setVal('set-shop-name', s.shopName);
  setVal('set-shop-subtitle', s.shopSubtitle);
  setVal('set-shop-phone', s.shopPhone);
  setVal('set-shop-address', s.shopAddress);
  setVal('set-shop-tax', s.shopTaxNumber);
  setVal('set-disclaimer-tr', s.receiptDisclaimerTr);
  setVal('set-disclaimer-ar', s.receiptDisclaimerAr);

  // 2. Repair Defaults & SLA
  setVal('set-default-warranty', s.defaultWarrantyMonths.toString());
  setVal('set-default-sla-normal', s.defaultSlaHoursNormal.toString());
  setVal('set-default-sla-express', s.defaultSlaHoursExpress.toString());
  setVal('set-default-currency', s.defaultCurrency);
  setVal('set-express-surcharge', s.expressSurcharge.toString());

  // 3. WhatsApp Templates
  setVal('set-wa-ready-tr', s.whatsappReadyTemplateTr);
  setVal('set-wa-ready-ar', s.whatsappReadyTemplateAr);
  setVal('set-wa-progress-tr', s.whatsappProgressTemplateTr);
  setVal('set-wa-progress-ar', s.whatsappProgressTemplateAr);

  // 4. Hardware & Printer
  setVal('set-paper-width', s.printerPaperWidth);
  setChecked('set-toggle-show-qr', s.printShowQr);
  setChecked('set-toggle-mask-passcode', s.maskPasscodeOnReceipt);
  setChecked('set-toggle-auto-print', s.autoOpenPrintAfterCreate);
  setChecked('set-toggle-sound-fx', s.soundEffectsEnabled);

  updatePreview();
}

function setVal(id: string, val: string) {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  if (el) el.value = val;
}

function setChecked(id: string, checked: boolean) {
  const el = document.getElementById(id) as HTMLInputElement;
  if (el) el.checked = checked;
}

function getVal(id: string): string {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  return el ? el.value.trim() : '';
}

function getChecked(id: string): boolean {
  const el = document.getElementById(id) as HTMLInputElement;
  return el ? el.checked : false;
}

function initWhatsAppPreview() {
  const inputs = ['set-wa-ready-tr', 'set-wa-ready-ar', 'set-wa-progress-tr', 'set-wa-progress-ar', 'set-shop-name', 'set-shop-phone', 'set-default-currency'];
  inputs.forEach(id => {
    document.getElementById(id)?.addEventListener('input', updatePreview);
  });
}

function updatePreview() {
  const previewEl = document.getElementById('wa-preview-text');
  if (!previewEl) return;

  const tmpl = getVal('set-wa-ready-tr');
  const shopName = getVal('set-shop-name') || 'Oxygen Technology';
  const shopPhone = getVal('set-shop-phone') || '+90 555 123 4567';
  const currency = getVal('set-default-currency') || '₺';

  const preview = tmpl
    .replace(/{customer}/g, 'Ahmet Yılmaz')
    .replace(/{device}/g, 'iPhone 13 Pro')
    .replace(/{ticketId}/g, 'A4B9C1')
    .replace(/{cost}/g, `1.450 ${currency}`)
    .replace(/{shopName}/g, shopName)
    .replace(/{shopPhone}/g, shopPhone);

  previewEl.textContent = preview;
}

function initActionButtons() {
  const lang = localStorage.getItem('appLang') || 'tr';
  const isAr = lang === 'ar';

  // Save Settings Button
  const saveBtn = document.getElementById('save-settings-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveSettings({
        shopName: getVal('set-shop-name'),
        shopSubtitle: getVal('set-shop-subtitle'),
        shopPhone: getVal('set-shop-phone'),
        shopAddress: getVal('set-shop-address'),
        shopTaxNumber: getVal('set-shop-tax'),
        receiptDisclaimerTr: getVal('set-disclaimer-tr'),
        receiptDisclaimerAr: getVal('set-disclaimer-ar'),

        defaultWarrantyMonths: parseInt(getVal('set-default-warranty') || '3', 10),
        defaultSlaHoursNormal: parseInt(getVal('set-default-sla-normal') || '24', 10),
        defaultSlaHoursExpress: parseInt(getVal('set-default-sla-express') || '3', 10),
        defaultCurrency: getVal('set-default-currency') || '₺',
        expressSurcharge: parseFloat(getVal('set-express-surcharge') || '0'),

        whatsappReadyTemplateTr: getVal('set-wa-ready-tr'),
        whatsappReadyTemplateAr: getVal('set-wa-ready-ar'),
        whatsappProgressTemplateTr: getVal('set-wa-progress-tr'),
        whatsappProgressTemplateAr: getVal('set-wa-progress-ar'),

        printerPaperWidth: (getVal('set-paper-width') as any) || '80mm',
        printShowQr: getChecked('set-toggle-show-qr'),
        maskPasscodeOnReceipt: getChecked('set-toggle-mask-passcode'),
        autoOpenPrintAfterCreate: getChecked('set-toggle-auto-print'),
        soundEffectsEnabled: getChecked('set-toggle-sound-fx')
      });

      playBeepSound('success');
      const msg = isAr ? 'تم حفظ جميع الإعدادات بنجاح!' : 'Tüm ayarlar başarıyla kaydedildi!';
      (window as any).showToast ? (window as any).showToast(msg, 'success') : alert(msg);
    });
  }

  // Reset Settings Button
  const resetBtn = document.getElementById('reset-settings-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const confirmMsg = isAr 
        ? 'هل أنت متأكد من استعادة إعدادات المصنع الافتراضية؟' 
        : 'Fabrika ayarlarına dönmek istediğinize emin misiniz?';
      if (confirm(confirmMsg)) {
        resetSettings();
        loadCurrentSettings();
        playBeepSound('warn');
        const msg = isAr ? 'تمت استعادة الإعدادات الافتراضية' : 'Varsayılan ayarlar geri yüklendi';
        (window as any).showToast ? (window as any).showToast(msg, 'info') : null;
      }
    });
  }

  // Test Sound Button
  const testSoundBtn = document.getElementById('test-sound-btn');
  if (testSoundBtn) {
    testSoundBtn.addEventListener('click', () => {
      playBeepSound('scan');
    });
  }

  // Export Repairs CSV Button
  const exportRepairsBtn = document.getElementById('export-repairs-btn');
  if (exportRepairsBtn) {
    exportRepairsBtn.addEventListener('click', async () => {
      try {
        exportRepairsBtn.setAttribute('disabled', 'true');
        const origText = exportRepairsBtn.innerHTML;
        exportRepairsBtn.innerHTML = isAr ? 'جاري التحميل...' : 'İndiriliyor...';
        const repairs = await getRepairs();
        exportRepairsToCsv(repairs);
        playBeepSound('success');
        exportRepairsBtn.removeAttribute('disabled');
        exportRepairsBtn.innerHTML = origText;
      } catch (err: any) {
        alert('Export error: ' + err.message);
      }
    });
  }

  // Export Customers CSV Button
  const exportCustBtn = document.getElementById('export-customers-btn');
  if (exportCustBtn) {
    exportCustBtn.addEventListener('click', async () => {
      try {
        exportCustBtn.setAttribute('disabled', 'true');
        const origText = exportCustBtn.innerHTML;
        exportCustBtn.innerHTML = isAr ? 'جاري التحميل...' : 'İndiriliyor...';
        const customers = await getCustomers();
        exportCustomersToCsv(customers);
        playBeepSound('success');
        exportCustBtn.removeAttribute('disabled');
        exportCustBtn.innerHTML = origText;
      } catch (err: any) {
        alert('Export error: ' + err.message);
      }
    });
  }

  // Edit Profile Redirect
  document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
    window.location.href = '/src/profile.html';
  });

  // Danger Zone Logout
  document.querySelectorAll('.btn-logout').forEach(el => {
    el.addEventListener('click', async () => {
      await signOut();
    });
  });
}

async function loadProfileDetails() {
  try {
    const user = await checkAuthSession();
    if (user?.email) {
      const emailEl = document.getElementById('profile-email');
      if (emailEl) emailEl.textContent = user.email;
    }
  } catch (err) {
    console.error('Session check failed in settings', err);
  }
}
