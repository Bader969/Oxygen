import { createCustomer, createRepairTicket, getCustomers, getDevices, createDevice } from './lib/repairService';
import { generateQrCodeDataUrl } from './lib/qrUtils';
import { openReceiptPreviewModal } from './lib/receiptPrinter';
import { getSettings, playBeepSound } from './lib/settingsManager';

declare const Html5Qrcode: any;

// Curated Device Catalog for Brand and Model suggestions
const deviceCatalog: Record<string, Record<string, string[]>> = {
  phone: {
    'Apple': [
      'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max', 
      'iPhone 12', 'iPhone 12 Mini', 'iPhone 12 Pro', 'iPhone 12 Pro Max', 
      'iPhone 13', 'iPhone 13 Mini', 'iPhone 13 Pro', 'iPhone 13 Pro Max', 
      'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max', 
      'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max', 
      'iPhone SE (2020)', 'iPhone SE (2022)'
    ],
    'Samsung': [
      'Galaxy S20', 'Galaxy S20 FE', 'Galaxy S20 Ultra', 
      'Galaxy S21', 'Galaxy S21 FE', 'Galaxy S21 Ultra', 
      'Galaxy S22', 'Galaxy S22+', 'Galaxy S22 Ultra', 
      'Galaxy S23', 'Galaxy S23+', 'Galaxy S23 Ultra', 
      'Galaxy S24', 'Galaxy S24+', 'Galaxy S24 Ultra', 
      'Galaxy Note 10', 'Galaxy Note 20', 'Galaxy Note 20 Ultra', 
      'Galaxy Z Fold 3', 'Galaxy Z Fold 4', 'Galaxy Z Fold 5', 
      'Galaxy Z Flip 3', 'Galaxy Z Flip 4', 'Galaxy Z Flip 5', 
      'Galaxy A14', 'Galaxy A34', 'Galaxy A54', 'Galaxy A73'
    ],
    'Google': [
      'Pixel 5', 'Pixel 5a', 'Pixel 6', 'Pixel 6 Pro', 'Pixel 6a', 
      'Pixel 7', 'Pixel 7 Pro', 'Pixel 7a', 'Pixel 8', 'Pixel 8 Pro', 'Pixel 8a', 'Pixel Fold'
    ],
    'Xiaomi': [
      'Mi 11', 'Mi 11 Lite', 'Xiaomi 12', 'Xiaomi 12 Pro', 
      'Xiaomi 13', 'Xiaomi 13 Pro', 'Xiaomi 14', 'Xiaomi 14 Ultra', 
      'Redmi Note 10 Pro', 'Redmi Note 11', 'Redmi Note 12 Pro', 'Redmi Note 13 Pro', 
      'Poco X3 Pro', 'Poco F5', 'Poco X6 Pro'
    ],
    'OnePlus': [
      'OnePlus 8 Pro', 'OnePlus 9 Pro', 'OnePlus 10 Pro', 'OnePlus 10T', 
      'OnePlus 11', 'OnePlus 12', 'OnePlus 12R', 'Nord N20', 'Nord 3'
    ],
    'Huawei': [
      'P30 Pro', 'P40 Pro', 'P50 Pro', 'P60 Pro', 
      'Mate 40 Pro', 'Mate 50 Pro', 'Mate 60 Pro', 'Nova 10', 'Nova 11'
    ],
    'Oppo': [
      'Find X3 Pro', 'Find X5 Pro', 'Find X6 Pro', 'Reno 8', 'Reno 10', 'Oppo A78'
    ],
    'Vivo': [
      'X80 Pro', 'X90 Pro', 'X100 Pro', 'Vivo V27', 'Vivo V29'
    ],
    'Realme': [
      'Realme GT', 'Realme GT Neo 5', 'Realme 11 Pro+'
    ],
    'Motorola': [
      'Edge 30', 'Edge 40', 'Moto G54', 'Razr 40 Ultra'
    ],
    'Sony': [
      'Xperia 1 V', 'Xperia 5 V', 'Xperia 10 V'
    ]
  },
  laptop: {
    'Apple': [
      'MacBook Air M1 (2020)', 'MacBook Air M2 (13")', 'MacBook Air M2 (15")', 
      'MacBook Air M3 (13")', 'MacBook Air M3 (15")', 
      'MacBook Pro 13" (M1/M2)', 'MacBook Pro 14" (M1/M2/M3)', 'MacBook Pro 16" (M1/M2/M3)'
    ],
    'Dell': [
      'XPS 13', 'XPS 13 Plus', 'XPS 15', 'XPS 17', 
      'Inspiron 14', 'Inspiron 16', 'Latitude 3540', 'Latitude 5440', 'Latitude 7440', 
      'Precision 3580', 'Precision 5580', 'Alienware m16', 'Alienware x16', 'G15 Gaming', 'G16 Gaming'
    ],
    'Lenovo': [
      'ThinkPad X1 Carbon Gen 10', 'ThinkPad X1 Carbon Gen 11', 
      'ThinkPad T14 Gen 3', 'ThinkPad T14 Gen 4', 
      'ThinkPad L14', 'ThinkPad E14', 'Yoga 7i', 'Yoga 9i', 'Yoga Slim 7', 
      'IdeaPad 3', 'IdeaPad 5', 'IdeaPad Slim 5', 
      'Legion 5', 'Legion 7', 'Legion Slim 5', 'ThinkBook 14', 'ThinkBook 15'
    ],
    'HP': [
      'Spectre x360 14', 'Spectre x360 16', 'Envy x360', 'Envy 16', 
      'Pavilion 14', 'Pavilion 15', 'EliteBook 840 G9', 'EliteBook 840 G10', 
      'EliteBook 1040 G10', 'ProBook 440 G10', 'ProBook 450 G10', 'Victus 15', 'Victus 16', 'Omen 16'
    ],
    'Asus': [
      'ZenBook 14 OLED', 'ZenBook Pro 14 Duo', 'VivoBook 15', 'VivoBook Pro 16', 
      'ROG Zephyrus G14', 'ROG Zephyrus G16', 'ROG Strix G16', 'TUF Gaming A15', 'TUF Gaming F15', 'ExpertBook B1'
    ],
    'Acer': [
      'Swift Go 14', 'Swift 3', 'Aspire 3', 'Aspire 5', 'Nitro 5', 'Nitro 16', 'Predator Helios 16', 'Spin 5'
    ],
    'Microsoft': [
      'Surface Laptop 4', 'Surface Laptop 5', 'Surface Pro 8', 'Surface Pro 9', 'Surface Laptop Studio 2'
    ],
    'MSI': [
      'Modern 14', 'Prestige 14', 'Stealth 16', 'Raider GE78', 'Thin GF63'
    ],
    'Razer': [
      'Blade 14', 'Blade 15', 'Blade 16', 'Blade 18'
    ]
  },
  tablet: {
    'Apple': [
      'iPad 9th Gen', 'iPad 10th Gen', 'iPad Air 4', 'iPad Air 5', 
      'iPad Pro 11" (M1)', 'iPad Pro 11" (M2)', 'iPad Pro 12.9" (M1)', 'iPad Pro 12.9" (M2)', 'iPad Mini 6'
    ],
    'Samsung': [
      'Galaxy Tab A7 Lite', 'Galaxy Tab A8', 'Galaxy Tab S6 Lite', 'Galaxy Tab S7 FE', 
      'Galaxy Tab S8', 'Galaxy Tab S8+', 'Galaxy Tab S8 Ultra', 
      'Galaxy Tab S9', 'Galaxy Tab S9+', 'Galaxy Tab S9 Ultra', 'Galaxy Tab S9 FE'
    ],
    'Lenovo': [
      'Tab M9', 'Tab M10 Plus', 'Tab P11 Pro Gen 2', 'Tab Extreme', 'Yoga Tab 11'
    ],
    'Xiaomi': [
      'Pad 5', 'Pad 6', 'Pad 6 Pro', 'Redmi Pad', 'Redmi Pad SE'
    ],
    'Amazon': [
      'Fire HD 8', 'Fire HD 10', 'Fire Max 11'
    ]
  },
  watch: {
    'Apple': [
      'Apple Watch Series 4', 'Apple Watch Series 5', 'Apple Watch Series 6', 
      'Apple Watch Series 7', 'Apple Watch Series 8', 'Apple Watch Series 9', 
      'Apple Watch SE (Gen 1)', 'Apple Watch SE (Gen 2)', 'Apple Watch Ultra', 'Apple Watch Ultra 2'
    ],
    'Samsung': [
      'Galaxy Watch Active 2', 'Galaxy Watch 3', 
      'Galaxy Watch 4', 'Galaxy Watch 4 Classic', 
      'Galaxy Watch 5', 'Galaxy Watch 5 Pro', 
      'Galaxy Watch 6', 'Galaxy Watch 6 Classic', 'Galaxy Watch Fit 3'
    ],
    'Garmin': [
      'Fenix 6', 'Fenix 7', 'Epix Gen 2', 'Venu 2', 'Venu 3', 
      'Vivoactive 5', 'Forerunner 245', 'Forerunner 265', 'Forerunner 965', 'Instinct 2'
    ],
    'Huawei': [
      'Watch GT 3', 'Watch GT 4', 'Watch 3 Pro', 'Watch 4 Pro', 'Watch Ultimate'
    ],
    'Fitbit': [
      'Charge 5', 'Charge 6', 'Inspire 3', 'Versa 3', 'Versa 4', 'Sense', 'Sense 2'
    ],
    'Xiaomi': [
      'Watch S1', 'Redmi Watch 3', 'Smart Band 8'
    ],
    'Amazfit': [
      'GTR 4', 'GTS 4', 'T-Rex 2', 'Bip 5'
    ]
  },
  other: {
    'Generic': ['Custom Device Model']
  }
};

