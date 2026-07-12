export type SupportedLang = 'tr' | 'ar';
type Translations = { [key: string]: string };

export const dictionary: Record<SupportedLang, Translations> = {
  tr: {
    'app.title': 'Oksijen',
    'app.subtitle': 'TEKNIK SERVISI',
    'nav.dashboard': 'Kontrol Paneli',
    'nav.tickets': 'Yeni Talep',
    'nav.scanner': 'QR Tarayıcı',
    'nav.kanban': 'Kanban',
    'nav.settings': 'Ayarlar',
    'nav.logout': 'Çıkış Yap',
    'header.overview': 'Genel Bakış',
    'dash.welcome': 'Günaydın, Teknisyen',
    'dash.subtitle': 'İşte onarım alanının mevcut durumu.',
    'dash.openRepairs': 'Açık Onarımlar',
    'dash.ready': 'Teslimata Hazır',
    'dash.warranty': 'Garanti Talepleri',
    'dash.income': 'Günlük Gelir',
    'dash.recent': 'Son Talepler',
    'dash.seeAll': 'Tümünü Gör',
    'kanban.new': 'Yeni Talepler',
    'kanban.progress': 'Onarımda',
    'kanban.quality': 'Kalite Kontrol',
    'kanban.ready': 'Teslimata Hazır',
    'kanban.startRepair': 'Onarıma Başla',
    'kanban.complete': 'Tamamla',
    'kanban.updating': 'Güncelleniyor...',
    'status.pending': 'Bekliyor',
    'status.in_progress': 'Onarımda',
    'status.completed': 'Tamamlandı',
    'ticket.title': 'Yeni Talep',
    'ticket.subtitle': 'Sisteme yeni bir onarım talebi ekleyin.',
    'ticket.customerInfo': 'Müşteri Bilgileri',
    'ticket.fullName': 'Ad Soyad',
    'ticket.phone': 'Telefon Numarası',
    'ticket.deviceInfo': 'Cihaz Bilgileri',
    'ticket.repairDetails': 'Onarım Detayları',
    'ticket.brand': 'Marka',
    'ticket.model': 'Model',
    'ticket.issue': 'Sorun Açıklaması',
    'ticket.estCost': 'Tahmini Tutar',
    'ticket.create': 'Talep Oluştur',
    'ticket.namePlaceholder': 'Müşteri adını girin',
    'ticket.phonePlaceholder': '+90 555 000 0000',
    'ticket.brandPlaceholder': 'örn. Apple',
    'ticket.modelPlaceholder': 'örn. iPhone 13',
    'ticket.imei': 'IMEI / Seri Numarası',
    'ticket.imeiPlaceholder': 'IMEI tara veya yaz',
    'ticket.issuePlaceholder': 'Sorunu açıklayın...',
    'ticket.pricePlaceholder': '0.00',
    'scanner.title': 'Cihazı Tara',
    'scanner.subtitle': 'Onarım detaylarını görüntülemek için cihazın QR kodunu okutun.',
    'scanner.align': 'QR Kodu hizalayın',
    'scanner.lookup': 'Talep Sorgula',
    'scanner.paste': 'QR Hash kodunu buraya yapıştırın',
    'login.title': 'Oturum Aç',
    'login.email': 'E-posta Adresi',
    'login.password': 'Şifre',
    'login.signin': 'Giriş Yap',
    'settings.title': 'Ayarlar',
    'settings.subtitle': 'Uygulama tercihlerinizi yönetin.',
    'settings.language': 'Dil Tercihi',
    'settings.theme': 'Tema',
    'settings.profile': 'Hesap Profili',
    
    'table.customer': 'Müşteri',
    'table.contact': 'İletişim',
    'table.status': 'Durum',
    'table.tickets': 'Talepler',
    'table.device': 'Cihaz',
    'table.owner': 'Sahibi',
    'table.serial': 'Seri / IMEI',
    'table.action': 'İşlem',
    'action.history': 'Geçmiş',
    'status.vip': 'VIP',
    'status.active': 'Aktif',
    'status.inactive': 'Pasif',
    
    'profile.title': 'Profilim',
    'profile.details': 'Hesap Detayları',
    'profile.email': 'E-posta',
    'profile.role': 'Rol',
    'profile.admin': 'Yeni Kullanıcı Ekle',
    'profile.adminDesc': 'Yönetici olarak kısıtlı teknisyen hesapları oluşturabilirsiniz. Teknisyenler talep oluşturabilir ve düzenleyebilir, ancak Ayarlar veya kullanıcı yönetimine erişemezler.',
    'profile.emailPlaceholder': 'Çalışan E-postası',
    'profile.passwordPlaceholder': 'Geçici Şifre',
    'profile.roleTech': 'Teknisyen (Kısıtlı)',
    'profile.roleAdmin': 'Yönetici (Tam Yetki)',
    'profile.createUserBtn': 'Kullanıcı Oluştur',
    'profile.signOutBtn': 'Çıkış Yap',
    'profile.loading': 'Yükleniyor...',
    'profile.adminText': 'Yönetici',
    'profile.accountTitle': 'Hesap',
    'profile.displayName': 'Ekran Adı',
    'profile.editTitle': 'Profili Düzenle',
    'profile.newPassword': 'Yeni Şifre (Değiştirmek İçin)',
    'profile.updateBtn': 'Bilgileri Güncelle',
    'profile.sessionTitle': 'Oturum',
    'profile.displayNamePlaceholder': 'Ekran adını girin',
    'profile.passwordPlaceholderMin': 'En az 6 karakter girin',
    'profile.updateSuccess': 'Profil başarıyla güncellendi!',
    'profile.updateBtnLoading': 'Güncelleniyor...',
    'profile.userDirectory': 'Kullanıcı Dizini',
    'profile.techText': 'Teknisyen',
    
    'login.testing': 'Test kimlik bilgileri: admin@oxygen.com / password123 kullanın.',
    'settings.role': 'Teknisyen',
    'settings.editProfile': 'Profili Düzenle',
    'settings.preferences': 'Uygulama Tercihleri',
    'settings.notifications': 'Bildirimler',
    'settings.pushNotif': 'Anlık Bildirimler',
    'settings.emailAlerts': 'E-posta Uyarıları',
    'settings.animations': 'Yüksek Performanslı Animasyonlar',
    'settings.danger': 'Tehlikeli Bölge',
    'settings.logoutDesc': 'Bu cihazdaki oturumunuzu güvenli bir şekilde kapatın.',
  
    'nav.customers': 'Müşteriler',
    'nav.devices': 'Cihazlar',
    'dir.customers': 'Müşteri Rehberi',
    'dir.devices': 'Cihaz Envanteri',
    'dir.searchCust': 'İsim veya telefon ara...',
    'dir.searchDev': 'Cihaz veya IMEI ara...',
    'dir.filterAll': 'Tümü',
    'dir.filterActive': 'Aktif',
    'dir.filterVIP': 'VIP',
    'dir.filterPhones': 'Telefonlar',
    'dir.filterLaptops': 'Laptoplar',
    'kanban.boardView': 'Pano Görünümü',
    'kanban.listView': 'Liste Görünümü',
    'kanban.allTicketsTitle': 'Tüm Talepler Listesi',
    'kanban.filterAll': 'Tüm Durumlar',
    'kanban.filterPending': 'Bekliyor',
    'kanban.filterProgress': 'Onarımda',
    'kanban.filterQuality': 'Kalite Kontrol',
    'kanban.filterReady': 'Teslimata Hazır',
    'kanban.sortNewest': 'En Yeni',
    'kanban.sortOldest': 'En Eski',
    'kanban.sortCostDesc': 'Fiyat: Yüksekten Düşüğe',
    'kanban.sortCostAsc': 'Fiyat: Düşükten Yükseğe',
},
  ar: {
    'app.title': 'أوكسجين',
    'app.subtitle': 'لخدمات التصليح الاحترافية',
    'nav.dashboard': 'لوحة القيادة',
    'nav.tickets': 'تذكرة جديدة',
    'nav.scanner': 'ماسح QR',
    'nav.kanban': 'كانبان',
    'nav.settings': 'الإعدادات',
    'nav.logout': 'تسجيل الخروج',
    'header.overview': 'نظرة عامة',
    'dash.welcome': 'صباح الخير، أيها الفني',
    'dash.subtitle': 'إليك الحالة الحالية لمنطقة الإصلاح.',
    'dash.openRepairs': 'الإصلاحات المفتوحة',
    'dash.ready': 'جاهز للتسليم',
    'dash.warranty': 'مطالبات الضمان',
    'dash.income': 'الدخل اليومي',
    'dash.recent': 'التذاكر الأخيرة',
    'dash.seeAll': 'عرض الكل',
    'kanban.new': 'تذاكر جديدة',
    'kanban.progress': 'قيد الإصلاح',
    'kanban.quality': 'فحص الجودة',
    'kanban.ready': 'جاهز للتسليم',
    'kanban.startRepair': 'بدء الإصلاح',
    'kanban.complete': 'إكمال',
    'kanban.updating': 'جاري التحديث...',
    'status.pending': 'قيد المراجعة',
    'status.in_progress': 'قيد الإصلاح',
    'status.completed': 'مكتمل',
    'ticket.title': 'تذكرة جديدة',
    'ticket.subtitle': 'أضف تذكرة إصلاح جديدة إلى النظام.',
    'ticket.customerInfo': 'معلومات العميل',
    'ticket.fullName': 'الاسم الكامل',
    'ticket.phone': 'رقم الهاتف',
    'ticket.deviceInfo': 'معلومات الجهاز',
    'ticket.repairDetails': 'تفاصيل الإصلاح',
    'ticket.brand': 'العلامة التجارية',
    'ticket.model': 'الموديل',
    'ticket.issue': 'وصف المشكلة',
    'ticket.estCost': 'التكلفة التقديرية',
    'ticket.create': 'إنشاء التذكرة',
    'ticket.namePlaceholder': 'أدخل اسم العميل',
    'ticket.phonePlaceholder': '+90 555 000 0000',
    'ticket.brandPlaceholder': 'مثال: أبل',
    'ticket.modelPlaceholder': 'مثال: آيفون 13',
    'ticket.imei': 'IMEI / الرقم التسلسلي',
    'ticket.imeiPlaceholder': 'امسح أو اكتب IMEI',
    'ticket.issuePlaceholder': 'صف المشكلة...',
    'ticket.pricePlaceholder': '0.00',
    'scanner.title': 'امسح الجهاز',
    'scanner.subtitle': 'امسح رمز QR الخاص بالجهاز لعرض تفاصيل الإصلاح.',
    'scanner.align': 'قم بمحاذاة رمز QR',
    'scanner.lookup': 'البحث عن تذكرة',
    'scanner.paste': 'الصق رمز QR الهاش هنا',
    'login.title': 'تسجيل الدخول',
    'login.email': 'البريد الإلكتروني',
    'login.password': 'كلمة المرور',
    'login.signin': 'تسجيل الدخول',
    'settings.title': 'الإعدادات',
    'settings.subtitle': 'إدارة تفضيلات التطبيق الخاص بك.',
    'settings.language': 'اللغة المفضلة',
    'settings.theme': 'المظهر',
    'settings.profile': 'ملف الحساب',
    
    'table.customer': 'العميل',
    'table.contact': 'الاتصال',
    'table.status': 'الحالة',
    'table.tickets': 'التذاكر',
    'table.device': 'الجهاز',
    'table.owner': 'المالك',
    'table.serial': 'الرقم التسلسلي / IMEI',
    'table.action': 'الإجراء',
    'action.history': 'السجل',
    'status.vip': 'شخصية هامة',
    'status.active': 'نشط',
    'status.inactive': 'غير نشط',
    
    'profile.title': 'ملفي الشخصي',
    'profile.details': 'تفاصيل الحساب',
    'profile.email': 'البريد الإلكتروني',
    'profile.role': 'الدور',
    'profile.admin': 'إضافة مستخدم جديد',
    'profile.adminDesc': 'بصفتك مسؤولاً، يمكنك إنشاء حسابات فنيين مقيدة. يمكن للفنيين إنشاء التذاكر وتعديلها، ولكن لا يمكنهم الوصول إلى الإعدادات أو إدارة المستخدمين.',
    'profile.emailPlaceholder': 'البريد الإلكتروني للموظف',
    'profile.passwordPlaceholder': 'كلمة المرور المؤقتة',
    'profile.roleTech': 'فني (مقيد)',
    'profile.roleAdmin': 'مسؤول (وصول كامل)',
    'profile.createUserBtn': 'إنشاء مستخدم',
    'profile.signOutBtn': 'تسجيل الخروج',
    'profile.loading': 'جاري التحميل...',
    'profile.adminText': 'مسؤول',
    'profile.accountTitle': 'الحساب',
    'profile.displayName': 'اسم العرض',
    'profile.editTitle': 'تعديل الملف الشخصي',
    'profile.newPassword': 'كلمة مرور جديدة (للتغيير)',
    'profile.updateBtn': 'تحديث البيانات',
    'profile.sessionTitle': 'الجلسة',
    'profile.displayNamePlaceholder': 'أدخل اسم العرض',
    'profile.passwordPlaceholderMin': 'أدخل 6 أحرف على الأقل',
    'profile.updateSuccess': 'تم تحديث الملف الشخصي بنجاح!',
    'profile.updateBtnLoading': 'جاري التحديث...',
    'profile.userDirectory': 'دليل المستخدمين',
    'profile.techText': 'فني',
    
    'login.testing': 'بيانات اعتماد الاختبار: استخدم admin@oxygen.com / password123.',
    'settings.role': 'فني',
    'settings.editProfile': 'تعديل الملف الشخصي',
    'settings.preferences': 'تفضيلات التطبيق',
    'settings.notifications': 'الإشعارات',
    'settings.pushNotif': 'إشعارات الدفع',
    'settings.emailAlerts': 'تنبيهات البريد الإلكتروني',
    'settings.animations': 'رسوم متحركة عالية الأداء',
    'settings.danger': 'منطقة الخطر',
    'settings.logoutDesc': 'قم بتسجيل الخروج بأمان من هذا الجهاز.',
    'nav.customers': 'العملاء',
    'nav.devices': 'الأجهزة',
    'dir.customers': 'دليل العملاء',
    'dir.devices': 'مخزون الأجهزة',
    'dir.searchCust': 'ابحث عن اسم أو هاتف...',
    'dir.searchDev': 'ابحث عن جهاز أو IMEI...',
    'dir.filterAll': 'الكل',
    'dir.filterActive': 'نشط',
    'dir.filterVIP': 'كبار الشخصيات',
    'dir.filterPhones': 'هواتف',
    'dir.filterLaptops': 'حواسيب محمولة',
    'kanban.boardView': 'عرض اللوحة',
    'kanban.listView': 'عرض القائمة',
    'kanban.allTicketsTitle': 'قائمة جميع التذاكر',
    'kanban.filterAll': 'جميع الحالات',
    'kanban.filterPending': 'قيد الانتظار',
    'kanban.filterProgress': 'قيد الإصلاح',
    'kanban.filterQuality': 'فحص الجودة',
    'kanban.filterReady': 'جاهز للتسليم',
    'kanban.sortNewest': 'الأحدث أولاً',
    'kanban.sortOldest': 'الأقدم أولاً',
    'kanban.sortCostDesc': 'السعر: من الأعلى إلى الأقل',
    'kanban.sortCostAsc': 'السعر: من الأقل إلى الأعلى',
  }
};

