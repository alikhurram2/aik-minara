/**
 * Aik Minara Masjid - Configuration File
 * 
 * Replace 'sheetId' with your own Google Sheet ID.
 * To get your Sheet ID:
 * When you open your Google Sheet, the URL looks like:
 * https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * The long string of letters and numbers between /d/ and /edit is your Sheet ID.
 */

const MASJID_CONFIG = {
  // Masjid Name & Subtitle
  masjidName: "Aik Minara Masjid",
  tagline: "Daily Congregational Prayer Timings",
  location: "Lahore, Pakistan",

  // Google Sheet Configuration
  // Make sure your Google Sheet is shared with "Anyone with the link can view"
  // You can set this to your Sheet ID once created. A demo sheet ID or local storage is used by default.
  sheetId: "1CDIU-Nr81-bXgrtV8koX4hD-IfqYtkPWyUKpG0--Y0o",

  // Sheet tab/gid name (default is first sheet: "Sheet1" or gid=0)
  sheetName: "Sheet1",

  // Refresh interval in seconds (auto-updates the timings in background)
  refreshIntervalSeconds: 60,

  // Fallback / Initial default timings (used if offline or while sheet is loading)
  // Format: Hour (1-12), Minute (0-59). AM/PM is fixed (Fajr = AM, all others = PM)
  defaultTimings: {
    fajr: { hour: 5, minute: 30, name: "Fajr", arabic: "الفجر" },
    zuhr: { hour: 1, minute: 15, name: "Zuhr", arabic: "الظهر" },
    asr: { hour: 4, minute: 15, name: "Asr", arabic: "العصر" },
    maghrib: { hour: 6, minute: 25, name: "Maghrib", arabic: "المغرب" },
    isha: { hour: 8, minute: 45, name: "Isha", arabic: "العشاء" },
    jumuah: { hour: 1, minute: 15, name: "Jumu'ah", arabic: "الجمعة" }
  }
};

window.MASJID_CONFIG = MASJID_CONFIG;
