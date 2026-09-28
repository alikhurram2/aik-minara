/**
 * Aik Minara Masjid - Timetable Application Engine
 * Reads Google Sheet CSV, parses 6 Jama'at timings, calculates countdowns.
 */

(function () {
  'use strict';

  // State Management
  const state = {
    sheetId: localStorage.getItem('aik_minara_sheet_id') || MASJID_CONFIG.sheetId || '',
    sheetName: localStorage.getItem('aik_minara_sheet_name') || MASJID_CONFIG.sheetName || 'Sheet1',
    timings: {},
    lastSynced: null,
    isSyncing: false,
    syncError: null,
    isTvMode: false,
    timerInterval: null,
    syncInterval: null
  };

  // Supported prayers and metadata
  const PRAYER_KEYS = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha', 'jumuah'];
  const PRAYER_INFO = {
    fajr: { name: 'Fajr', arabic: 'الفجر', period: 'AM', isFixedAm: true },
    zuhr: { name: 'Zuhr', arabic: 'الظهر', period: 'PM', isFixedAm: false },
    asr: { name: 'Asr', arabic: 'العصر', period: 'PM', isFixedAm: false },
    maghrib: { name: 'Maghrib', arabic: 'المغرب', period: 'PM', isFixedAm: false },
    isha: { name: 'Isha', arabic: 'العشاء', period: 'PM', isFixedAm: false },
    jumuah: { name: "Jumu'ah", arabic: 'الجمعة', period: 'PM', isFixedAm: false }
  };

  // DOM Elements
  const el = {
    clock: document.getElementById('liveClock'),
    gregorianDate: document.getElementById('gregorianDate'),
    hijriDate: document.getElementById('hijriDate'),
    syncText: document.getElementById('syncText'),
    statusDot: document.getElementById('statusDot'),
    heroPrayerName: document.getElementById('heroPrayerName'),
    heroPrayerArabic: document.getElementById('heroPrayerArabic'),
    heroJamaatTime: document.getElementById('heroJamaatTime'),
    heroCountdown: document.getElementById('heroCountdown'),
    heroBadge: document.getElementById('heroBadge'),
    prayersGrid: document.getElementById('prayersGrid'),
    btnTvMode: document.getElementById('btnTvMode'),
    btnSettings: document.getElementById('btnSettings'),
    settingsModal: document.getElementById('settingsModal'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    btnCancelSettings: document.getElementById('btnCancelSettings'),
    btnSaveSettings: document.getElementById('btnSaveSettings'),
    btnTestConnection: document.getElementById('btnTestConnection'),
    inputSheetId: document.getElementById('inputSheetId'),
    inputSheetName: document.getElementById('inputSheetName'),
    testStatusMsg: document.getElementById('testStatusMsg')
  };

  /**
   * Initialize Application
   */
  function init() {
    loadCachedTimings();
    renderPrayerCards();
    setupEventListeners();
    startClock();
    
    // Initial fetch from Google Sheet
    fetchGoogleSheetTimings();

    // Setup periodic background re-sync
    const intervalMs = (MASJID_CONFIG.refreshIntervalSeconds || 60) * 1000;
    state.syncInterval = setInterval(fetchGoogleSheetTimings, intervalMs);

    // Initial countdown update
    updatePrayerCountdowns();
    state.timerInterval = setInterval(updatePrayerCountdowns, 1000);
  }

  /**
   * Load default or cached timings from localStorage
   */
  function loadCachedTimings() {
    try {
      const cached = localStorage.getItem('aik_minara_cached_timings');
      if (cached) {
        state.timings = JSON.parse(cached);
      } else {
        state.timings = JSON.parse(JSON.stringify(MASJID_CONFIG.defaultTimings));
      }
    } catch (e) {
      state.timings = JSON.parse(JSON.stringify(MASJID_CONFIG.defaultTimings));
    }
  }

  /**
   * Convert 12-hour format with AM/PM rule to 24-hour military minutes
   * Rule: Fajr = always AM. Zuhr, Asr, Maghrib, Isha, Jumu'ah = always PM.
   */
  function to24Hour(hour, minute, prayerKey) {
    let h = parseInt(hour, 10);
    const m = parseInt(minute, 10);

    if (prayerKey === 'fajr') {
      // Fajr is AM
      if (h === 12) h = 0; // 12 AM edge case
    } else {
      // Zuhr, Asr, Maghrib, Isha, Jumuah are PM
      if (h < 12) h += 12; // e.g. 1 PM -> 13, 5 PM -> 17. If already 12 PM, stays 12.
    }
    return { hour24: h, minute: m, totalMinutes: h * 60 + m };
  }

  /**
   * Format display time string: e.g. "5:15" with "AM" or "PM"
   */
  function formatDisplayTime(hour, minute, prayerKey) {
    const padMin = String(minute).padStart(2, '0');
    const period = prayerKey === 'fajr' ? 'AM' : 'PM';
    return {
      timeStr: `${hour}:${padMin}`,
      period: period,
      fullStr: `${hour}:${padMin} ${period}`
    };
  }

  /**
   * Construct Google Sheet CSV URL
   * Uses Google Visualization API CSV export endpoint (no API key required)
   */
  function getGoogleSheetCsvUrl(sheetId, sheetName) {
    // If the user pasted the entire sheet URL instead of just the ID, extract the ID
    let cleanId = sheetId.trim();
    const idMatch = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (idMatch) {
      cleanId = idMatch[1];
    }
    
    const encodedSheetName = encodeURIComponent(sheetName || 'Sheet1');
    const cacheBuster = Date.now();
    return `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv&sheet=${encodedSheetName}&t=${cacheBuster}`;
  }

  /**
   * Fetch and parse timings from Google Sheet
   */
  async function fetchGoogleSheetTimings() {
    if (!state.sheetId) {
      updateSyncStatus('demo', 'Using default timetable (Click "Setup Sheet" to connect)');
      return;
    }

    state.isSyncing = true;
    updateSyncStatus('syncing', 'Syncing with Google Sheet...');

    try {
      const url = getGoogleSheetCsvUrl(state.sheetId, state.sheetName);
      const res = await fetch(url, { cache: 'no-store' });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: Sheet may not be public ("Anyone with link can view").`);
      }

      const csvText = await res.text();
      const parsedTimings = parseTimetableCsv(csvText);

      if (Object.keys(parsedTimings).length >= 5) {
        state.timings = parsedTimings;
        state.lastSynced = new Date();
        state.syncError = null;
        localStorage.setItem('aik_minara_cached_timings', JSON.stringify(parsedTimings));
        updateSyncStatus('live', `Updated: ${state.lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        renderPrayerCards();
        updatePrayerCountdowns();
      } else {
        throw new Error('Could not find all 6 prayer rows in Google Sheet.');
      }
    } catch (err) {
      console.warn('Google Sheet fetch error:', err);
      state.syncError = err.message;
      updateSyncStatus('error', `Offline (${err.message.slice(0, 30)}...)`);
    } finally {
      state.isSyncing = false;
    }
  }

  /**
   * Parse CSV content from Google Sheet
   * Expected columns:
   * Col 1: Prayer Name (Fajr, Zuhr, Asr, Maghrib, Isha, Jumuah)
   * Col 2: Hour (1-12)
   * Col 3: Minute (0-59)
   */
  function parseTimetableCsv(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    const timings = {};

    for (const line of lines) {
      // Split CSV respecting quotes
      const cols = line.split(',').map(col => col.replace(/^["']|["']$/g, '').trim());
      if (cols.length < 3) continue;

      const rawName = cols[0].toLowerCase().replace(/[^a-z]/g, '');
      const rawHour = parseInt(cols[1], 10);
      const rawMinute = parseInt(cols[2], 10);

      if (isNaN(rawHour) || isNaN(rawMinute)) continue;

      // Identify prayer key
      let key = null;
      if (rawName.includes('fajr')) key = 'fajr';
      else if (rawName.includes('zuhr') || rawName.includes('dhuhr') || rawName.includes('duhr')) key = 'zuhr';
      else if (rawName.includes('asr') || rawName.includes('asar')) key = 'asr';
      else if (rawName.includes('maghrib') || rawName.includes('magrib')) key = 'maghrib';
      else if (rawName.includes('isha') || rawName.includes('esha')) key = 'isha';
      else if (rawName.includes('jumu') || rawName.includes('juma')) key = 'jumuah';

      if (key && rawHour >= 1 && rawHour <= 12 && rawMinute >= 0 && rawMinute <= 59) {
        timings[key] = {
          hour: rawHour,
          minute: rawMinute,
          name: PRAYER_INFO[key].name,
          arabic: PRAYER_INFO[key].arabic
        };
      }
    }

    // Fallback missing keys to default if any were missing
    for (const key of PRAYER_KEYS) {
      if (!timings[key] && MASJID_CONFIG.defaultTimings[key]) {
        timings[key] = MASJID_CONFIG.defaultTimings[key];
      }
    }

    return timings;
  }

  /**
   * Update the status pill in the top bar
   */
  function updateSyncStatus(status, text) {
    el.statusDot.className = 'status-dot';
    if (status === 'syncing') {
      el.statusDot.classList.add('syncing');
    } else if (status === 'error') {
      el.statusDot.classList.add('error');
    }
    el.syncText.textContent = text;
  }

  /**
   * Render the 6 Prayer Cards
   */
  function renderPrayerCards() {
    el.prayersGrid.innerHTML = '';

    PRAYER_KEYS.forEach(key => {
      const info = PRAYER_INFO[key];
      const data = state.timings[key] || MASJID_CONFIG.defaultTimings[key];
      const formatted = formatDisplayTime(data.hour, data.minute, key);

      const card = document.createElement('div');
      card.className = `prayer-card ${key === 'jumuah' ? 'is-jumuah' : ''}`;
      card.id = `card-${key}`;

      card.innerHTML = `
        <div class="prayer-meta">
          <div class="card-top-row">
            <span class="prayer-name">${info.name}</span>
            <span class="prayer-arabic">${info.arabic}</span>
            <span class="next-pill">NEXT</span>
          </div>
          <span class="prayer-label">Jama'at Timing</span>
        </div>
        <div class="card-time-area">
          <div class="jamaat-time">
            ${formatted.timeStr}
            <span class="jamaat-period">${formatted.period}</span>
          </div>
          <div class="countdown-subtext" id="subtext-${key}">--</div>
        </div>
      `;

      el.prayersGrid.appendChild(card);
    });
  }

  /**
   * Find Next Prayer and update countdowns
   */
  function updatePrayerCountdowns() {
    const now = new Date();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
    const currentSeconds = now.getSeconds();
    const isFriday = now.getDay() === 5; // 5 = Friday

    let nextPrayerKey = null;
    let minDiffMinutes = Infinity;

    // Determine relevant prayers for today's sequence
    // On Friday, Jumu'ah replaces Zuhr for the congregational prayer slot
    const activePrayerList = isFriday 
      ? ['fajr', 'jumuah', 'asr', 'maghrib', 'isha']
      : ['fajr', 'zuhr', 'asr', 'maghrib', 'isha'];

    // Check upcoming prayers for today
    for (const key of activePrayerList) {
      const data = state.timings[key];
      if (!data) continue;

      const p24 = to24Hour(data.hour, data.minute, key);
      const diffMinutes = p24.totalMinutes - currentTotalMinutes;

      // Prayer is in the future today
      if (diffMinutes > 0 || (diffMinutes === 0 && currentSeconds < 59)) {
        if (diffMinutes < minDiffMinutes) {
          minDiffMinutes = diffMinutes;
          nextPrayerKey = key;
        }
      }
    }

    let isTomorrow = false;
    // If all prayers today have passed, next prayer is tomorrow's Fajr
    if (!nextPrayerKey) {
      nextPrayerKey = 'fajr';
      isTomorrow = true;
      const fajrData = state.timings['fajr'];
      const fajr24 = to24Hour(fajrData.hour, fajrData.minute, 'fajr');
      // Minutes remaining in today (1440 - current) + Fajr minutes tomorrow
      minDiffMinutes = (1440 - currentTotalMinutes) + fajr24.totalMinutes;
    }

    // Calculate exact countdown seconds
    const totalRemainingSeconds = (minDiffMinutes * 60) - currentSeconds;
    const hoursRemaining = Math.floor(totalRemainingSeconds / 3600);
    const minsRemaining = Math.floor((totalRemainingSeconds % 3600) / 60);
    const secsRemaining = totalRemainingSeconds % 60;

    let countdownStr = '';
    if (hoursRemaining > 0) {
      countdownStr = `Starts in ${hoursRemaining}h ${minsRemaining}m ${secsRemaining}s`;
    } else if (minsRemaining > 0) {
      countdownStr = `Starts in ${minsRemaining}m ${secsRemaining}s`;
    } else {
      countdownStr = `Starts in ${secsRemaining}s`;
    }

    if (isTomorrow) {
      countdownStr = `Tomorrow at ${state.timings.fajr.hour}:${String(state.timings.fajr.minute).padStart(2, '0')} AM (${countdownStr})`;
    }

    // Update Hero Banner
    const nextInfo = PRAYER_INFO[nextPrayerKey];
    const nextData = state.timings[nextPrayerKey];
    const nextFormatted = formatDisplayTime(nextData.hour, nextData.minute, nextPrayerKey);

    el.heroPrayerName.textContent = nextInfo.name;
    el.heroPrayerArabic.textContent = nextInfo.arabic;
    el.heroJamaatTime.textContent = nextFormatted.fullStr;
    el.heroCountdown.textContent = countdownStr;
    el.heroBadge.innerHTML = `<span class="hero-badge-pulse"></span> Next Jama'at ${isTomorrow ? '(Tomorrow)' : ''}`;

    // Highlight the active card and update card subtexts
    PRAYER_KEYS.forEach(key => {
      const card = document.getElementById(`card-${key}`);
      const subtext = document.getElementById(`subtext-${key}`);
      if (!card || !subtext) return;

      if (key === nextPrayerKey) {
        card.classList.add('is-next');
        subtext.textContent = countdownStr;
        subtext.style.color = 'var(--gold-primary)';
      } else {
        card.classList.remove('is-next');
        const pData = state.timings[key];
        const p24 = to24Hour(pData.hour, pData.minute, key);
        if (p24.totalMinutes < currentTotalMinutes) {
          subtext.textContent = 'Completed today';
          subtext.style.color = 'var(--text-muted)';
        } else {
          subtext.textContent = 'Upcoming';
          subtext.style.color = 'var(--text-secondary)';
        }
      }
    });
  }

  /**
   * Start Live Clock and Dates
   */
  function startClock() {
    function tick() {
      const now = new Date();
      
      // Live 12-hour clock with seconds
      el.clock.textContent = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      // Gregorian Date: e.g. "Monday, September 28, 2026"
      el.gregorianDate.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Islamic (Hijri) Date using Intl API
      try {
        const hijriFormatter = new Intl.DateTimeFormat('en-TN-u-ca-islamic-umalqura', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        el.hijriDate.textContent = `${hijriFormatter.format(now)} AH`;
      } catch (e) {
        el.hijriDate.textContent = 'Islamic Calendar';
      }
    }

    tick();
    setInterval(tick, 1000);
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    // TV Mode Toggle
    el.btnTvMode.addEventListener('click', toggleTvMode);

    // Settings Modal
    el.btnSettings.addEventListener('click', openSettingsModal);
    el.btnCloseModal.addEventListener('click', closeSettingsModal);
    el.btnCancelSettings.addEventListener('click', closeSettingsModal);
    el.btnSaveSettings.addEventListener('click', saveSettings);
    el.btnTestConnection.addEventListener('click', testSheetConnection);

    // Close modal on click outside
    el.settingsModal.addEventListener('click', (e) => {
      if (e.target === el.settingsModal) closeSettingsModal();
    });

    // Keyboard shortcuts: 'F' for Fullscreen/TV mode, 'ESC' to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && el.settingsModal.classList.contains('active')) {
        closeSettingsModal();
      }
    });
  }

  /**
   * Toggle TV / Kiosk Display Mode
   */
  function toggleTvMode() {
    state.isTvMode = !state.isTvMode;
    document.body.classList.toggle('tv-mode', state.isTvMode);

    if (state.isTvMode) {
      el.btnTvMode.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
        Exit TV
      `;
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      el.btnTvMode.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>
        TV Display
      `;
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  /**
   * Open Settings Modal
   */
  function openSettingsModal() {
    el.inputSheetId.value = state.sheetId;
    el.inputSheetName.value = state.sheetName;
    el.testStatusMsg.textContent = '';
    el.settingsModal.classList.add('active');
  }

  /**
   * Close Settings Modal
   */
  function closeSettingsModal() {
    el.settingsModal.classList.remove('active');
  }

  /**
   * Save Settings
   */
  function saveSettings() {
    let newSheetId = el.inputSheetId.value.trim();
    // Extract ID if full URL was pasted
    const idMatch = newSheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (idMatch) {
      newSheetId = idMatch[1];
    }

    const newSheetName = el.inputSheetName.value.trim() || 'Sheet1';

    state.sheetId = newSheetId;
    state.sheetName = newSheetName;

    localStorage.setItem('aik_minara_sheet_id', newSheetId);
    localStorage.setItem('aik_minara_sheet_name', newSheetName);

    closeSettingsModal();
    fetchGoogleSheetTimings();
  }

  /**
   * Test Google Sheet Connection inside Settings Modal
   */
  async function testSheetConnection() {
    let testId = el.inputSheetId.value.trim();
    const idMatch = testId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (idMatch) {
      testId = idMatch[1];
    }
    const testName = el.inputSheetName.value.trim() || 'Sheet1';

    if (!testId) {
      el.testStatusMsg.innerHTML = '<span style="color: #ef4444;">Please enter a Google Sheet ID or URL.</span>';
      return;
    }

    el.testStatusMsg.innerHTML = '<span style="color: var(--gold-primary);">Testing connection...</span>';

    try {
      const url = getGoogleSheetCsvUrl(testId, testName);
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Cannot reach sheet (HTTP ${res.status}). Make sure Sharing is set to "Anyone with the link can view".`);
      }
      const csv = await res.text();
      const parsed = parseTimetableCsv(csv);
      const count = Object.keys(parsed).length;

      if (count >= 5) {
        el.testStatusMsg.innerHTML = `<span style="color: #10b981;">✓ Success! Found ${count} prayer timings correctly.</span>`;
      } else {
        el.testStatusMsg.innerHTML = `<span style="color: #f59e0b;">Connected, but only found ${count} prayers. Check column names (Prayer, Hour, Minute).</span>`;
      }
    } catch (err) {
      el.testStatusMsg.innerHTML = `<span style="color: #ef4444;">Error: ${err.message}</span>`;
    }
  }

  // Initialize on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