export function getLang(): SupportedLang {
    const saved = localStorage.getItem('appLang');
    return (saved === 'ar' || saved === 'tr') ? saved : 'tr';
}

export function setLang(lang: SupportedLang) {
    localStorage.setItem('appLang', lang);
    applyTranslation(lang);
}

// Inject Arabic Fonts & Currency Symbol overrides once
if (typeof document !== 'undefined' && !document.getElementById('arabic-fonts')) {
    const style = document.createElement('style');
    style.id = 'arabic-fonts';
    style.textContent = `
        @font-face {
            font-family: 'LemonBrushArabic';
            src: url('/fonts/LemonBrushArabic-Regular.otf') format('opentype');
            font-weight: normal;
            font-style: normal;
            /* Only apply to Arabic characters; digits and Latin will fall back */
            unicode-range: U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF;
        }
        @font-face {
            font-family: 'LemonBrushTexture';
            src: url('/fonts/LemonBrush-Texture.otf') format('opentype');
            font-weight: normal;
            font-style: normal;
        }
        
        /* Force font for all elements except material icons when in RTL */
        html[dir="rtl"] *:not(.material-symbols-outlined) {
            font-family: 'LemonBrushArabic', 'Inter', sans-serif !important;
        }

        /* Fix Turkish Lira symbol (U+20BA) rendering globally across all font-families */
        @font-face {
            font-family: 'LiraFix';
            src: local('Segoe UI'), local('Arial'), local('sans-serif');
            unicode-range: U+20BA;
        }

        /* Hide scrollbars globally across all components, containers, and modals */
        ::-webkit-scrollbar {
            display: none !important;
        }
        * {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
        }

        /* Hide native increment/decrement spin buttons globally for number inputs */
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        input[type=number] {
            -moz-appearance: textfield;
        }
    `;
    document.head.appendChild(style);
}

export function applyTranslation(lang?: SupportedLang) {
    const currentLang = lang || getLang();
    const html = document.documentElement;

    if (currentLang === 'ar') {
        html.setAttribute('dir', 'rtl');
        html.style.fontFamily = "'LemonBrushArabic', sans-serif";
        html.style.fontWeight = '500';
    } else {
        html.setAttribute('dir', 'ltr');
        html.style.fontFamily = 'Inter, sans-serif';
        html.style.fontWeight = 'normal';
    }

    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key && dictionary[currentLang][key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                const input = el as HTMLInputElement;
                if (input.readOnly) {
                    input.value = dictionary[currentLang][key];
                } else {
                    input.placeholder = dictionary[currentLang][key];
                }
            } else {
                el.textContent = dictionary[currentLang][key];
            }
        }
    });

    document.documentElement.classList.remove('i18n-loading');
}
