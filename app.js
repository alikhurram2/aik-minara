/**
 * Aik Minara Masjid - Clean Vertical Timings Application
 */

(function () {
  'use strict';

  // State
  const state = {
    sheetId: MASJID_CONFIG.sheetId || '',
    sheetName: MASJID_CONFIG.sheetName || 'Sheet1',
    timings: {},
    isSyncing: false
  };

  const PRAYER_KEYS = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha', 'jumuah'];
  const PRAYER_INFO = {
    fajr: { name: 'Fajr', arabic: 'الفجر', period: 'AM' },
    zuhr: { name: 'Zuhr', arabic: 'الظهر', period: 'PM' },
    asr: { name: 'Asr', arabic: 'العصر', period: 'PM' },
    maghrib: { name: 'Maghrib', arabic: 'المغرب', period: 'PM' },
    isha: { name: 'Isha', arabic: 'العشاء', period: 'PM' },
    jumuah: { name: "Jumu'ah", arabic: 'الجمعة', period: 'PM' }
  };

  // DOM Elements
  const el = {
    clock: document.getElementById('liveClock'),
    gregorianDate: document.getElementById('gregorianDate'),
    hijriDate: document.getElementById('hijriDate'),
    syncText: document.getElementById('syncText'),
    statusDot: document.getElementById('statusDot'),
    prayersList: document.getElementById('prayersList')
  };

  /**
   * Initialize
   */
  function init() {
    loadCachedTimings();
    renderPrayerList();
    startClock();
    
    // Fetch from Google Sheet
    fetchGoogleSheetTimings();

    // Auto-sync every 60s
    const intervalMs = (MASJID_CONFIG.refreshIntervalSeconds || 60) * 1000;
    setInterval(fetchGoogleSheetTimings, intervalMs);
  }

  /**
   * Load default or cached timings
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
   * Format display time: "5:15" and "AM" / "PM"
   */
  function formatDisplayTime(hour, minute, prayerKey) {
    const padMin = String(minute).padStart(2, '0');
    const period = prayerKey === 'fajr' ? 'AM' : 'PM';
    return {
      timeStr: `${hour}:${padMin}`,
      period: period
    };
  }

  /**
   * Google Sheet CSV URL
   */
  function getGoogleSheetCsvUrl(sheetId, sheetName) {
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
   * Fetch from Google Sheet
   */
  async function fetchGoogleSheetTimings() {
    if (!state.sheetId) {
      updateSyncStatus('live', 'Timings Active');
      return;
    }

    state.isSyncing = true;
    updateSyncStatus('syncing', 'Syncing...');

    try {
      const url = getGoogleSheetCsvUrl(state.sheetId, state.sheetName);
      const res = await fetch(url, { cache: 'no-store' });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const csvText = await res.text();
      const parsedTimings = parseTimetableCsv(csvText);

      if (Object.keys(parsedTimings).length >= 5) {
        state.timings = parsedTimings;
        localStorage.setItem('aik_minara_cached_timings', JSON.stringify(parsedTimings));
        updateSyncStatus('live', 'Live');
        renderPrayerList();
      }
    } catch (err) {
      console.warn('Google Sheet fetch:', err);
      updateSyncStatus('error', 'Offline');
    } finally {
      state.isSyncing = false;
    }
  }

  /**
   * Parse CSV content
   * Col 1: Prayer, Col 2: Hour, Col 3: Minute
   */
  function parseTimetableCsv(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    const timings = {};

    for (const line of lines) {
      const cols = line.split(',').map(col => col.replace(/^["']|["']$/g, '').trim());
      if (cols.length < 3) continue;

      const rawName = cols[0].toLowerCase().replace(/[^a-z]/g, '');
      const rawHour = parseInt(cols[1], 10);
      const rawMinute = parseInt(cols[2], 10);

      if (isNaN(rawHour) || isNaN(rawMinute)) continue;

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

    for (const key of PRAYER_KEYS) {
      if (!timings[key] && MASJID_CONFIG.defaultTimings[key]) {
        timings[key] = MASJID_CONFIG.defaultTimings[key];
      }
    }

    return timings;
  }

  /**
   * Update sync indicator
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
   * Render Vertical 6 Prayer Boxes
   */
  function renderPrayerList() {
    el.prayersList.innerHTML = '';

    PRAYER_KEYS.forEach(key => {
      const info = PRAYER_INFO[key];
      const data = state.timings[key] || MASJID_CONFIG.defaultTimings[key];
      const formatted = formatDisplayTime(data.hour, data.minute, key);

      const box = document.createElement('div');
      box.className = `prayer-box ${key === 'jumuah' ? 'is-jumuah' : ''}`;

      box.innerHTML = `
        <div class="prayer-box-left">
          <span class="prayer-box-name">${info.name}</span>
          <span class="prayer-box-arabic">${info.arabic}</span>
        </div>
        <div class="prayer-box-right">
          <span class="prayer-box-time">${formatted.timeStr}</span>
          <span class="prayer-box-period">${formatted.period}</span>
        </div>
      `;

      el.prayersList.appendChild(box);
    });
  }

  /**
   * Live Clock & Calendar Dates
   */
  function startClock() {
    function tick() {
      const now = new Date();
      
      el.clock.textContent = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      el.gregorianDate.textContent = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });

      try {
        const hijriFormatter = new Intl.DateTimeFormat('en-TN-u-ca-islamic-umalqura', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        el.hijriDate.textContent = hijriFormatter.format(now);
      } catch (e) {
        el.hijriDate.textContent = '';
      }
    }

    tick();
    setInterval(tick, 1000);
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
