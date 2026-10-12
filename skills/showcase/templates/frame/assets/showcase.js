/*
 * Showcase page logic: the icon sprite, color swatches, the tokens' actual values, the contrast
 * calculation and a few live samples (tabs, switch, password reveal, toasts, the modal, motion replay).
 * Values are read from tokens.css in the browser, so the pages cannot drift from the tokens, and
 * they are read again when the theme changes (nav.js fires `themechange`).
 */
(function () {
  /* ── Icons: 16px-grid stroke icons. The app will take its set from a library (lucide is the
     candidate); these are drawn in the same style so the samples look right. ── */

  var SPRITE =
    '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">' +
    '<symbol id="i-check-circle" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/><path d="M5.5 8.25l1.75 1.75 3.25-3.75"/></symbol>' +
    '<symbol id="i-warn" viewBox="0 0 16 16"><path d="M8 2.5l6 10.5H2z"/><path d="M8 7v3"/><path d="M8 11.75v.01"/></symbol>' +
    '<symbol id="i-x-circle" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/><path d="M6 6l4 4M10 6l-4 4"/></symbol>' +
    '<symbol id="i-info" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/><path d="M8 7.5v3.5"/><path d="M8 5.25v.01"/></symbol>' +
    '<symbol id="i-clock" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.25 1.5"/></symbol>' +
    '<symbol id="i-pencil" viewBox="0 0 16 16"><path d="M11 2.5l2.5 2.5L5 13.5H2.5V11z"/><path d="M9.5 4l2.5 2.5"/></symbol>' +
    '<symbol id="i-undo" viewBox="0 0 16 16"><path d="M6 4L3 7l3 3"/><path d="M3 7h6.5a3.5 3.5 0 010 7H8"/></symbol>' +
    '<symbol id="i-check" viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7"/></symbol>' +
    '<symbol id="i-x" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8"/></symbol>' +
    '<symbol id="i-plus" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10"/></symbol>' +
    '<symbol id="i-search" viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></symbol>' +
    '<symbol id="i-chevron-down" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4"/></symbol>' +
    '<symbol id="i-chevron-left" viewBox="0 0 16 16"><path d="M10 4l-4 4 4 4"/></symbol>' +
    '<symbol id="i-chevron-right" viewBox="0 0 16 16"><path d="M6 4l4 4-4 4"/></symbol>' +
    '<symbol id="i-arrow-down" viewBox="0 0 16 16"><path d="M8 3v10M4 9l4 4 4-4"/></symbol>' +
    '<symbol id="i-arrow-up" viewBox="0 0 16 16"><path d="M8 13V3M4 7l4-4 4 4"/></symbol>' +
    '<symbol id="i-upload" viewBox="0 0 16 16"><path d="M8 10V3M5 6l3-3 3 3"/><path d="M2.5 10.5v2a1 1 0 001 1h9a1 1 0 001-1v-2"/></symbol>' +
    '<symbol id="i-download" viewBox="0 0 16 16"><path d="M8 3v7M5 7l3 3 3-3"/><path d="M2.5 10.5v2a1 1 0 001 1h9a1 1 0 001-1v-2"/></symbol>' +
    '<symbol id="i-bell" viewBox="0 0 16 16"><path d="M4 11V7.5a4 4 0 018 0V11l1 1.5H3z"/><path d="M6.5 14a1.5 1.5 0 003 0"/></symbol>' +
    '<symbol id="i-globe" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12"/></symbol>' +
    '<symbol id="i-sun" viewBox="0 0 16 16"><circle cx="8" cy="8" r="3"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/></symbol>' +
    '<symbol id="i-moon" viewBox="0 0 16 16"><path d="M13.5 9.5A5.5 5.5 0 016.5 2.5a5.5 5.5 0 107 7z"/></symbol>' +
    '<symbol id="i-monitor" viewBox="0 0 16 16"><rect x="2" y="3" width="12" height="8" rx="1.5"/><path d="M6 13.5h4M8 11v2.5"/></symbol>' +
    '<symbol id="i-user" viewBox="0 0 16 16"><circle cx="8" cy="5.5" r="2.75"/><path d="M2.75 13.5c.5-2.5 2.5-3.75 5.25-3.75s4.75 1.25 5.25 3.75"/></symbol>' +
    '<symbol id="i-logout" viewBox="0 0 16 16"><path d="M6.5 2.5h-3a1 1 0 00-1 1v9a1 1 0 001 1h3"/><path d="M10 11l3-3-3-3M13 8H6"/></symbol>' +
    '<symbol id="i-settings" viewBox="0 0 16 16"><circle cx="8" cy="8" r="2"/><path d="M8 1.75l1.2 1.5 1.9-.4.5 1.9 1.8.8-.6 1.8 1.2 1.5-1.5 1.2.1 1.9-1.9.4-.8 1.8-1.9-.5L8 14.25l-1.2-1.5-1.9.5-.8-1.8-1.9-.4.1-1.9L1 7.75l1.2-1.5-.6-1.8 1.8-.8.5-1.9 1.9.4z"/></symbol>' +
    '<symbol id="i-home" viewBox="0 0 16 16"><path d="M2.5 7.5L8 2.5l5.5 5v6h-4v-4h-3v4h-4z"/></symbol>' +
    '<symbol id="i-database" viewBox="0 0 16 16"><ellipse cx="8" cy="4" rx="5.5" ry="2"/><path d="M2.5 4v8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2V4M2.5 8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2"/></symbol>' +
    '<symbol id="i-flame" viewBox="0 0 16 16"><path d="M8 1.5c.5 2.5 3 3.5 3 7a3 3 0 11-6 0c0-1 .5-2 1-2.5.3 1 .8 1.5 1.5 1.5.5-2 .5-4 .5-6z"/></symbol>' +
    '<symbol id="i-leaf" viewBox="0 0 16 16"><path d="M13.5 2.5c-6 0-10 3-10 8 0 1 .2 2 .5 3 3-4 6-6 9-7-3 1.5-6 4-8 8 7 0 10-4.5 8.5-12z"/></symbol>' +
    '<symbol id="i-target" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3.5"/><circle cx="8" cy="8" r="1"/></symbol>' +
    '<symbol id="i-file" viewBox="0 0 16 16"><path d="M9 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5.5z"/><path d="M9 1.5v4h4"/></symbol>' +
    '<symbol id="i-list-check" viewBox="0 0 16 16"><path d="M7 4h7M7 8h7M7 12h7"/><path d="M2 4l1 1 1.5-2M2 8l1 1 1.5-2M2 12l1 1 1.5-2"/></symbol>' +
    '<symbol id="i-truck" viewBox="0 0 16 16"><path d="M1.5 3.5h8v7h-8zM9.5 6h3l2 2.5v2h-5z"/><circle cx="4.5" cy="12" r="1.5"/><circle cx="11.5" cy="12" r="1.5"/></symbol>' +
    '<symbol id="i-building" viewBox="0 0 16 16"><rect x="3.5" y="2.5" width="9" height="11" rx="1"/><path d="M6 5.5h1M9 5.5h1M6 8h1M9 8h1M7 13.5v-2.5h2v2.5"/></symbol>' +
    '<symbol id="i-chart" viewBox="0 0 16 16"><path d="M2.5 13.5h11"/><path d="M4 11V7M7.5 11V4M11 11V8.5"/></symbol>' +
    '<symbol id="i-inbox" viewBox="0 0 16 16"><path d="M2.5 9h3l1 1.5h3L10.5 9h3"/><path d="M2.5 9V4.5a1 1 0 011-1h9a1 1 0 011 1V9v3a1 1 0 01-1 1h-9a1 1 0 01-1-1z"/></symbol>' +
    '<symbol id="i-dots" viewBox="0 0 16 16"><circle cx="3.5" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="12.5" cy="8" r="1"/></symbol>' +
    '<symbol id="i-menu" viewBox="0 0 16 16"><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/></symbol>' +
    '<symbol id="i-eye" viewBox="0 0 16 16"><path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></symbol>' +
    '<symbol id="i-lock" viewBox="0 0 16 16"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5"/><path d="M5.5 7V5.5a2.5 2.5 0 015 0V7"/></symbol>' +
    '<symbol id="i-link" viewBox="0 0 16 16"><path d="M6.5 9.5l3-3"/><path d="M7 4.5l1-1a2.5 2.5 0 013.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 014.5 9l1-1"/></symbol>' +
    '<symbol id="i-sparkles" viewBox="0 0 16 16"><path d="M8 2l1.2 3.3L12.5 6.5 9.2 7.7 8 11 6.8 7.7 3.5 6.5l3.3-1.2z"/><path d="M12.5 11l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z"/></symbol>' +
    '</svg>';

  document.body.insertAdjacentHTML('afterbegin', SPRITE);

  /* ── Reading a token's color ── */

  var probe = document.createElement('span');
  probe.style.display = 'none';
  document.body.appendChild(probe);

  // A token written as oklch(), lab(), color-mix() or color(display-p3 …) computes to that form, not
  // to rgb(): a 1 × 1 canvas turns any CSS color into its sRGB pixel
  var pixel = document.createElement('canvas').getContext('2d', { willReadFrequently: true });

  function resolveColor(token) {
    probe.style.color = '';
    probe.style.color = 'var(' + token + ')';
    var text = getComputedStyle(probe).color;
    return parseColor(text) || paint(text);
  }

  function parseColor(text) {
    var match = text.match(/^rgba?\(([^)]+)\)/);
    if (!match) return null;
    var parts = match[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
    return { r: parts[0], g: parts[1], b: parts[2] };
  }

  function paint(text) {
    if (!pixel) return null;
    pixel.clearRect(0, 0, 1, 1);
    pixel.fillStyle = 'transparent';
    pixel.fillStyle = text;
    pixel.fillRect(0, 0, 1, 1);
    var data = pixel.getImageData(0, 0, 1, 1).data;
    return data[3] === 0 ? null : { r: data[0], g: data[1], b: data[2] };
  }

  /* ── Words of the frame carry an i18n key, so they follow the language switch. i18n.js loads after
     this file (deferred) and translates them when it starts; a word written later is translated on
     the spot. A text the page gives in an attribute translates through a key beside it
     (data-use-key, data-label-key, data-toast-title-key, data-toast-text-key). ── */

  function say(node, key, text) {
    node.setAttribute('data-i18n', key);
    node.removeAttribute('data-i18n-default');
    node.removeAttribute('data-i18n-rich');
    node.textContent = text;
    if (window.showcaseI18n && node.parentNode) window.showcaseI18n.apply(window.showcaseI18n.current(), node.parentNode);
    return node;
  }

  // For an attribute, or a text made only once: the word in the language on show
  function word(key, text) {
    var translated = key && window.showcaseI18n ? window.showcaseI18n.text(key) : null;
    return translated || text;
  }

  function toHex(color) {
    if (!color) return '';
    return '#' + [color.r, color.g, color.b].map(function (channel) {
      return Math.round(channel).toString(16).padStart(2, '0');
    }).join('').toUpperCase();
  }

  function luminance(color) {
    var channels = [color.r, color.g, color.b].map(function (channel) {
      var c = channel / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function contrast(a, b) {
    var la = luminance(a);
    var lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function icon(name, className) {
    return '<svg class="icon' + (className ? ' ' + className : '') + '" aria-hidden="true"><use href="#' + name + '"></use></svg>';
  }

  /* ── Values that follow the theme: hex codes and contrast ratios are computed again on each change ── */

  var followers = [];

  function follow(update) {
    followers.push(update);
    update();
  }

  document.addEventListener('themechange', function () {
    // The new token values are in place once the browser has restyled: wait a frame
    requestAnimationFrame(function () {
      followers.forEach(function (update) {
        update();
      });
    });
  });

  /*
   * Everything below turns the markup of a page into live samples. It runs once for the page
   * that was loaded, and again for each page the navigation swaps in (window.showcase.enhance).
   */
  function enhance(root) {
    /* ── Color swatches: <div class="swatch" data-token="--color-primary" data-use="…" data-code="bg-primary"> ── */

    root.querySelectorAll('.swatch[data-token]').forEach(function (swatch) {
      var token = swatch.getAttribute('data-token');
      var chip = el('div', 'swatch__chip');
      chip.style.background = 'var(' + token + ')';
      var body = el('div', 'swatch__body');
      body.appendChild(el('span', 'mono swatch__name', token.replace('--color-', '')));
      var value = el('span', 'mono swatch__value');
      body.appendChild(value);
      if (swatch.hasAttribute('data-use')) {
        var use = el('div', 't-caption swatch__use', swatch.getAttribute('data-use'));
        if (swatch.hasAttribute('data-use-key')) use.setAttribute('data-i18n', swatch.getAttribute('data-use-key'));
        body.appendChild(use);
      }
      if (swatch.hasAttribute('data-code')) {
        var code = el('div', 't-caption');
        code.appendChild(el('code', null, swatch.getAttribute('data-code')));
        body.appendChild(code);
      }
      swatch.append(chip, body);
      follow(function () {
        value.textContent = toHex(resolveColor(token));
      });
    });

    /* ── A token's value as text: <span data-value="--color-scope-1"></span> ── */

    root.querySelectorAll('[data-value]').forEach(function (node) {
      follow(function () {
        node.textContent = toHex(resolveColor(node.getAttribute('data-value')));
      });
    });

    /* ── Contrast: <tr data-label="…" data-fg="--color-foreground" data-bg="--color-surface" data-min="4.5"> ── */

    root.querySelectorAll('tr[data-fg]').forEach(function (row) {
      var fgToken = row.getAttribute('data-fg');
      var bgToken = row.getAttribute('data-bg');
      var min = parseFloat(row.getAttribute('data-min') || '4.5');

      var sampleCell = el('td');
      var sample = el('span', 'sc-sample', 'Aa');
      sample.style.color = 'var(' + fgToken + ')';
      sample.style.background = 'var(' + bgToken + ')';
      sampleCell.appendChild(sample);

      var tokens = el('td');
      tokens.append(
        el('code', null, fgToken.replace('--color-', '')),
        document.createTextNode(' '),
        say(el('span'), 'ui.contrast.on', 'on'),
        document.createTextNode(' '),
        el('code', null, bgToken.replace('--color-', ''))
      );

      var ratioCell = el('td', 'num');
      var verdict = el('td');
      var name = el('td', null, row.getAttribute('data-label'));
      if (row.hasAttribute('data-label-key')) name.setAttribute('data-i18n', row.getAttribute('data-label-key'));
      row.append(sampleCell, name, tokens, ratioCell, verdict);

      follow(function () {
        var fg = resolveColor(fgToken);
        var bg = resolveColor(bgToken);
        if (!fg || !bg) return;
        var ratio = contrast(fg, bg);
        var pass = ratio >= min;
        ratioCell.textContent = ratio.toFixed(1) + ' : 1';
        verdict.innerHTML =
          '<span class="pill ' + (pass ? 'pill--success' : 'pill--danger') + '">' +
          icon(pass ? 'i-check-circle' : 'i-x-circle') + '<span class="pill__word"></span> ' + min + ' : 1</span>';
        say(verdict.querySelector('.pill__word'), pass ? 'ui.contrast.passes' : 'ui.contrast.fails', pass ? 'Passes' : 'Fails');
      });
    });

    /* ── Live samples ── */

    /* Tabs: one active tab within a [data-tabs] */
    root.querySelectorAll('[data-tabs]').forEach(function (tabs) {
      tabs.addEventListener('click', function (event) {
        var tab = event.target.closest('.tab');
        if (!tab) return;
        tabs.querySelectorAll('.tab').forEach(function (other) {
          other.removeAttribute('aria-current');
        });
        tab.setAttribute('aria-current', 'page');
      });
    });

    /* Switch: a button with role="switch"; data-switch-state names the element holding the state label */
    root.querySelectorAll('[role="switch"]').forEach(function (button) {
      var state = button.hasAttribute('data-switch-state') ? document.getElementById(button.getAttribute('data-switch-state')) : null;
      button.addEventListener('click', function () {
        if (button.disabled) return;
        var on = button.getAttribute('aria-checked') !== 'true';
        button.setAttribute('aria-checked', String(on));
        if (state) say(state, on ? 'ui.switch.on' : 'ui.switch.off', on ? 'On' : 'Off');
      });
    });

    /* Show / Hide in a password field */
    root.querySelectorAll('[data-reveal]').forEach(function (button) {
      var input = document.getElementById(button.getAttribute('data-reveal'));
      if (!input) return;
      button.addEventListener('click', function () {
        var shown = input.type === 'text';
        input.type = shown ? 'password' : 'text';
        say(button, shown ? 'ui.reveal.show' : 'ui.reveal.hide', shown ? 'Show' : 'Hide');
        button.setAttribute('aria-pressed', String(!shown));
        button.setAttribute('aria-label', shown ? word('ui.reveal.showPassword', 'Show password') : word('ui.reveal.hidePassword', 'Hide password'));
      });
    });

    /* Loading button: a click shows the spinner for two seconds */
    root.querySelectorAll('[data-demo-loading]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (button.classList.contains('is-loading')) return;
        button.classList.add('is-loading');
        button.setAttribute('aria-busy', 'true');
        setTimeout(function () {
          button.classList.remove('is-loading');
          button.removeAttribute('aria-busy');
        }, 2000);
      });
    });

    /* Toasts: <button data-toast="success" data-toast-title="…" data-toast-text="…"> adds one to the stack */
    root.querySelectorAll('[data-toast]').forEach(function (button) {
      button.addEventListener('click', function () {
        showToast(
          button.getAttribute('data-toast'),
          word(button.getAttribute('data-toast-title-key'), button.getAttribute('data-toast-title')),
          word(button.getAttribute('data-toast-text-key'), button.getAttribute('data-toast-text'))
        );
      });
    });

    /* Modal: <button data-modal-open="id"> opens the .scrim with that id; anything with data-modal-close inside closes it */
    root.querySelectorAll('[data-modal-open]').forEach(function (button) {
      var scrim = document.getElementById(button.getAttribute('data-modal-open'));
      if (!scrim) return;
      var opener = null;
      function close() {
        scrim.hidden = true;
        document.documentElement.classList.remove('modal-open');
        if (opener) opener.focus();
      }
      button.addEventListener('click', function () {
        opener = button;
        scrim.hidden = false;
        document.documentElement.classList.add('modal-open');
        var first = scrim.querySelector('[data-modal-close], button');
        if (first) first.focus();
      });
      if (!scrim.hasAttribute('data-wired')) {
        scrim.setAttribute('data-wired', '');
        scrim.addEventListener('click', function (event) {
          if (event.target === scrim || event.target.closest('[data-modal-close]')) close();
        });
        scrim.addEventListener('keydown', function (event) {
          if (event.key === 'Escape') close();
        });
      }
    });

    /* Motion: <button data-replay="id"> restarts the animation of the element with that id */
    root.querySelectorAll('[data-replay]').forEach(function (button) {
      var target = document.getElementById(button.getAttribute('data-replay'));
      if (!target) return;
      button.addEventListener('click', function () {
        var animation = target.style.animation || getComputedStyle(target).animation;
        target.style.animation = 'none';
        void target.offsetWidth; // the browser must see the element without its animation once
        target.style.animation = animation === 'none' ? '' : animation;
      });
    });

    /* A checkbox that is neither on nor off: <input type="checkbox" data-indeterminate> */
    root.querySelectorAll('input[data-indeterminate]').forEach(function (box) {
      box.indeterminate = true;
    });

    /* <button data-replay-progress="id"> empties the bar with that id and lets it grow back */
    root.querySelectorAll('[data-replay-progress]').forEach(function (button) {
      var fill = document.getElementById(button.getAttribute('data-replay-progress'));
      if (!fill) return;
      button.addEventListener('click', function () {
        var width = fill.getAttribute('data-percent') + '%';
        fill.style.transition = 'none';
        fill.style.width = '0';
        void fill.offsetWidth;
        fill.style.transition = '';
        fill.style.width = width;
      });
    });

    /* Progress bars: <div class="progress__fill" data-percent="62"> */
    root.querySelectorAll('.progress__fill[data-percent]').forEach(function (fill) {
      fill.style.width = fill.getAttribute('data-percent') + '%';
    });

    /* Rings: <circle class="ring__bar" data-percent="78" r="43"> */
    root.querySelectorAll('.ring__bar[data-percent]').forEach(function (bar) {
      var r = parseFloat(bar.getAttribute('r'));
      var length = 2 * Math.PI * r;
      var percent = parseFloat(bar.getAttribute('data-percent'));
      bar.setAttribute('stroke-dasharray', length.toFixed(2));
      bar.setAttribute('stroke-dashoffset', (length * (1 - percent / 100)).toFixed(2));
    });
  }

  /* ── The toast stack ── */

  var TOAST_ICONS = { success: 'i-check-circle', danger: 'i-x-circle', warning: 'i-warn', info: 'i-info' };

  function showToast(tone, title, text) {
    var stack = document.querySelector('.toaster');
    if (!stack) {
      stack = el('div', 'toaster');
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    var toast = el('div', 'toast toast--' + tone);
    toast.innerHTML =
      '<span class="toast__icon">' + icon(TOAST_ICONS[tone] || 'i-info') + '</span>' +
      '<div class="toast__body"><span class="toast__title"></span>' + (text ? '<span class="toast__text"></span>' : '') + '</div>' +
      '<button type="button" class="toast__close">' + icon('i-x') + '</button>';
    toast.querySelector('.toast__close').setAttribute('aria-label', word('ui.toast.dismiss', 'Dismiss'));
    toast.querySelector('.toast__title').textContent = title;
    if (text) toast.querySelector('.toast__text').textContent = text;
    stack.appendChild(toast);

    // Stays five seconds, longer while the pointer is on it
    var timer = setTimeout(dismiss, 5000);
    toast.addEventListener('mouseenter', function () {
      clearTimeout(timer);
    });
    toast.addEventListener('mouseleave', function () {
      timer = setTimeout(dismiss, 2500);
    });
    toast.querySelector('.toast__close').addEventListener('click', dismiss);

    function dismiss() {
      clearTimeout(timer);
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }
  }

  // Steps added by scripts that load after this one
  var extraSteps = [];

  enhance(document);
  window.showcase = {
    enhance: function (root) {
      // The followers of the page that left would compute values for nodes no longer on screen
      followers = [];
      enhance(root);
      extraSteps.forEach(function (step) {
        step(root);
      });
    },
    // Adds a step for every page swapped in from now on, and runs it for the page already on show
    register: function (step) {
      extraSteps.push(step);
      step(document);
    },
    toast: showToast,
  };
})();
