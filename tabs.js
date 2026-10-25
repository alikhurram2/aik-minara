/**
 * Simple two-tab switcher (Prayer Timings / Khutbah Audio), remembered via URL hash.
 */
(function () {
  'use strict';

  const buttons = document.querySelectorAll('.tab-btn');

  function show(name) {
    if (name !== 'khutbah') name = 'timings';
    buttons.forEach(function (b) {
      const on = b.dataset.tab === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on);
    });
    document.getElementById('panel-timings').hidden = name !== 'timings';
    document.getElementById('panel-khutbah').hidden = name !== 'khutbah';
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      history.replaceState(null, '', b.dataset.tab === 'khutbah' ? '#khutbah' : '#');
      show(b.dataset.tab);
    });
  });

  show(location.hash === '#khutbah' ? 'khutbah' : 'timings');
})();