let customersList: any[] = [];
let devicesList: any[] = [];
let selectedCustomerId: string | null = null;

async function fetchInitialData() {
  try {
    customersList = await getCustomers();
    devicesList = await getDevices();
  } catch (err) {
    console.error('Failed to load initial autocomplete lists:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await fetchInitialData();

  const nameInput = document.getElementById('ticket-customer-name') as HTMLInputElement;
  const phoneInput = document.getElementById('ticket-customer-phone') as HTMLInputElement;
  const suggestionsBox = document.getElementById('customer-suggestions') as HTMLDivElement;

  const deviceSelectWrapper = document.getElementById('device-selection-wrapper') as HTMLDivElement;
  const deviceSelect = document.getElementById('ticket-device-select') as HTMLSelectElement;
  const deviceDetailsFields = document.getElementById('device-details-fields') as HTMLDivElement;

  const brandInput = document.getElementById('ticket-brand') as HTMLInputElement;
  const brandSuggestionsBox = document.getElementById('brand-suggestions') as HTMLDivElement;
  
  const modelInput = document.getElementById('ticket-model') as HTMLInputElement;
  const modelSuggestionsBox = document.getElementById('model-suggestions') as HTMLDivElement;
  
  const typeSelect = document.getElementById('ticket-device-type') as HTMLInputElement;
  const typeSuggestionsBox = document.getElementById('type-suggestions') as HTMLDivElement;
  const imeiInput = document.getElementById('ticket-imei') as HTMLInputElement;

  const currentLang = localStorage.getItem('appLang') || 'tr';
  if (typeSelect) {
    typeSelect.value = currentLang === 'ar' ? 'هاتف' : 'Telefon';
    typeSelect.setAttribute('data-value', 'phone');
  }

  const issueInput = document.getElementById('ticket-issue') as HTMLTextAreaElement;
  const costInput = document.getElementById('ticket-cost') as HTMLInputElement;
  const submitBtn = document.querySelector('button.btn-primary') as HTMLButtonElement;

  // 1. Live Suggestion Logic for Customer Name
  if (nameInput && suggestionsBox) {
    nameInput.addEventListener('input', () => {
      const query = nameInput.value.toLowerCase().trim();
      if (!query) {
        suggestionsBox.classList.add('hidden');
        resetSelectedCustomer();
        return;
      }

      const matches = customersList.filter(c => 
        c.name.toLowerCase().includes(query) || (c.phone && c.phone.includes(query))
      );

      if (matches.length === 0) {
        suggestionsBox.classList.add('hidden');
        resetSelectedCustomer();
        return;
      }

      suggestionsBox.innerHTML = '';
      matches.forEach(c => {
        const item = document.createElement('div');
        item.className = 'px-4 py-3 hover:bg-primary/20 text-on-surface cursor-pointer text-sm transition-colors flex justify-between';
        item.innerHTML = `<span class="font-bold">${c.name}</span><span class="text-xs text-on-surface-variant">${c.phone || ''}</span>`;
        item.addEventListener('click', () => {
          nameInput.value = c.name;
          phoneInput.value = c.phone || '';
          selectedCustomerId = c.id;
          suggestionsBox.classList.add('hidden');

          // Load devices for this customer
          loadSavedDevicesForCustomer(c.id);
        });
        suggestionsBox.appendChild(item);
      });
      suggestionsBox.classList.remove('hidden');
    });
  }

  function resetSelectedCustomer() {
    selectedCustomerId = null;
    if (deviceSelectWrapper) deviceSelectWrapper.classList.add('hidden');
    if (deviceDetailsFields) deviceDetailsFields.classList.remove('hidden');
  }

  function loadSavedDevicesForCustomer(custId: string) {
    const custDevices = devicesList.filter(d => d.customer_id === custId);
    const newDevLabel = currentLang === 'ar' ? '+ إضافة جهاز جديد' : '+ Yeni Cihaz Ekle';
    
    deviceSelect.innerHTML = `<option value="new">${newDevLabel}</option>`;
    
    if (custDevices.length > 0) {
      custDevices.forEach(d => {
        const option = document.createElement('option');
        option.value = d.id;
        option.textContent = `${d.brand} ${d.model} (${d.imei || 'No IMEI'})`;
        deviceSelect.appendChild(option);
      });
      deviceSelectWrapper.classList.remove('hidden');
    } else {
      deviceSelectWrapper.classList.add('hidden');
    }
    
    deviceDetailsFields.classList.remove('hidden');
    deviceSelect.value = 'new';

    // Modern Glass Dropdown integration for saved devices
    const deviceDisplay = document.getElementById('ticket-device-display') as HTMLInputElement;
    const deviceBox = document.getElementById('device-suggestions') as HTMLElement;
    const deviceChevron = document.getElementById('device-select-chevron') as HTMLElement;
    if (deviceDisplay && deviceBox) {
      deviceDisplay.value = newDevLabel;
      deviceDisplay.setAttribute('data-value', 'new');

      const renderDeviceOptions = () => {
        deviceBox.innerHTML = '';
        const options = [{ value: 'new', label: newDevLabel }];
        custDevices.forEach(d => {
          options.push({ value: d.id, label: `${d.brand} ${d.model} (${d.imei || 'No IMEI'})` });
        });

        options.forEach(opt => {
          const item = document.createElement('div');
          item.className = 'px-4 py-2.5 hover:bg-primary/20 text-on-surface cursor-pointer text-sm transition-colors flex items-center justify-between';
          const isSelected = deviceSelect.value === opt.value;
          item.innerHTML = `<span>${opt.label}</span>${isSelected ? '<span class="material-symbols-outlined text-primary text-[16px]">check</span>' : ''}`;
          item.addEventListener('click', () => {
            deviceSelect.value = opt.value;
            deviceDisplay.value = opt.label;
            deviceDisplay.setAttribute('data-value', opt.value);
            deviceBox.classList.add('hidden');
            if (deviceChevron) deviceChevron.style.transform = '';
            deviceSelect.dispatchEvent(new Event('change'));
          });
          deviceBox.appendChild(item);
        });
        deviceBox.classList.remove('hidden');
        if (deviceChevron) deviceChevron.style.transform = 'rotate(180deg)';
      };

      deviceDisplay.onclick = (e) => {
        e.stopPropagation();
        if (deviceBox.classList.contains('hidden')) renderDeviceOptions();
        else {
          deviceBox.classList.add('hidden');
          if (deviceChevron) deviceChevron.style.transform = '';
        }
      };

      document.addEventListener('click', (e) => {
        if (!deviceBox.contains(e.target as HTMLElement) && e.target !== deviceDisplay) {
          deviceBox.classList.add('hidden');
          if (deviceChevron) deviceChevron.style.transform = '';
        }
      });
    }
  }

  if (deviceSelect) {
    deviceSelect.addEventListener('change', () => {
      if (deviceSelect.value === 'new') {
        deviceDetailsFields.classList.remove('hidden');
      } else {
        deviceDetailsFields.classList.add('hidden');
      }
    });
  }

  // 2. Modern Device Type Selection Suggestion Box
  if (typeSelect && typeSuggestionsBox) {
    const showTypeSuggestions = () => {
      const lang = localStorage.getItem('appLang') || 'tr';
      const options = lang === 'ar' ? [
        { value: 'phone', label: 'هاتف' },
        { value: 'laptop', label: 'حاسوب محمول' },
        { value: 'tablet', label: 'جهاز لوحي' },
        { value: 'watch', label: 'ساعة ذكية' },
        { value: 'other', label: 'جهاز آخر' }
      ] : [
        { value: 'phone', label: 'Telefon' },
        { value: 'laptop', label: 'Dizüstü Bilgisayar' },
        { value: 'tablet', label: 'Tablet' },
        { value: 'watch', label: 'Akıllı Saat' },
        { value: 'other', label: 'Diğer' }
      ];

      typeSuggestionsBox.innerHTML = '';
      options.forEach(opt => {
        const item = document.createElement('div');
        item.className = 'px-4 py-2.5 hover:bg-primary/20 text-on-surface cursor-pointer text-sm transition-colors';
        item.textContent = opt.label;
        item.addEventListener('click', () => {
          typeSelect.value = opt.label;
          typeSelect.setAttribute('data-value', opt.value);
          typeSuggestionsBox.classList.add('hidden');

          // Reset Brand & Model on type change
          brandInput.value = '';
          modelInput.value = '';
        });
        typeSuggestionsBox.appendChild(item);
      });
      typeSuggestionsBox.classList.remove('hidden');
    };

    typeSelect.addEventListener('click', (e) => {
      e.stopPropagation();
      showTypeSuggestions();
    });
    typeSelect.addEventListener('focus', showTypeSuggestions);
  }

  // 3. Autocomplete for Brand Input
  if (brandInput && brandSuggestionsBox) {
    const showBrandSuggestions = () => {
      const typeVal = typeSelect.getAttribute('data-value') || 'phone';
      const brands = Object.keys(deviceCatalog[typeVal] || {});
      const query = brandInput.value.toLowerCase().trim();

      const matches = query ? brands.filter(b => b.toLowerCase().includes(query)) : brands;

      if (matches.length === 0) {
        brandSuggestionsBox.classList.add('hidden');
        return;
      }

      brandSuggestionsBox.innerHTML = '';
      matches.forEach(b => {
        const item = document.createElement('div');
        item.className = 'px-4 py-2 hover:bg-primary/20 text-on-surface cursor-pointer text-sm transition-colors';
        item.textContent = b;
        item.addEventListener('click', () => {
          brandInput.value = b;
          modelInput.value = ''; // Reset model on brand select
          brandSuggestionsBox.classList.add('hidden');
          modelInput.focus();
        });
        brandSuggestionsBox.appendChild(item);
      });
      brandSuggestionsBox.classList.remove('hidden');
    };

    brandInput.addEventListener('focus', showBrandSuggestions);
    brandInput.addEventListener('input', showBrandSuggestions);
  }

  // 4. Autocomplete for Model Input
  if (modelInput && modelSuggestionsBox) {
    const showModelSuggestions = () => {
      const typeVal = typeSelect.getAttribute('data-value') || 'phone';
      const brandVal = brandInput.value.trim();
      
      const matchedBrandKey = Object.keys(deviceCatalog[typeVal] || {}).find(
        b => b.toLowerCase() === brandVal.toLowerCase()
      );

      let models: string[] = [];
      if (matchedBrandKey) {
        models = deviceCatalog[typeVal][matchedBrandKey];
      } else {
        models = Object.values(deviceCatalog[typeVal] || {}).flat();
      }

      const query = modelInput.value.toLowerCase().trim();
      const matches = query ? models.filter(m => m.toLowerCase().includes(query)) : models;

      if (matches.length === 0) {
        modelSuggestionsBox.classList.add('hidden');
        return;
      }

      modelSuggestionsBox.innerHTML = '';
      matches.forEach(m => {
        const item = document.createElement('div');
        item.className = 'px-4 py-2 hover:bg-primary/20 text-on-surface cursor-pointer text-sm transition-colors';
        item.textContent = m;
        item.addEventListener('click', () => {
          modelInput.value = m;
          modelSuggestionsBox.classList.add('hidden');
        });
        modelSuggestionsBox.appendChild(item);
      });
      modelSuggestionsBox.classList.remove('hidden');
    };

    modelInput.addEventListener('focus', showModelSuggestions);
    modelInput.addEventListener('input', showModelSuggestions);
  }

  // Close suggestion overlays clicking outside
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target !== nameInput && target !== suggestionsBox) {
      suggestionsBox?.classList.add('hidden');
    }
    if (target !== brandInput && target !== brandSuggestionsBox) {
      brandSuggestionsBox?.classList.add('hidden');
    }
    if (target !== modelInput && target !== modelSuggestionsBox) {
      modelSuggestionsBox?.classList.add('hidden');
    }
    if (target !== typeSelect && target !== typeSuggestionsBox) {
      typeSuggestionsBox?.classList.add('hidden');
    }
  });

  // 5. Workshop Fields Interactivity
  // Passcode toggle
  const noPasscodeCheckbox = document.getElementById('ticket-no-passcode') as HTMLInputElement;
  const passcodeField = document.getElementById('ticket-passcode') as HTMLInputElement;
  if (noPasscodeCheckbox && passcodeField) {
    noPasscodeCheckbox.addEventListener('change', () => {
      if (noPasscodeCheckbox.checked) {
        passcodeField.value = '';
        passcodeField.disabled = true;
        passcodeField.placeholder = (localStorage.getItem('appLang') === 'ar' ? 'بدون رمز قفل' : 'Şifresiz');
      } else {
        passcodeField.disabled = false;
        passcodeField.placeholder = (localStorage.getItem('appLang') === 'ar' ? 'مثال: 1234 أو النمط' : 'Örn. 1234 veya Desen');
      }
    });
  }

  // Pre-existing condition chips
  const conditionInput = document.getElementById('ticket-condition') as HTMLTextAreaElement;
  document.querySelectorAll('.cond-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const val = chip.textContent?.trim() || '';
      if (!conditionInput || !val) return;
      const current = conditionInput.value.trim();
      conditionInput.value = current ? `${current}, ${val}` : val;
    });
  });

  // Accessory chips
  const accInput = document.getElementById('ticket-accessories') as HTMLInputElement;
  document.querySelectorAll('.acc-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const val = chip.textContent?.trim() || '';
      if (!accInput || !val) return;
      const current = accInput.value.trim();
      accInput.value = current ? `${current}, ${val}` : val;
    });
  });

  // Priority selector buttons
  const priorityInput = document.getElementById('ticket-priority') as HTMLInputElement;
  const priorityBtns = document.querySelectorAll('.priority-btn');
  priorityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const prio = btn.getAttribute('data-priority') || 'normal';
      if (priorityInput) priorityInput.value = prio;
      priorityBtns.forEach(b => {
        b.className = 'priority-btn py-2.5 px-3 rounded-lg border border-white/10 bg-black/40 text-on-surface-variant font-bold text-xs flex items-center justify-center gap-1 transition-all';
      });
      if (prio === 'express') {
        btn.className = 'priority-btn py-2.5 px-3 rounded-lg border border-amber-500/50 bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center gap-1 transition-all shadow-[0_0_10px_rgba(245,158,11,0.2)]';
      } else {
        btn.className = 'priority-btn py-2.5 px-3 rounded-lg border border-primary/40 bg-primary/20 text-primary font-bold text-xs flex items-center justify-center gap-1 transition-all';
      }
    });
  });

  // Apply defaults from settings
  const settings = getSettings();

  // ── Module 1: Live-Camera IMEI & Barcode Scanner ─────────────────────────
  let imeiScanner: any = null;
  let imeiCameraFacing: 'environment' | 'user' = 'environment';
  let isImeiTorchOn = false;

  function initImeiScanner() {
    const scanBtn = document.getElementById('scan-imei-btn');
    const modal = document.getElementById('imei-scanner-modal');
    const closeBtn = document.getElementById('close-imei-scanner-btn');
    const torchBtn = document.getElementById('imei-torch-btn');
    const switchCamBtn = document.getElementById('imei-switch-camera-btn');
    const manualInput = document.getElementById('imei-modal-manual') as HTMLInputElement;
    const manualApplyBtn = document.getElementById('imei-modal-apply-btn');

    if (!scanBtn || !modal || !imeiInput) return;

    const applyImei = (scannedCode: string) => {
      if (!scannedCode) return;
      let cleaned = scannedCode.trim();
      const imeiMatch = cleaned.match(/(?:IMEI[:\s]*)?([0-9]{14,17})/i);
      if (imeiMatch && imeiMatch[1]) {
        cleaned = imeiMatch[1];
      } else {
        cleaned = cleaned.replace(/[^A-Za-z0-9\-]/g, '');
      }

      imeiInput.value = cleaned;
      playBeepSound('success');
      if (navigator.vibrate) navigator.vibrate([40, 30, 40]);

      imeiInput.classList.add('ring-2', 'ring-emerald-500', 'bg-emerald-500/10');
      setTimeout(() => {
        imeiInput.classList.remove('ring-2', 'ring-emerald-500', 'bg-emerald-500/10');
      }, 1500);

      closeScanner();
    };

    const startCamera = async () => {
      try {
        if (typeof Html5Qrcode === 'undefined') {
          console.warn('Html5Qrcode not loaded');
          return;
        }
        if (imeiScanner) {
          try { await imeiScanner.stop(); } catch (_) {}
        }
        imeiScanner = new Html5Qrcode('imei-reader');
        await imeiScanner.start(
          { facingMode: imeiCameraFacing },
          { fps: 15, qrbox: { width: 260, height: 160 }, aspectRatio: 1.5 },
          (decodedText: string) => {
            applyImei(decodedText);
          },
          () => { /* frame ignored */ }
        );
      } catch (err) {
        console.warn('IMEI camera init failed:', err);
      }
    };

    const stopCamera = async () => {
      if (imeiScanner) {
        try {
          await imeiScanner.stop();
          imeiScanner.clear();
        } catch (_) {}
        imeiScanner = null;
      }
      isImeiTorchOn = false;
      torchBtn?.classList.remove('text-amber-400', 'border-amber-400');
    };

    const openScanner = async () => {
      modal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      if (manualInput) manualInput.value = '';
      await startCamera();
    };

    const closeScanner = async () => {
      await stopCamera();
      modal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    };

    scanBtn.addEventListener('click', openScanner);
    closeBtn?.addEventListener('click', closeScanner);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeScanner();
    });

    torchBtn?.addEventListener('click', async () => {
      try {
        isImeiTorchOn = !isImeiTorchOn;
        await imeiScanner?.applyVideoConstraints({
          advanced: [{ torch: isImeiTorchOn }]
        });
        torchBtn.classList.toggle('text-amber-400', isImeiTorchOn);
        torchBtn.classList.toggle('border-amber-400', isImeiTorchOn);
      } catch (_) {
        console.warn('Torch not supported on this camera.');
      }
    });

    switchCamBtn?.addEventListener('click', async () => {
      imeiCameraFacing = imeiCameraFacing === 'environment' ? 'user' : 'environment';
      await startCamera();
    });

    manualApplyBtn?.addEventListener('click', () => {
      if (manualInput && manualInput.value.trim()) {
        applyImei(manualInput.value.trim());
      }
    });
    manualInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && manualInput.value.trim()) {
        applyImei(manualInput.value.trim());
      }
    });
  }

  // ── Module 2: Workshop Payment, Deposit & Change Calculator ───────────────
  function initPaymentCalculator() {
    const depositInput = document.getElementById('ticket-deposit') as HTMLInputElement;
    const remainingDisplay = document.getElementById('ticket-remaining-display') as HTMLElement;
    const remainingBadge = document.getElementById('ticket-remaining-badge') as HTMLElement;
    const cashGivenInput = document.getElementById('ticket-cash-given') as HTMLInputElement;
    const changeDueDisplay = document.getElementById('ticket-change-due') as HTMLElement;
    const methodInput = document.getElementById('ticket-payment-method') as HTMLInputElement;
    const methodChips = document.querySelectorAll('#payment-method-chips .pay-chip');

    if (!costInput) return;

    const recalculate = () => {
      const lang = localStorage.getItem('appLang') || 'tr';
      const isAr = lang === 'ar';

      const cost = parseFloat(costInput.value) || 0;
      const deposit = parseFloat(depositInput?.value || '0') || 0;
      const remaining = Math.max(0, cost - deposit);

      if (remainingDisplay) {
        remainingDisplay.textContent = `₺ ${remaining.toFixed(2)}`;
      }

      if (remainingBadge) {
        if (cost > 0 && remaining === 0) {
          remainingBadge.textContent = isAr ? 'مدفوع بالكامل' : 'Tamamı Ödendi';
          remainingBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
        } else if (remaining > 0) {
          remainingBadge.textContent = isAr ? 'المتبقي' : 'Kalan Bakiye';
          remainingBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30';
        } else {
          remainingBadge.textContent = isAr ? '0.00 ₺' : '0.00 ₺';
          remainingBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container text-on-surface-variant border border-white/5';
        }
      }

      if (cashGivenInput && changeDueDisplay) {
        const cashGiven = parseFloat(cashGivenInput.value) || 0;
        const targetAmount = deposit > 0 ? deposit : cost;
        const change = cashGiven > targetAmount ? cashGiven - targetAmount : 0;
        changeDueDisplay.textContent = change.toFixed(2);
      }
    };

    costInput.addEventListener('input', recalculate);
    depositInput?.addEventListener('input', recalculate);
    cashGivenInput?.addEventListener('input', recalculate);

    methodChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const method = chip.getAttribute('data-method') || 'cash';
        if (methodInput) methodInput.value = method;
        methodChips.forEach(c => {
          c.className = 'pay-chip px-2.5 py-1 rounded text-[11px] font-bold bg-surface-container border border-white/10 text-on-surface-variant hover:text-white transition-all';
        });
        chip.className = 'pay-chip active px-2.5 py-1 rounded text-[11px] font-bold bg-primary/20 border border-primary/40 text-primary transition-all';
      });
    });
  }

  // ── Module 3: Custom Glass Calendar & Time Picker ─────────────────────────
  function initDateTimePicker() {
    const trigger = document.getElementById('ticket-deadline-display') as HTMLInputElement;
    const calendarBtn = document.getElementById('open-calendar-btn');
    const popover = document.getElementById('calendar-picker-popover') as HTMLElement;
    const deadlineInput = document.getElementById('ticket-deadline') as HTMLInputElement;
    const monthYearLabel = document.getElementById('cal-month-year-label');
    const prevBtn = document.getElementById('cal-prev-month');
    const nextBtn = document.getElementById('cal-next-month');
    const daysGrid = document.getElementById('cal-days-grid');
    const customTimeInput = document.getElementById('cal-custom-time-input') as HTMLInputElement;
    const confirmBtn = document.getElementById('cal-confirm-btn');
    const toggleManualBtn = document.getElementById('toggle-manual-deadline-btn');

    if (!trigger || !popover || !deadlineInput) return;

    let viewDate = new Date();
    let selectedDate = new Date();
    selectedDate.setDate(selectedDate.getDate() + 1);
    selectedDate.setHours(18, 0, 0, 0);
    let selectedTime = '18:00';

    const formatLocalIso = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const updateDeadlineValues = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      deadlineInput.value = formatLocalIso(d);

      const lang = localStorage.getItem('appLang') || 'tr';
      const dateStr = d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
      const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      trigger.value = `${dateStr}, ${timeStr}`;
    };

    updateDeadlineValues(selectedDate);

    const renderCalendar = () => {
      const lang = localStorage.getItem('appLang') || 'tr';
      const isAr = lang === 'ar';
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();

      const monthNamesTr = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      if (monthYearLabel) {
        monthYearLabel.textContent = `${(isAr ? monthNamesAr : monthNamesTr)[month]} ${year}`;
      }

      if (!daysGrid) return;
      daysGrid.innerHTML = '';

      const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
      const totalDays = new Date(year, month + 1, 0).getDate();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div');
        daysGrid.appendChild(emptyCell);
      }

      for (let day = 1; day <= totalDays; day++) {
        const cellDate = new Date(year, month, day);
        cellDate.setHours(0, 0, 0, 0);
        const isPast = cellDate < today;
        const isSelected = selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === day;
        const isToday = today.getTime() === cellDate.getTime();

        const cell = document.createElement('button');
        cell.type = 'button';
        cell.textContent = String(day);
        cell.className = 'h-8 w-8 mx-auto rounded-lg flex items-center justify-center font-medium transition-all text-xs ';

        if (isPast) {
          cell.className += 'text-on-surface-variant/30 cursor-not-allowed';
          cell.disabled = true;
        } else if (isSelected) {
          cell.className += 'bg-primary text-black font-bold shadow-[0_0_12px_rgba(227,30,36,0.6)]';
        } else if (isToday) {
          cell.className += 'border border-primary/50 text-primary hover:bg-primary/20';
        } else {
          cell.className += 'text-on-surface hover:bg-white/10';
        }

        if (!isPast) {
          cell.addEventListener('click', () => {
            selectedDate.setFullYear(year, month, day);
            renderCalendar();
          });
        }

        daysGrid.appendChild(cell);
      }
    };

    const togglePopover = () => {
      const isHidden = popover.classList.contains('hidden');
      if (isHidden) {
        popover.classList.remove('hidden');
        renderCalendar();
      } else {
        popover.classList.add('hidden');
      }
    };

    trigger.addEventListener('click', togglePopover);
    calendarBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePopover();
    });

    prevBtn?.addEventListener('click', () => {
      viewDate.setMonth(viewDate.getMonth() - 1);
      renderCalendar();
    });

    nextBtn?.addEventListener('click', () => {
      viewDate.setMonth(viewDate.getMonth() + 1);
      renderCalendar();
    });

    document.querySelectorAll('#cal-time-chips .cal-time-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const time = chip.getAttribute('data-time') || '18:00';
        selectedTime = time;
        if (customTimeInput) customTimeInput.value = time;
        document.querySelectorAll('#cal-time-chips .cal-time-chip').forEach(c => {
          c.className = 'cal-time-chip py-1.5 px-2 rounded-lg text-xs bg-surface-container border border-white/10 text-on-surface hover:border-primary/50 transition-colors';
        });
        chip.className = 'cal-time-chip py-1.5 px-2 rounded-lg text-xs bg-primary/20 border border-primary/50 text-primary font-bold transition-colors';
      });
    });

    customTimeInput?.addEventListener('input', () => {
      selectedTime = customTimeInput.value;
    });

    confirmBtn?.addEventListener('click', () => {
      const [hh, mm] = selectedTime.split(':').map(n => parseInt(n, 10));
      selectedDate.setHours(hh || 18, mm || 0, 0, 0);
      updateDeadlineValues(selectedDate);
      popover.classList.add('hidden');
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const hours = btn.getAttribute('data-hours');
        const target = btn.getAttribute('data-target');
        const days = btn.getAttribute('data-days');
        const d = new Date();

        if (hours) {
          d.setHours(d.getHours() + parseInt(hours, 10));
          const expressBtn = document.querySelector('[data-priority="express"]') as HTMLElement;
          expressBtn?.click();
        } else if (target === 'today-18') {
          d.setHours(18, 0, 0, 0);
        } else if (target === 'tomorrow-12') {
          d.setDate(d.getDate() + 1);
          d.setHours(12, 0, 0, 0);
        } else if (days) {
          d.setDate(d.getDate() + parseInt(days, 10));
        }
        selectedDate = new Date(d);
        updateDeadlineValues(selectedDate);
      });
    });

    let isManualMode = false;
    toggleManualBtn?.addEventListener('click', () => {
      isManualMode = !isManualMode;
      if (isManualMode) {
        trigger.removeAttribute('readonly');
        trigger.focus();
      } else {
        trigger.setAttribute('readonly', 'true');
      }
    });

    trigger.addEventListener('input', () => {
      if (isManualMode && trigger.value) {
        deadlineInput.value = trigger.value;
      }
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!popover.contains(target) && target !== trigger && target !== calendarBtn && !calendarBtn?.contains(target)) {
        popover.classList.add('hidden');
      }
    });
  }

  // ── Module 4: Unified Modern Glass Warranty Dropdown ──────────────────────
  function initCustomWarrantyDropdown() {
    const display = document.getElementById('ticket-warranty-display') as HTMLInputElement;
    const hidden = document.getElementById('ticket-warranty') as HTMLInputElement;
    const box = document.getElementById('warranty-suggestions') as HTMLElement;
    const chevron = document.getElementById('warranty-chevron') as HTMLElement;

    if (!display || !hidden || !box) return;

    if (settings.defaultWarrantyMonths !== undefined) {
      hidden.value = settings.defaultWarrantyMonths.toString();
    }

    const currentMonths = hidden.value || '3';
    const initLang = localStorage.getItem('appLang') || 'tr';
    if (initLang === 'ar') {
      const arMap: Record<string, string> = {
        '0': 'بدون ضمان',
        '1': 'ضمان شهر واحد',
        '3': 'ضمان 3 أشهر (قياسي)',
        '6': 'ضمان 6 أشهر',
        '12': 'ضمان 12 شهراً (سنة)'
      };
      display.value = arMap[currentMonths] || 'ضمان 3 أشهر (قياسي)';
    } else {
      const trMap: Record<string, string> = {
        '0': 'Garanti Yok',
        '1': '1 Ay Garanti',
        '3': '3 Ay (Standart)',
        '6': '6 Ay Garanti',
        '12': '12 Ay (1 Yıl)'
      };
      display.value = trMap[currentMonths] || '3 Ay (Standart)';
    }

    const showOptions = () => {
      const lang = localStorage.getItem('appLang') || 'tr';
      const isAr = lang === 'ar';
      const options = isAr ? [
        { value: '0', label: 'بدون ضمان' },
        { value: '1', label: 'ضمان شهر واحد' },
        { value: '3', label: 'ضمان 3 أشهر (قياسي)' },
        { value: '6', label: 'ضمان 6 أشهر' },
        { value: '12', label: 'ضمان 12 شهراً (سنة)' }
      ] : [
        { value: '0', label: 'Garanti Yok' },
        { value: '1', label: '1 Ay Garanti' },
        { value: '3', label: '3 Ay (Standart)' },
        { value: '6', label: '6 Ay Garanti' },
        { value: '12', label: '12 Ay (1 Yıl)' }
      ];

      box.innerHTML = '';
      options.forEach(opt => {
        const item = document.createElement('div');
        item.className = 'px-4 py-2.5 hover:bg-primary/20 text-on-surface cursor-pointer text-sm transition-colors flex items-center justify-between';
        const isSelected = hidden.value === opt.value;
        item.innerHTML = `<span>${opt.label}</span>${isSelected ? '<span class="material-symbols-outlined text-primary text-[16px]">check</span>' : ''}`;
        item.addEventListener('click', () => {
          hidden.value = opt.value;
          display.value = opt.label;
          display.setAttribute('data-value', opt.value);
          box.classList.add('hidden');
          if (chevron) chevron.style.transform = '';
        });
        box.appendChild(item);
      });
      box.classList.remove('hidden');
      if (chevron) chevron.style.transform = 'rotate(180deg)';
    };

    display.addEventListener('click', (e) => {
      e.stopPropagation();
      if (box.classList.contains('hidden')) showOptions();
      else {
        box.classList.add('hidden');
        if (chevron) chevron.style.transform = '';
      }
    });

    document.addEventListener('click', (e) => {
      if (!box.contains(e.target as HTMLElement) && e.target !== display) {
        box.classList.add('hidden');
        if (chevron) chevron.style.transform = '';
      }
    });
  }

  // Initialize new modules
  initImeiScanner();
  initPaymentCalculator();
  initDateTimePicker();
  initCustomWarrantyDropdown();

  // 6. Submit Handler
  if (submitBtn) {
    submitBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const lang = localStorage.getItem('appLang') || 'tr';
      
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = lang === 'ar' ? 'جارٍ الحفظ...' : 'İşleniyor...';
      
      try {
        if (!nameInput.value.trim()) {
          const warnMsg = lang === 'ar' ? 'يرجى إدخال اسم العميل.' : 'Lütfen müşteri adını girin.';
          throw new Error(warnMsg);
        }

        let custId = selectedCustomerId;
        let customerRecord: any = null;
        if (!custId) {
          const newCust = await createCustomer(nameInput.value.trim(), phoneInput.value.trim(), lang);
          custId = newCust.id;
          customerRecord = newCust;
        } else {
          customerRecord = { id: custId, name: nameInput.value.trim(), phone: phoneInput.value.trim() };
        }

        let deviceId: string | undefined = undefined;
        let deviceModel = '';

        if (deviceSelect.value === 'new') {
          const brand = brandInput.value.trim() || 'Unknown';
          const model = modelInput.value.trim() || 'Device';
          const type = typeSelect.getAttribute('data-value') || 'phone';
          const imei = imeiInput.value.trim() || '';

          const newDev = await createDevice(custId, brand, model, type, imei);
          deviceId = newDev.id;
          deviceModel = `${brand} ${model}`;
        } else {
          deviceId = deviceSelect.value;
          const matchedDev = devicesList.find(d => d.id === deviceId);
          deviceModel = matchedDev ? `${matchedDev.brand} ${matchedDev.model}` : 'Saved Device';
        }

        const costVal = costInput.value ? parseFloat(costInput.value) : undefined;
        const depositVal = parseFloat((document.getElementById('ticket-deposit') as HTMLInputElement)?.value || '0') || 0;
        const paymentMethodVal = (document.getElementById('ticket-payment-method') as HTMLInputElement)?.value || 'cash';
        const remainingVal = Math.max(0, (costVal || 0) - depositVal);

        const priorityVal = (priorityInput?.value as 'normal' | 'express' | 'low') || 'normal';
        const deadlineVal = (document.getElementById('ticket-deadline') as HTMLInputElement)?.value ? new Date((document.getElementById('ticket-deadline') as HTMLInputElement).value).toISOString() : null;
        const passcodeVal = noPasscodeCheckbox?.checked ? '' : (passcodeField?.value.trim() || '');
        const conditionVal = conditionInput?.value.trim() || '';
        const accessoriesVal = accInput?.value.trim() || '';
        const warrantyVal = parseInt((document.getElementById('ticket-warranty') as HTMLInputElement)?.value || '3', 10);
        const techNotesVal = (document.getElementById('ticket-technician-notes') as HTMLTextAreaElement)?.value.trim() || '';

        const ticket = await createRepairTicket({
          customerId: custId,
          deviceModel,
          issueDescription: issueInput.value || (lang === 'ar' ? 'بدون وصف' : 'Açıklama yok'),
          cost: costVal,
          deposit: depositVal,
          paymentMethod: paymentMethodVal,
          deviceId,
          priority: priorityVal,
          estimatedCompletion: deadlineVal,
          devicePasscode: passcodeVal,
          intakeCondition: conditionVal,
          accessories: accessoriesVal,
          warrantyMonths: warrantyVal,
          technicianNotes: techNotesVal
        });

        playBeepSound('success');

        const qrDataUrl = await generateQrCodeDataUrl(ticket.qr_hash);
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-6';
        const titleText = lang === 'ar' ? 'تم إنشاء التذكرة بنجاح!' : 'Talep Başarıyla Oluşturuldu!';
        const descText = lang === 'ar' ? 'امسح أو اطبع إيصال الاستلام للصقه خلف الجهاز أو تسليمه للعميل.' : 'Cihazın arkasına yapıştırmak veya müşteriye teslim etmek için makbuzu yazdırın.';
        const doneText = lang === 'ar' ? 'تم' : 'Tamam';
        const printText = lang === 'ar' ? 'طباعة الإيصال' : 'Makbuz Yazdır';

        modal.innerHTML = `
          <div class="glass-panel p-8 rounded-2xl flex flex-col items-center gap-4 text-center max-w-sm w-full animate-in fade-in zoom-in duration-300">
            <div class="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <span class="material-symbols-outlined">check_circle</span>
            </div>
            <h2 class="text-2xl font-bold text-primary">${titleText}</h2>
            <p class="text-on-surface-variant text-sm">${descText}</p>
            <div class="bg-white p-4 rounded-xl shadow-[0_0_20px_rgba(255,180,171,0.2)]">
                <img src="${qrDataUrl}" alt="QR Code" class="w-44 h-44 rounded" />
            </div>
            <p class="font-mono text-xs text-on-surface-variant mt-1 break-all">${ticket.qr_hash}</p>
            
            <div class="flex flex-col gap-2 w-full mt-3">
              <button id="print-receipt-btn" class="w-full bg-primary/20 hover:bg-primary text-primary hover:text-black border border-primary/30 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all">
                <span class="material-symbols-outlined">print</span>
                ${printText}
              </button>
              <button id="close-modal" class="btn-primary w-full py-3 rounded-xl font-bold">${doneText}</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        
        const closeModal = () => {
          modal.remove();
          window.location.href = '/index.html';
        };

        modal.querySelector('#print-receipt-btn')?.addEventListener('click', async () => {
          await openReceiptPreviewModal({
            ticketId: ticket.id,
            qrHash: ticket.qr_hash,
            customerName: customerRecord?.name || nameInput.value.trim(),
            customerPhone: customerRecord?.phone || phoneInput.value.trim(),
            deviceModel,
            imei: imeiInput?.value.trim(),
            issueDescription: issueInput.value,
            cost: costVal,
            deposit: depositVal,
            remainingCost: remainingVal,
            paymentMethod: paymentMethodVal,
            priority: priorityVal,
            createdAt: ticket.created_at,
            estimatedCompletion: deadlineVal,
            devicePasscode: passcodeVal,
            intakeCondition: conditionVal,
            accessories: accessoriesVal,
            warrantyMonths: warrantyVal,
            lang
          });
        });

        document.getElementById('close-modal')?.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
          if (e.target === modal) closeModal();
        });

      } catch (err: any) {
        const errMsg = err?.message || (lang === 'ar' ? 'حدث خطأ أثناء إنشاء التذكرة' : 'Talep oluşturulurken hata oluştu');
        (window as any).showToast ? (window as any).showToast(errMsg, 'error') : alert(errMsg);
      } finally {
        submitBtn.innerHTML = originalText;
      }
    });
  }
});

