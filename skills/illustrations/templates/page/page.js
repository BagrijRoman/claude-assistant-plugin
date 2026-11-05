/* The review page: the theme switch, the tabs (one on screen, its id in the address), the replay of a
   picture's animation, the live values of the swatches and the copy of an item's id for a revision. No
   dependency; works from disk and inside the Artifact viewer. */
(function () {
  'use strict';
  var root = document.documentElement;
  var store = {
    get: function (key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set: function (key, value) { try { localStorage.setItem(key, value); } catch (e) { /* no storage: the page still works */ } }
  };

  /* Theme: light | dark | system (no attribute). A choice is kept per viewer. */
  function setTheme(theme, keep) {
    if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
    else root.removeAttribute('data-theme');
    document.querySelectorAll('[data-theme-set]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-theme-set') === theme));
    });
    if (keep) store.set('ill-theme', theme);
    document.dispatchEvent(new CustomEvent('themechange'));
  }
  document.querySelectorAll('[data-theme-set]').forEach(function (button) {
    button.addEventListener('click', function () { setTheme(button.getAttribute('data-theme-set'), true); });
  });
  /* ?theme=light|dark in the address wins, for a screenshot of one theme; the choice kept per viewer otherwise */
  var asked = /[?&]theme=(light|dark|system)\b/.exec(location.search);
  setTheme(asked ? asked[1] : (store.get('ill-theme') || 'system'), false);

  /* Tabs: one panel on screen; the tab's id is the address's hash (a plain #name). */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('[role="tabpanel"]'));
  function show(id, push) {
    var found = panels.some(function (panel) { return panel.id === id; });
    if (!found) id = panels.length ? panels[0].id : '';
    tabs.forEach(function (tab) { tab.setAttribute('aria-selected', String(tab.getAttribute('aria-controls') === id)); });
    panels.forEach(function (panel) { panel.hidden = panel.id !== id; });
    if (push && id && location.hash !== '#' + id) {
      try { history.replaceState(null, '', '#' + id); } catch (e) { location.hash = id; }
    }
    replayAll(document.getElementById(id));
  }
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { show(tab.getAttribute('aria-controls'), true); });
  });
  window.addEventListener('hashchange', function () { show(location.hash.slice(1), false); });
  show(location.hash.slice(1), false);
  /* A hash in the address scrolls the browser to the panel, under the tabs: start at the top instead */
  if (location.hash) requestAnimationFrame(function () { window.scrollTo(0, 0); });

  /* Replay: an animation restarts when its <svg> is put into the page again. */
  function replay(svg) {
    if (!svg) return;
    var clone = svg.cloneNode(true);
    svg.parentNode.replaceChild(clone, svg);
  }
  function replayAll(scope) {
    if (!scope) return;
    scope.querySelectorAll('svg[data-animated]').forEach(replay);
  }
  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-replay]');
    if (button) {
      var item = button.closest('[data-item]') || button.closest('[role="tabpanel"]');
      replayAll(item);
      return;
    }
    var id = event.target.closest('[data-copy]');
    if (id) {
      var text = id.getAttribute('data-copy');
      var done = function () { toast('Copied ' + text + ' — name it in your revision'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { select(id); done(); });
      else { select(id); done(); }
    }
  });
  function select(node) {
    try {
      var range = document.createRange();
      range.selectNodeContents(node);
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (e) { /* nothing to select */ }
  }
  var toastTimer;
  function toast(text) {
    var node = document.querySelector('.toast');
    if (!node) { node = document.createElement('div'); node.className = 'toast'; node.setAttribute('role', 'status'); document.body.appendChild(node); }
    node.textContent = text;
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.hidden = true; }, 2200);
  }

  /* Schemes: the viewer tries one of the schemes considered on every picture (html.use-scheme-<id>); the
     chosen scheme is the page's own values, so trying it clears the class. Kept per viewer. */
  var wrap = document.querySelector('.wrap');
  var chosenScheme = wrap ? wrap.getAttribute('data-scheme-chosen') : null;
  function useScheme(id, keep) {
    var classes = root.className.split(/\s+/).filter(function (name) { return name && name.indexOf('use-scheme-') !== 0; });
    if (id && id !== chosenScheme) classes.push('use-scheme-' + id);
    root.className = classes.join(' ');
    document.querySelectorAll('[data-scheme-use]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-scheme-use') === (id || chosenScheme)));
    });
    if (keep) store.set('ill-scheme', id || '');
    document.dispatchEvent(new CustomEvent('themechange'));
  }
  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-scheme-use]');
    if (!button) return;
    var id = button.getAttribute('data-scheme-use');
    var pressed = button.getAttribute('aria-pressed') === 'true';
    useScheme(pressed && !button.closest('[data-scheme-switch]') ? chosenScheme : id, true);
  });
  if (chosenScheme) {
    /* ?scheme=<id> in the address wins, for a screenshot or a link; the viewer's own try is kept otherwise */
    var askedScheme = /[?&]scheme=([a-z0-9-]+)/.exec(location.search);
    var kept = askedScheme ? askedScheme[1] : store.get('ill-scheme');
    if (kept && document.querySelector('[data-scheme-use="' + kept + '"]')) useScheme(kept, false);
  }

  /* Swatches: the live value of a token, in the theme on show. */
  function paintSwatches() {
    var style = getComputedStyle(root);
    document.querySelectorAll('[data-token]').forEach(function (swatch) {
      var token = swatch.getAttribute('data-token');
      var value = style.getPropertyValue(token).trim();
      var chip = swatch.querySelector('.swatch__chip');
      var out = swatch.querySelector('.swatch__value');
      if (chip) chip.style.background = 'var(' + token + ')';
      if (out) out.textContent = value;
    });
  }
  document.addEventListener('themechange', paintSwatches);
  paintSwatches();
})();
