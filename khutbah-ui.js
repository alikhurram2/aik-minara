/**
 * Renders the khutbah recordings list. Only one recording plays at a time.
 */
(function () {
  'use strict';

  const list = document.getElementById('khutbahList');
  if (!list || typeof KHUTBAH_LIST === 'undefined') return;

  function formatDate(iso) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  KHUTBAH_LIST.forEach(function (k) {
    const card = document.createElement('article');
    card.className = 'khutbah-card';

    const date = document.createElement('div');
    date.className = 'khutbah-date';
    date.textContent = formatDate(k.date) + (k.title ? ' · ' + k.title : '');

    const speaker = document.createElement('div');
    speaker.className = 'khutbah-speaker';
    speaker.textContent = k.speaker + (k.duration ? ' · ' + k.duration : '');

    const audio = document.createElement('audio');
    audio.controls = true;
    audio.preload = 'none';
    audio.src = k.file;

    const dl = document.createElement('a');
    dl.className = 'khutbah-download';
    dl.href = k.file;
    dl.download = '';
    dl.textContent = 'Download';

    audio.addEventListener('play', function () {
      list.querySelectorAll('audio').forEach(function (a) {
        if (a !== audio) a.pause();
      });
    });

    card.append(date, speaker, audio, dl);
    list.appendChild(card);
  });
})();
