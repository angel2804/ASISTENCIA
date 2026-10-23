// ====================================================
// MOVISTAR ASISTENCIA MÓVIL - CLIENT LOGIC (UTF-8)
// ====================================================

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const headerLiveClock = document.getElementById('header-live-clock');
  const headerLiveDate = document.getElementById('header-live-date');
  const statusClock = document.getElementById('status-clock');
  
  // DNI & Worker Elements
  const inputDni = document.getElementById('input-dni');
  const inputNombre = document.getElementById('input-nombre');
  const workerDetectedBox = document.getElementById('worker-detected-box');
  const workerAvatarLetter = document.getElementById('worker-avatar-letter');
  const workerDetectedName = document.getElementById('worker-detected-name');
  const workerDetectedCargo = document.getElementById('worker-detected-cargo');
  const workerNewNameBox = document.getElementById('worker-new-name-box');
  const chkRecordar = document.getElementById('chk-recordar');

  // GPS Elements
  const gpsStatusBox = document.getElementById('gps-status-box');
  const gpsStatusTitle = document.getElementById('gps-status-title');
  const gpsStatusDesc = document.getElementById('gps-status-desc');
  const gpsCoordsPreview = document.getElementById('gps-coords-preview');
  const gpsAddressText = document.getElementById('gps-address-text');
  const gpsAccuracyText = document.getElementById('gps-accuracy-text');
  const btnToggleDemoGps = document.getElementById('btn-toggle-demo-gps');

  // Buttons
  const btnMarcar = document.getElementById('btn-marcar');
  const btnCambiarDni = document.getElementById('btn-cambiar-dni');
  const btnWorkerShareWhatsapp = document.getElementById('btn-worker-share-whatsapp');

  // Sections
  const sectionFormMarcar = document.getElementById('section-form-marcar');
  const sectionYaMarco = document.getElementById('section-ya-marco');

  // Locked Card Elements
  const lockedWorkerName = document.getElementById('locked-worker-name');
  const lockedWorkerDni = document.getElementById('locked-worker-dni');
  const lockedDate = document.getElementById('locked-date');
  const lockedTime = document.getElementById('locked-time');
  const lockedAddress = document.getElementById('locked-address');

  // Admin Elements
  const adminStatTotal = document.getElementById('admin-stat-total');
  const adminStatPrimera = document.getElementById('admin-stat-primera');
  const adminFilterDate = document.getElementById('admin-filter-date');
  const adminAttendanceList = document.getElementById('admin-attendance-list');
  const btnAdminRefresh = document.getElementById('btn-admin-refresh');
  const btnAdminWhatsappAll = document.getElementById('btn-admin-whatsapp-all');
  const btnAdminCopySummary = document.getElementById('btn-admin-copy-summary');
  const btnAdminResetToday = document.getElementById('btn-admin-reset-today');

  // Desktop companion
  const sideQrImg = document.getElementById('side-qr-img');
  const sideHttpsUrl = document.getElementById('side-https-url');

  // Toast & Modals
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  const toastIcon = document.getElementById('toast-icon');
  const modalGpsHelp = document.getElementById('modal-gps-help');
  const btnModalRetryGps = document.getElementById('btn-modal-retry-gps');
  const btnModalDemoGps = document.getElementById('btn-modal-demo-gps');
  const btnModalCloseGps = document.getElementById('btn-modal-close-gps');

  // Tabs
  const navItems = document.querySelectorAll('.nav-item');
  const tabScreens = document.querySelectorAll('.tab-screen');

  // State & Caches
  const recordsCache = new Map();
  let currentWorker = null;
  let currentGps = null;
  let currentTodayRecord = null;
  let useDemoGps = false;
  let lockedMapInstance = null;

  // Demo Location coordinates (Torre Movistar / San Isidro / Miraflores)
  const DEMO_COORDS = [
    { lat: -12.08642, lng: -77.03215, address: 'Torre Movistar, Av. Javier Prado Este, Lima' },
    { lat: -12.12154, lng: -77.02982, address: 'Centro de Experiencia Movistar, Miraflores, Lima' },
    { lat: -12.08115, lng: -77.03489, address: 'Central Técnica Movistar, Lince, Lima' }
  ];

  // ====================================================
  // CLOCK & TIME (Always Peru America/Lima Timezone)
  // ====================================================
  const PERU_TZ = 'America/Lima';

  function updateClock() {
    const now = new Date();
    const timeStr = new Intl.DateTimeFormat('es-PE', {
      timeZone: PERU_TZ,
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(now);

    const shortTimeStr = new Intl.DateTimeFormat('es-PE', {
      timeZone: PERU_TZ,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }).format(now);

    const dateStr = new Intl.DateTimeFormat('es-PE', {
      timeZone: PERU_TZ,
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(now);

    if (headerLiveClock) headerLiveClock.textContent = timeStr;
    if (statusClock) statusClock.textContent = shortTimeStr;
    if (headerLiveDate) headerLiveDate.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Set default admin date picker to Peru today (YYYY-MM-DD)
  const todayPeruIso = new Intl.DateTimeFormat('en-CA', {
    timeZone: PERU_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  if (adminFilterDate) adminFilterDate.value = todayPeruIso;

  // ====================================================
  // TOAST NOTIFICATIONS
  // ====================================================
  let toastTimer = null;
  function showToast(message, type = 'info') {
    clearTimeout(toastTimer);
    toastMsg.textContent = message;
    toast.className = 'toast-notice show';

    if (type === 'success') {
      toast.classList.add('toast-success');
      toastIcon.className = 'fa-solid fa-circle-check';
    } else if (type === 'error') {
      toast.classList.add('toast-error');
      toastIcon.className = 'fa-solid fa-triangle-exclamation';
    } else {
      toastIcon.className = 'fa-solid fa-circle-info';
    }

    toastTimer = setTimeout(() => {
      toast.className = 'toast-notice';
    }, 3800);
  }

  // ====================================================
  // LOAD NETWORK INFO & DESKTOP COMPANION
  // ====================================================
  async function loadNetworkInfo() {
    try {
      const isPublicHost = window.location.hostname !== 'localhost' && !window.location.hostname.startsWith('192.168.') && !window.location.hostname.startsWith('127.');
      
      if (isPublicHost) {
        // App is deployed to the internet (e.g. Render, Railway, Vercel)
        const publicUrl = window.location.origin;
        if (sideHttpsUrl) {
          sideHttpsUrl.innerHTML = `<a href="${publicUrl}" target="_blank" style="color: inherit; text-decoration: none;">${publicUrl}</a>`;
        }
        try {
          const qrRes = await fetch(`/api/qr-dynamic?url=${encodeURIComponent(publicUrl)}`);
          const qrData = await qrRes.json();
          if (sideQrImg && qrData.qr) sideQrImg.src = qrData.qr;
        } catch (e) {}
        return;
      }

      // Local LAN environment
      const res = await fetch('/api/network-info');
      const data = await res.json();
      if (sideQrImg && data.qrHttps) {
        sideQrImg.src = data.qrHttps;
      }
      if (sideHttpsUrl && data.httpsUrl) {
        sideHttpsUrl.innerHTML = `<a href="${data.httpsUrl}" target="_blank" style="color: inherit; text-decoration: none;">${data.httpsUrl}</a>`;
      }
    } catch (e) {
      console.warn('Network info unavailable:', e);
    }
  }
  loadNetworkInfo();

  // ====================================================
  // TABS NAVIGATION & ADMIN PIN (PIN: 2804)
  // ====================================================
  const ADMIN_SECRET_PIN = '2804';
  const modalAdminPin = document.getElementById('modal-admin-pin');
  const adminPinInput = document.getElementById('admin-pin-input');
  const pinErrorMsg = document.getElementById('pin-error-msg');
  const btnSubmitPin = document.getElementById('btn-submit-pin');
  const btnCancelPin = document.getElementById('btn-cancel-pin');
  const btnAdminLogout = document.getElementById('btn-admin-logout');
  let currentActiveTab = 'tab-marcar';

  function switchTab(targetTab) {
    currentActiveTab = targetTab;
    navItems.forEach(n => {
      if (n.getAttribute('data-tab') === targetTab) {
        n.classList.add('active');
      } else {
        n.classList.remove('active');
      }
    });

    tabScreens.forEach(s => s.classList.remove('active'));
    const targetScreen = document.getElementById(targetTab);
    if (targetScreen) targetScreen.classList.add('active');

    if (targetTab === 'tab-admin') {
      loadAdminAttendances();
    } else if (targetTab === 'tab-historial') {
      loadHistorial();
    } else if (targetTab === 'tab-marcar') {
      if (lockedMapInstance) {
        setTimeout(() => lockedMapInstance.invalidateSize(), 200);
      }
    }
  }

  function openPinModal() {
    if (modalAdminPin) {
      modalAdminPin.classList.add('active');
      if (adminPinInput) {
        adminPinInput.value = '';
        if (pinErrorMsg) pinErrorMsg.style.display = 'none';
        setTimeout(() => adminPinInput.focus(), 150);
      }
    }
  }

  function closePinModal() {
    if (modalAdminPin) {
      modalAdminPin.classList.remove('active');
      if (adminPinInput) adminPinInput.value = '';
      if (pinErrorMsg) pinErrorMsg.style.display = 'none';
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      
      // If clicking Admin tab, require PIN 2804!
      if (targetTab === 'tab-admin') {
        const isAuth = sessionStorage.getItem('movistar_admin_pin') === ADMIN_SECRET_PIN;
        if (!isAuth) {
          openPinModal();
          return;
        }
      }

      switchTab(targetTab);
    });
  });

  // Verify PIN submission
  function handlePinVerification() {
    const enteredPin = (adminPinInput ? adminPinInput.value : '').trim();
    if (enteredPin === ADMIN_SECRET_PIN) {
      sessionStorage.setItem('movistar_admin_pin', ADMIN_SECRET_PIN);
      closePinModal();
      SoundEffects.playSuccess();
      showToast('✅ Acceso concedido al Administrador', 'success');
      switchTab('tab-admin');
    } else {
      SoundEffects.playError();
      if (pinErrorMsg) pinErrorMsg.style.display = 'block';
      if (adminPinInput) {
        adminPinInput.classList.add('input-shake');
        setTimeout(() => adminPinInput.classList.remove('input-shake'), 400);
        adminPinInput.value = '';
        adminPinInput.focus();
      }
    }
  }

  if (btnSubmitPin) {
    btnSubmitPin.addEventListener('click', handlePinVerification);
  }

  if (adminPinInput) {
    adminPinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handlePinVerification();
    });
  }

  if (btnCancelPin) {
    btnCancelPin.addEventListener('click', () => {
      closePinModal();
      // Keep on current active tab
      switchTab(currentActiveTab || 'tab-marcar');
    });
  }

  if (btnAdminLogout) {
    btnAdminLogout.addEventListener('click', () => {
      sessionStorage.removeItem('movistar_admin_pin');
      showToast('🔒 Sesión de Administrador cerrada', 'info');
      switchTab('tab-marcar');
    });
  }

  // ====================================================
  // DNI LOOKUP & REMEMBER FEATURE
  // ====================================================
  const savedDni = localStorage.getItem('movistar_saved_dni');
  if (savedDni) {
    inputDni.value = savedDni;
    checkWorker(savedDni);
  }

  let dniTimeout = null;
  inputDni.addEventListener('input', () => {
    inputDni.value = inputDni.value.replace(/[^0-9]/g, '');
    const dni = inputDni.value.trim();

    clearTimeout(dniTimeout);
    if (dni.length >= 6) {
      dniTimeout = setTimeout(() => {
        checkWorker(dni);
      }, 350);
    } else {
      resetWorkerBox();
    }
  });

  async function checkWorker(dni) {
    try {
      // 1. Check if already marked today
      const hoyRes = await fetch(`/api/asistencias/hoy/${dni}`);
      const hoyData = await hoyRes.json();

      if (hoyData.marked && hoyData.record) {
        currentTodayRecord = hoyData.record;
        recordsCache.set(hoyData.record.id, hoyData.record);
        renderAlreadyMarked(hoyData.record);
        return;
      } else {
        sectionYaMarco.style.display = 'none';
        sectionFormMarcar.style.display = 'block';
      }

      // 2. Fetch worker info
      const res = await fetch(`/api/colaboradores/${dni}`);
      const data = await res.json();

      if (data.found) {
        currentWorker = data.colaborador;
        workerAvatarLetter.textContent = currentWorker.nombre.charAt(0).toUpperCase();
        workerDetectedName.textContent = currentWorker.nombre;
        workerDetectedCargo.textContent = `${currentWorker.cargo} - ${currentWorker.area}`;
        workerDetectedBox.style.display = 'flex';
        workerNewNameBox.style.display = 'none';
      } else {
        currentWorker = null;
        workerDetectedBox.style.display = 'none';
        workerNewNameBox.style.display = 'block';
      }

      if (chkRecordar.checked) {
        localStorage.setItem('movistar_saved_dni', dni);
      }
    } catch (e) {
      console.warn('Error checking worker:', e);
    }
  }

  function resetWorkerBox() {
    currentWorker = null;
    workerDetectedBox.style.display = 'none';
    workerNewNameBox.style.display = 'none';
  }

  btnCambiarDni.addEventListener('click', () => {
    sectionYaMarco.style.display = 'none';
    sectionFormMarcar.style.display = 'block';
    inputDni.value = '';
    resetWorkerBox();
    inputDni.focus();
  });

  // ====================================================
  // GEOLOCATION & GPS (MANDATORY REQUIREMENT)
  // ====================================================
  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: { 'Accept-Language': 'es' }
      });
      if (!res.ok) throw new Error('Geocoding error');
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(',');
        const shortAddress = parts.slice(0, 3).join(',').trim();
        return shortAddress;
      }
    } catch (e) {
      console.warn('Nominatim reverse geocoding fallback:', e);
    }
    return `Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  function updateGpsStatusUI(status, message) {
    if (status === 'acquiring') {
      gpsStatusBox.className = 'gps-status-card';
      gpsStatusTitle.textContent = 'Adquiriendo GPS Satelital...';
      gpsStatusDesc.textContent = message || 'Conectando con satélites para obtener ubicación exacta.';
    } else if (status === 'success') {
      gpsStatusBox.className = 'gps-status-card gps-active';
      gpsStatusTitle.textContent = 'Ubicación GPS Confirmada';
      gpsStatusDesc.textContent = message || 'Posición satelital validada exitosamente.';
    } else if (status === 'error') {
      gpsStatusBox.className = 'gps-status-card gps-error';
      gpsStatusTitle.textContent = 'GPS Inactivo o Bloqueado';
      gpsStatusDesc.textContent = message || 'Debes permitir el acceso a la ubicación en tu navegador celular.';
    }
  }

  // Toggle demo GPS simulation
  btnToggleDemoGps.addEventListener('click', () => {
    useDemoGps = !useDemoGps;
    if (useDemoGps) {
      btnToggleDemoGps.style.background = '#5BC500';
      showToast('🎯 Modo GPS Simulado activado para pruebas', 'info');
      const randomDemo = DEMO_COORDS[Math.floor(Math.random() * DEMO_COORDS.length)];
      currentGps = {
        lat: randomDemo.lat,
        lng: randomDemo.lng,
        accuracy: 8,
        address: randomDemo.address
      };
      updateGpsStatusUI('success', `GPS Simulado: ${randomDemo.address}`);
      showGpsPreview(currentGps);
    } else {
      btnToggleDemoGps.style.background = 'rgba(255,255,255,0.15)';
      currentGps = null;
      updateGpsStatusUI('acquiring', 'El sistema solicitará tu GPS real al marcar.');
      gpsCoordsPreview.style.display = 'none';
      showToast('GPS Real reactivado', 'info');
    }
  });

  function showGpsPreview(gps) {
    gpsCoordsPreview.style.display = 'block';
    gpsAddressText.textContent = `📍 ${gps.address}`;
    gpsAccuracyText.textContent = `Precisión GPS: ±${gps.accuracy}m (Lat: ${gps.lat.toFixed(4)}, Lng: ${gps.lng.toFixed(4)})`;
  }

  // Get high accuracy GPS location from mobile device
  function obtainGpsPosition() {
    return new Promise((resolve, reject) => {
      if (useDemoGps && currentGps) {
        return resolve(currentGps);
      }

      if (!('geolocation' in navigator)) {
        return reject(new Error('Tu navegador o dispositivo no soporta geolocalización satelital.'));
      }

      updateGpsStatusUI('acquiring', 'Obteniendo coordenadas satelitales de alta precisión...');

      const options = {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = Math.round(position.coords.accuracy || 10);

          updateGpsStatusUI('acquiring', 'Obteniendo dirección del punto GPS...');
          const address = await reverseGeocode(lat, lng);

          const gpsData = { lat, lng, accuracy, address };
          currentGps = gpsData;
          updateGpsStatusUI('success', `GPS Activo: ±${accuracy}m de precisión`);
          showGpsPreview(gpsData);
          resolve(gpsData);
        },
        (error) => {
          console.error('Geolocation error:', error.code, error.message);
          let userMsg = 'No se pudo obtener tu ubicación satelital.';
          if (error.code === error.PERMISSION_DENIED) {
            userMsg = 'Permiso de ubicación denegado. Es OBLIGATORIO activar el GPS para marcar.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            userMsg = 'Señal GPS no disponible. Verifica que tu GPS esté encendido en tu celular.';
          } else if (error.code === error.TIMEOUT) {
            userMsg = 'Tiempo de espera agotado buscando señal GPS.';
          }
          updateGpsStatusUI('error', userMsg);
          reject(new Error(userMsg));
        },
        options
      );
    });
  }

  // GPS Help Modal handlers
  btnModalRetryGps.addEventListener('click', async () => {
    modalGpsHelp.classList.remove('active');
    try {
      await obtainGpsPosition();
      showToast('✅ Señal GPS adquirida con éxito', 'success');
    } catch (e) {
      modalGpsHelp.classList.add('active');
    }
  });

  btnModalDemoGps.addEventListener('click', () => {
    modalGpsHelp.classList.remove('active');
    btnToggleDemoGps.click();
  });

  btnModalCloseGps.addEventListener('click', () => {
    modalGpsHelp.classList.remove('active');
  });

  // ====================================================
  // MARCAR ASISTENCIA (MAIN SUBMIT)
  // ====================================================
  btnMarcar.addEventListener('click', async () => {
    const dni = inputDni.value.trim();

    // 1. Validate DNI
    if (!dni || dni.length < 6) {
      showToast('⚠️ Ingresa un DNI válido de al menos 6 a 8 dígitos', 'error');
      SoundEffects.playError();
      inputDni.focus();
      return;
    }

    // Worker name
    let nombre = '';
    if (currentWorker) {
      nombre = currentWorker.nombre;
    } else {
      nombre = inputNombre.value.trim();
      if (!nombre) {
        showToast('⚠️ Por favor ingresa tu Nombre y Apellido para registrarte', 'error');
        SoundEffects.playError();
        inputNombre.focus();
        return;
      }
    }

    // 2. MANDATORY GPS CHECK
    btnMarcar.disabled = true;
    btnMarcar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Obteniendo GPS Satelital...</span>';

    let gpsData = currentGps;
    if (!gpsData) {
      try {
        gpsData = await obtainGpsPosition();
      } catch (gpsError) {
        btnMarcar.disabled = false;
        btnMarcar.innerHTML = '<i class="fa-solid fa-fingerprint"></i><span>MARCAR ASISTENCIA AHORA</span>';
        SoundEffects.playError();
        modalGpsHelp.classList.add('active');
        return;
      }
    }

    // 3. SEND POST TO BACKEND
    btnMarcar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Registrando Asistencia...</span>';

    try {
      const payload = {
        dni,
        nombre,
        lat: gpsData.lat,
        lng: gpsData.lng,
        precision: gpsData.accuracy,
        direccion: gpsData.address,
        deviceInfo: navigator.userAgent.includes('Mobile') ? 'Celular Móvil' : 'Web Browser'
      };

      const res = await fetch('/api/asistencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.status === 409 || data.alreadyMarked) {
        // ALREADY MARKED TODAY RESTRICTION!
        SoundEffects.playError();
        showToast('⚠️ Ya marcaste tu asistencia el día de hoy', 'error');
        currentTodayRecord = data.record;
        recordsCache.set(data.record.id, data.record);
        renderAlreadyMarked(data.record);
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al registrar asistencia');
      }

      // SUCCESS!
      if (chkRecordar.checked) {
        localStorage.setItem('movistar_saved_dni', dni);
      }

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 150, 50, 200]);
      }

      // Confetti burst
      triggerConfetti();

      // Sound chime
      SoundEffects.playSuccess();

      showToast('🎉 ¡Marcación Exitosa Registrada!', 'success');
      currentTodayRecord = data.record;
      recordsCache.set(data.record.id, data.record);
      renderAlreadyMarked(data.record);

    } catch (err) {
      console.error(err);
      SoundEffects.playError();
      showToast(err.message || 'Error de conexión con el servidor', 'error');
    } finally {
      btnMarcar.disabled = false;
      btnMarcar.innerHTML = '<i class="fa-solid fa-fingerprint"></i><span>MARCAR ASISTENCIA AHORA</span>';
    }
  });

  // ====================================================
  // CONFETTI CELEBRATION
  // ====================================================
  function triggerConfetti() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#019DF4', '#5BC500', '#ffffff', '#FF7900']
      });
    }
  }

  // ====================================================
  // RENDER ALREADY MARKED (LOCKED CARD + MAP)
  // ====================================================
  function renderAlreadyMarked(record) {
    sectionFormMarcar.style.display = 'none';
    sectionYaMarco.style.display = 'block';

    lockedWorkerName.textContent = record.nombre;
    lockedWorkerDni.textContent = record.dni;
    lockedDate.textContent = record.fecha;
    lockedTime.textContent = record.hora;
    lockedAddress.textContent = record.direccion || `Lat: ${record.lat.toFixed(4)}, Lng: ${record.lng.toFixed(4)}`;

    // Render Leaflet Map
    renderLockedMap(record.lat, record.lng, record.nombre, record.hora);

    // Setup worker WhatsApp share (Reporte de Ingreso individual)
    btnWorkerShareWhatsapp.onclick = () => {
      const msg = `📱 *REPORTE DE INGRESO - MOVISTAR*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 *Colaborador:* ${record.nombre}\n` +
        `🆔 *DNI:* ${record.dni}\n` +
        `📅 *Fecha:* ${record.fecha}\n` +
        `⏰ *Hora de Ingreso:* ${record.hora}\n` +
        `📍 *Lugar:* ${record.direccion}\n` +
        `🗺️ *Ubicación GPS:*\n${record.googleMapsUrl}\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `✅ *Asistencia registrada y validada con GPS satelital*`;
      
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank');
    };
  }

  function renderLockedMap(lat, lng, name, time) {
    const mapBox = document.getElementById('locked-map-box');
    if (!mapBox) return;

    if (lockedMapInstance) {
      lockedMapInstance.remove();
      lockedMapInstance = null;
    }

    lockedMapInstance = L.map('locked-map-box', {
      zoomControl: false,
      attributionControl: false
    }).setView([lat, lng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(lockedMapInstance);

    L.circle([lat, lng], {
      color: '#019DF4',
      fillColor: '#019DF4',
      fillOpacity: 0.2,
      radius: 40
    }).addTo(lockedMapInstance);

    const movistarIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `<div style="background: #019DF4; color: #fff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(1,157,244,0.6); border: 2.5px solid #fff; font-size: 15px;"><i class="fa-solid fa-location-dot"></i></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -32]
    });

    const marker = L.marker([lat, lng], { icon: movistarIcon }).addTo(lockedMapInstance);
    marker.bindPopup(`<b>${name}</b><br>⏰ ${time}<br>✅ Marcado con GPS satelital`).openPopup();

    setTimeout(() => {
      if (lockedMapInstance) lockedMapInstance.invalidateSize();
    }, 250);
  }

  // ====================================================
  // HISTORIAL DE MARCACIONES
  // ====================================================
  async function loadHistorial() {
    const container = document.getElementById('historial-list-container');
    const dni = inputDni.value.trim() || localStorage.getItem('movistar_saved_dni');

    if (!dni) {
      container.innerHTML = `
        <div style="text-align: center; padding: 24px 10px; color: #64748b; font-size: 0.85rem;">
          <i class="fa-solid fa-id-card" style="font-size: 2rem; color: #cbd5e1; margin-bottom: 8px; display: block;"></i>
          Ingresa tu DNI en la pestaña <strong>Marcar</strong> para ver tu historial de asistencias.
        </div>`;
      return;
    }

    container.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando...</div>';

    try {
      const res = await fetch(`/api/asistencias?dni=${dni}`);
      const data = await res.json();

      if (data.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 24px 10px; color: #64748b; font-size: 0.85rem;">
            <i class="fa-solid fa-calendar-xmark" style="font-size: 2rem; color: #cbd5e1; margin-bottom: 8px; display: block;"></i>
            No se encontraron asistencias registradas para el DNI <strong>${dni}</strong>.
          </div>`;
        return;
      }

      data.forEach(item => recordsCache.set(item.id, item));

      container.innerHTML = data.map(item => `
        <div class="attendance-item-card">
          <div class="item-top">
            <div>
              <div class="item-worker-name">${item.nombre}</div>
              <div class="item-worker-dni">📅 ${item.fecha}</div>
            </div>
            <div class="item-time-badge">${item.hora}</div>
          </div>
          <div class="item-location">
            <i class="fa-solid fa-location-dot" style="color: #019DF4; margin-top: 2px;"></i>
            <span>${item.direccion || 'Ubicación Satelital GPS'}</span>
          </div>
          <div class="item-actions">
            <a href="${item.googleMapsUrl}" target="_blank" class="btn-map" style="flex: 1; justify-content: center;">
              <i class="fa-solid fa-map-location-dot"></i> Ver en Mapa
            </a>
            <button onclick="shareSingleWhatsApp('${item.id}')" class="btn-whatsapp">
              <i class="fa-brands fa-whatsapp"></i> Compartir
            </button>
          </div>
        </div>
      `).join('');

    } catch (e) {
      container.innerHTML = '<div style="color: red; text-align: center;">Error al cargar registros.</div>';
    }
  }

  // ====================================================
  // ADMIN PANEL & WHATSAPP REPORT GENERATION
  // ====================================================
  let currentAdminRecords = [];

  async function loadAdminAttendances() {
    const selectedDate = adminFilterDate.value || todayPeruIso;
    adminAttendanceList.innerHTML = '<div style="text-align: center; padding: 24px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando asistencias...</div>';

    try {
      const pin = sessionStorage.getItem('movistar_admin_pin') || ADMIN_SECRET_PIN;
      const res = await fetch(`/api/asistencias?fecha=${selectedDate}`, {
        headers: { 'x-admin-pin': pin }
      });
      if (res.status === 403) {
        sessionStorage.removeItem('movistar_admin_pin');
        showToast('🔒 PIN de administrador requerido', 'error');
        switchTab('tab-marcar');
        openPinModal();
        return;
      }
      const data = await res.json();
      currentAdminRecords = data;
      data.forEach(item => recordsCache.set(item.id, item));

      // Update Stats
      adminStatTotal.textContent = data.length;
      if (data.length > 0) {
        const sortedAsc = [...data].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        adminStatPrimera.textContent = sortedAsc[0].hora.split(' ')[0];
      } else {
        adminStatPrimera.textContent = '--:--';
      }

      if (data.length === 0) {
        adminAttendanceList.innerHTML = `
          <div class="mobile-card" style="text-align: center; color: #64748b; padding: 30px 16px;">
            <i class="fa-solid fa-clipboard-question" style="font-size: 2.2rem; color: #cbd5e1; margin-bottom: 10px; display: block;"></i>
            No hay asistencias registradas para el día <strong>${selectedDate}</strong>.
          </div>`;
        return;
      }

      adminAttendanceList.innerHTML = data.map(item => `
        <div class="attendance-item-card">
          <div class="item-top">
            <div>
              <div class="item-worker-name">${item.nombre}</div>
              <div class="item-worker-dni">DNI: ${item.dni} • ${item.cargo || 'Movistar'}</div>
            </div>
            <div class="item-time-badge">${item.hora}</div>
          </div>
          <div class="item-location">
            <i class="fa-solid fa-location-dot" style="color: #019DF4; margin-top: 2px;"></i>
            <span>${item.direccion || `GPS: ${item.lat}, ${item.lng}`}</span>
          </div>
          <div class="item-actions">
            <button onclick="shareSingleWhatsApp('${item.id}')" class="btn-whatsapp">
              <i class="fa-brands fa-whatsapp"></i> Mandar WhatsApp
            </button>
            <a href="${item.googleMapsUrl}" target="_blank" class="btn-map">
              <i class="fa-solid fa-map"></i> Mapa
            </a>
            <button onclick="deleteRecord('${item.id}')" title="Eliminar registro" style="background: #fee2e2; border: 1px solid #fecaca; color: #dc2626; border-radius: 10px; padding: 8px 10px; cursor: pointer;">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `).join('');

    } catch (e) {
      console.error(e);
      adminAttendanceList.innerHTML = '<div style="color: red; text-align: center; padding: 20px;">Error al conectar con la API</div>';
    }
  }

  // Filter change
  adminFilterDate.addEventListener('change', loadAdminAttendances);
  btnAdminRefresh.addEventListener('click', () => {
    loadAdminAttendances();
    showToast('Lista actualizada', 'info');
  });

  // Share Individual Attendance via WhatsApp
  window.shareSingleWhatsApp = (id) => {
    const record = recordsCache.get(id) || currentAdminRecords.find(r => r.id === id) || currentTodayRecord;
    if (!record) return;

    const msg = `📱 *REPORTE DE INGRESO - MOVISTAR*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Colaborador:* ${record.nombre}\n` +
      `🆔 *DNI:* ${record.dni}\n` +
      `📅 *Fecha:* ${record.fecha}\n` +
      `⏰ *Hora de Ingreso:* ${record.hora}\n` +
      `📍 *Ubicación:* ${record.direccion}\n` +
      `🧭 *Coordenadas:* ${record.lat.toFixed(5)}, ${record.lng.toFixed(5)}\n` +
      `🗺️ *Ubicación GPS:*\n${record.googleMapsUrl}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ *Asistencia registrada y validada con GPS satelital*`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  // Delete Attendance
  window.deleteRecord = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este registro de asistencia?')) return;
    try {
      const pin = sessionStorage.getItem('movistar_admin_pin') || ADMIN_SECRET_PIN;
      const res = await fetch(`/api/asistencias/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-pin': pin }
      });
      if (res.ok) {
        showToast('Registro eliminado con éxito', 'success');
        recordsCache.delete(id);
        loadAdminAttendances();
      } else {
        showToast('Error: Requiere PIN de administrador', 'error');
      }
    } catch (e) {
      showToast('Error al eliminar registro', 'error');
    }
  };

  // Generate Daily Summary formatted for WhatsApp
  function buildDailySummaryText() {
    const selectedDate = adminFilterDate.value || todayPeruIso;
    if (!currentAdminRecords || currentAdminRecords.length === 0) {
      return `📊 *REPORTE DE ASISTENCIA MOVISTAR*\n📅 *Fecha:* ${selectedDate}\n\n⚠️ No se registran asistencias para esta fecha.`;
    }

    let text = `📊 *RESUMEN DIARIO DE ASISTENCIA - MOVISTAR*\n`;
    text += `📅 *Fecha:* ${selectedDate}\n`;
    text += `👥 *Total de Marcaciones:* ${currentAdminRecords.length}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    currentAdminRecords.forEach((item, index) => {
      text += `*${index + 1}. ${item.nombre}*\n`;
      text += `   🆔 DNI: ${item.dni}\n`;
      text += `   ⏰ Hora: ${item.hora}\n`;
      text += `   📍 Lugar: ${item.direccion || 'Ubicación GPS'}\n`;
      text += `   🗺️ Mapa: ${item.googleMapsUrl}\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `✅ *Reporte generado automáticamente desde App Movistar Asistencia*`;
    return text;
  }

  // Send Daily Summary to WhatsApp
  btnAdminWhatsappAll.addEventListener('click', () => {
    const text = buildDailySummaryText();
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  });

  // Copy Summary to Clipboard
  btnAdminCopySummary.addEventListener('click', async () => {
    const text = buildDailySummaryText();
    try {
      await navigator.clipboard.writeText(text);
      showToast('📋 ¡Resumen copiado al portapapeles!', 'success');
    } catch (e) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('📋 ¡Resumen copiado!', 'success');
    }
  });

  // Admin Reset Today (For testing purposes)
  btnAdminResetToday.addEventListener('click', async () => {
    if (!confirm('¿Deseas reiniciar las marcaciones de hoy para realizar nuevas pruebas?')) return;
    try {
      const pin = sessionStorage.getItem('movistar_admin_pin') || ADMIN_SECRET_PIN;
      const res = await fetch('/api/asistencias/reset-hoy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': pin
        },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        loadAdminAttendances();
        sectionYaMarco.style.display = 'none';
        sectionFormMarcar.style.display = 'block';
      } else {
        showToast(data.error || 'No autorizado', 'error');
      }
    } catch (e) {
      showToast('Error al reiniciar', 'error');
    }
  });

});
