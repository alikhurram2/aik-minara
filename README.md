# Aik Minara Masjid - Prayer Timings Website

A responsive website displaying live congregational (Jama'at) prayer timings for **Aik Minara Masjid**, synchronized with a Google Sheet updated by the administration.

---

## 1. How the Google Sheet Works (Mistake-Proof Setup)

To ensure the admin **cannot make any mistakes**, the sheet uses 3 columns and 6 rows with restricted dropdowns:

| Row | Prayer (Col A) | Hour (Col B) | Minute (Col C) | Resulting Jama'at Time |
| :---: | :---: | :---: | :---: | :---: |
| 1 | **Fajr** | 5 | 15 | **5:15 AM** |
| 2 | **Zuhr** | 1 | 30 | **1:30 PM** |
| 3 | **Asr** | 5 | 00 | **5:00 PM** |
| 4 | **Maghrib** | 6 | 40 | **6:40 PM** |
| 5 | **Isha** | 8 | 15 | **8:15 PM** |
| 6 | **Jumu'ah** | 1 | 30 | **1:30 PM** |

### Built-in Logic:
- **AM / PM is not needed**:
  - `Fajr` is **always AM**.
  - `Zuhr`, `Asr`, `Maghrib`, `Isha`, and `Jumu'ah` are **always PM**.
- Admin only selects numbers from dropdowns.

---

## 2. Step-by-Step Instructions to Create the Sheet

### Step 1: Create a New Google Sheet
1. Go to [sheets.new](https://sheets.new) in your browser.
2. Rename the document to: `Aik Minara Masjid - Jamaat Timetable`.
3. In row 1, enter headers:
   - Cell A1: `Prayer`
   - Cell B1: `Hour`
   - Cell C1: `Minute`
4. In rows 2 to 7, enter the 6 prayer names in Column A:
   - A2: `Fajr`
   - A3: `Zuhr`
   - A4: `Asr`
   - A5: `Maghrib`
   - A6: `Isha`
   - A7: `Jumu'ah`

### Step 2: Make It Mistake-Proof with Data Validation (Dropdowns)
To prevent typos, enforce dropdowns:

1. **For Column B (Hour)**:
   - Highlight cells `B2:B7`.
   - Click **Data** $\rightarrow$ **Data validation** $\rightarrow$ **Add rule**.
   - Under *Criteria*, choose **Dropdown**.
   - Add values: `1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12`.
   - Click **Done**.
2. **For Column C (Minute)**:
   - Highlight cells `C2:C7`.
   - Click **Data** $\rightarrow$ **Data validation** $\rightarrow$ **Add rule**.
   - Under *Criteria*, choose **Dropdown**.
   - Add common minutes (e.g., `00, 05, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55`) or select *Number between 0 and 59*.
   - Click **Done**.

### Step 3: Lock Column A & Row 1 (Protect Sheets and Ranges)
1. Select Column A and Row 1.
2. Click **Data** $\rightarrow$ **Protect sheets and ranges**.
3. Set permissions so only you (the owner) can edit the prayer names.
4. The admin can **only** touch the Hour and Minute dropdowns!

### Step 4: Share the Sheet
1. Click the green **Share** button in the top right.
2. Under *General access*, change from *Restricted* to:
   **"Anyone with the link can view"** (Viewer).
3. Copy the link.

---

## 3. Connecting to the Website

You have two easy ways to connect your Google Sheet:

### Method A: Directly from the Website (No code required)
1. Open the website in your browser.
2. Click the **"Sheet Settings"** button in the top right.
3. Paste your Google Sheet URL or ID.
4. Click **Test Connection** to confirm $\rightarrow$ then click **Save & Sync**.

### Method B: In `config.js`
Open `config.js` and paste your Sheet ID:
```javascript
const MASJID_CONFIG = {
  masjidName: "Aik Minara Masjid",
  sheetId: "YOUR_GOOGLE_SHEET_ID_HERE",
  refreshIntervalSeconds: 60
};
```

---

## 4. Features Included

- **Auto-Sync**: Checks Google Sheet every 60 seconds silently in the background.
- **Active / Next Prayer Highlight**: Automatically detects current time and displays a live countdown banner to the next upcoming prayer.
- **Friday / Jumu'ah Detection**: On Fridays, Jumu'ah is highlighted alongside the daily prayers.
- **Live Clock & Calendars**: Displays live digital clock, Gregorian date, and Umm al-Qura Islamic (Hijri) date.
- **Mosque TV Mode**: Click **"TV Display"** to launch high-contrast, large-font full-screen mode for mounting on a Smart TV in the masjid prayer hall.
- **Offline / Cached Fallback**: If the internet disconnects or Google Sheet is temporarily unreachable, the website continues to show the last saved timings seamlessly.

---

## 5. Free Hosting Options

You can host this website for free with zero maintenance on:
- **GitHub Pages**: Push this folder to a GitHub repository, go to Settings $\rightarrow$ Pages, and enable GitHub Pages.
- **Cloudflare Pages / Vercel / Netlify**: Drag-and-drop the folder or link your repository for instant global hosting.
