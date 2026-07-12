import { createCustomer, createRepairTicket, getCustomers, getDevices, createDevice } from './lib/repairService';
import { generateQrCodeDataUrl } from './lib/qrUtils';

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
    
    deviceSelect.innerHTML = `<option value="new">+ Add New Device</option>`;
    
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
      const options = [
        { value: 'phone', label: lang === 'ar' ? 'هاتف / Phone' : 'Phone / Telefon' },
        { value: 'laptop', label: lang === 'ar' ? 'حاسب محمول / Laptop' : 'Laptop / Dizüstü' },
        { value: 'tablet', label: lang === 'ar' ? 'تابلت / Tablet' : 'Tablet' },
        { value: 'watch', label: lang === 'ar' ? 'ساعة ذكية / Watch' : 'Smart Watch / Akıllı Saat' },
        { value: 'other', label: lang === 'ar' ? 'آخر / Other' : 'Other / Diğer' }
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

  // 5. Submit Handler
  if (submitBtn) {
    submitBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = 'Processing...';
      
      try {
        if (!nameInput.value.trim()) {
          throw new Error('Please fill in the customer name.');
        }

        let custId = selectedCustomerId;
        if (!custId) {
          const newCust = await createCustomer(nameInput.value.trim(), phoneInput.value.trim(), 'tr');
          custId = newCust.id;
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
        const ticket = await createRepairTicket({
          customerId: custId,
          deviceModel,
          issueDescription: issueInput.value || 'No description',
          cost: costVal,
          deviceId
        });

        const qrDataUrl = await generateQrCodeDataUrl(ticket.qr_hash);
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-6';
        modal.innerHTML = `
          <div class="glass-panel p-8 rounded-2xl flex flex-col items-center gap-4 text-center max-w-sm w-full animate-in fade-in zoom-in duration-300">
            <div class="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <span class="material-symbols-outlined">check_circle</span>
            </div>
            <h2 class="text-2xl font-bold text-primary">Ticket Created Successfully!</h2>
            <p class="text-on-surface-variant text-sm">Scan or print this tracking code for the device backside.</p>
            <div class="bg-white p-4 rounded-xl shadow-[0_0_20px_rgba(255,180,171,0.2)]">
                <img src="${qrDataUrl}" alt="QR Code" class="w-48 h-48 rounded" />
            </div>
            <p class="font-mono text-xs text-on-surface-variant mt-2 break-all">${ticket.qr_hash}</p>
            <button id="close-modal" class="mt-4 btn-primary w-full py-3 rounded-xl font-bold">Done</button>
          </div>
        `;
        document.body.appendChild(modal);
        
        document.getElementById('close-modal')?.addEventListener('click', () => {
          modal.remove();
          window.location.href = '/index.html';
        });

      } catch (err: any) {
        alert('Error creating ticket: ' + err.message);
      } finally {
        submitBtn.innerHTML = originalText;
      }
    });
  }
});
