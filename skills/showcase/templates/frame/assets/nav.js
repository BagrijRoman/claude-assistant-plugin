/*
 * Navigation behavior.
 *
 * The menu, the breadcrumbs, the catalog and the previous / next links are static HTML, written
 * into every page by build.mjs from pages.mjs. Folding a root section is the browser's own
 * <details>; the roots share a name, so opening one folds the one that was open. This script adds
 * only what markup cannot do:
 *   - the "All pages" button that slides the menu in on a narrow screen, and the closed menu kept
 *     out of the Tab order there;
 *   - one root open at a time where the browser does not keep it so itself;
 *   - a click on a root section's title in the menu: it opens the page, not just the fold;
 *   - the ← → keys;
 *   - moving between pages without reloading, when the site is served over HTTP;
 *   - on a page in sections, marking in the menu the section on show as the page scrolls, and
 *     scrolling to a section picked in the menu;
 *   - the theme switch in the top bar: light, dark or follow the device;
 *   - presentation mode: the menu and the top bar step aside, the page fills the window.
 *
 * It loads right after the menu, before the rest of the page, and listens on the document, so it
 * needs nothing that comes later in the page. i18n.js and flow.js listen for the `pageswap` event it
 * fires after a swap, so they can work on the new content.
 */
(function () {
  var script = document.currentScript;
  var root = new URL('..', script.src); // the site's folder: this file lives in assets/
  var side = document.getElementById('sc-side');
  // One showcase per folder: the keys carry the folder, so two showcases on one machine do not share
  var THEME_KEY = 'showcase:theme:' + root.pathname;
  var PRESENT_KEY = 'showcase:present:' + root.pathname;

  // One page, one key: a host with clean addresses (Cloudflare Pages) answers flows/signIn.html with a redirect
  // to flows/signIn, and charts/index.html with charts/ — all three name the same page
  function normalize(pathname) {
    return pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  }
  // Served from this machine (open.mjs) the files keep their names; a public host is asked for the clean
  // address at once, so a move in the menu costs no redirect and the page is swapped in, never reloaded
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

  function remember(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (error) {
      console.warn('The choice could not be saved: ' + error.message);
    }
  }

  function recall(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  /*
   * ── Theme ──
   * The choice is stamped on <html> as data-theme="light|dark" before the page paints; no attribute
   * means "follow the device", which tokens.css handles with a media query.
   */

  function readTheme() {
    var saved = recall(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  }

  function applyTheme(theme) {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('[data-theme-set]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-theme-set') === theme));
    });
    // showcase.js re-reads the token values, so the hex codes and contrast ratios follow the theme
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
  }

  applyTheme(readTheme());
  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(readTheme());
  });

  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-theme-set]');
    if (!button) return;
    var theme = button.getAttribute('data-theme-set');
    remember(THEME_KEY, theme === 'system' ? null : theme);
    applyTheme(theme);
  });

  /*
   * ── Presentation mode ──
   * For showing the site to a room: no menu, no top bar, the page alone and larger. `?present=1` in
   * the address turns it on for a shared link; the button in the top bar and the P key toggle it;
   * Escape leaves it. The choice is kept, so it survives moving between pages.
   */

  function applyPresent(on) {
    document.documentElement.classList.toggle('present', on);
    document.querySelectorAll('[data-present-toggle]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(on));
    });
  }

  function readPresent() {
    if (new URL(location.href).searchParams.get('present') === '1') {
      remember(PRESENT_KEY, '1');
      return true;
    }
    return recall(PRESENT_KEY) === '1';
  }

  function setPresent(on) {
    remember(PRESENT_KEY, on ? '1' : null);
    applyPresent(on);
  }

  applyPresent(readPresent());

  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-present-toggle]');
    if (!button) return;
    setPresent(!document.documentElement.classList.contains('present'));
  });

  /*
   * ── The menu on a narrow screen ──
   * There it is a drawer off the edge of the window; closed, it is also inert, so the Tab key does
   * not walk through links nobody can see.
   */

  var narrow = window.matchMedia('(max-width: 900px)');

  function syncDrawer() {
    if (side) side.inert = narrow.matches && !document.documentElement.classList.contains('nav-open');
  }

  function closeNav() {
    document.documentElement.classList.remove('nav-open');
    var toggle = document.querySelector('[data-nav-toggle]');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    syncDrawer();
  }

  syncDrawer();
  narrow.addEventListener('change', syncDrawer);

  document.addEventListener('click', function (event) {
    var toggle = event.target.closest('[data-nav-toggle]');
    if (toggle) {
      var open = document.documentElement.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(open));
      syncDrawer();
    } else if (event.target.closest('.sc-scrim')) {
      closeNav();
    }
  });

  /*
   * ── One root open at a time ──
   * Opening a root section folds the one that was open, so the menu stays short. The browser does it
   * itself through the name every root shares (build.mjs writes name="sc-side"); this listener does
   * the same where that is not supported. `toggle` does not bubble, hence the capture.
   */

  document.addEventListener('toggle', function (event) {
    var group = event.target;
    if (!side || !group.open || !group.classList || !group.classList.contains('sc-side__group')) return;
    side.querySelectorAll('details.sc-side__group[open]').forEach(function (other) {
      if (other !== group) other.open = false;
    });
  }, true);

  /*
   * ── Moving between pages without reloading ──
   * Served over HTTP, a click on a link to another page of the site fetches that page and swaps in
   * only its <main> and its breadcrumbs. The menu, the top bar, the styles and the scripts stay where
   * they are, so nothing is drawn again. Opened straight from disk the browser forbids the fetch,
   * and links load pages the ordinary way.
   */

  var swaps = location.protocol === 'http:' || location.protocol === 'https:';

  // The menu outlives the page it came with, so its links must not depend on the page's address
  if (swaps && side) {
    side.querySelectorAll('a[href]').forEach(function (link) {
      link.setAttribute('href', link.href);
    });
  }

  function isSitePage(url) {
    return url.origin === location.origin && url.href.indexOf(root.href) === 0 && /(\/|\.html)$/.test(url.pathname);
  }

  // Scrolls the menu, and only the menu, so the link is in view. A link in a folded root is out of
  // sight on purpose — the reader folded it, or opened another root — so the menu stays where it is.
  // The fold is checked, not the link's box: a browser may still lay out a folded root's contents.
  // A root's title sits in its <summary> and is in sight either way.
  function keepVisible(link) {
    if (!side) return;
    var group = link.closest('details');
    if (group && !group.open && !link.closest('summary')) return;
    var box = side.getBoundingClientRect();
    var row = link.getBoundingClientRect();
    if (row.top < box.top + 8) side.scrollTop -= box.top + 8 - row.top;
    else if (row.bottom > box.bottom - 8) side.scrollTop += row.bottom - (box.bottom - 8);
  }

  // After an in-place swap: moves the highlight to the page on show and opens its root, and folds
  // every other root right here — not only through the browser's shared name — so all browsers end
  // in the same state. A page whose root is a plain link leaves every root folded, as a reload of that
  // page does. On a child page (a flow) the root's title is marked aria-current="true", so the way to
  // the page stays visible when that root is folded. When a fold hides the link that had keyboard
  // focus, focus moves to the page's own link instead of falling to the body.
  // The sections of a page in sections are marked by the scroll instead (below).
  function markCurrent() {
    if (!side) return;
    var here = normalize(location.pathname);
    var focused = side.contains(document.activeElement) ? document.activeElement : null;
    var current = null;
    side.querySelectorAll('a.navlink').forEach(function (link) {
      var mine = normalize(link.pathname) === here;
      if (link.hasAttribute('data-section')) {
        if (!mine) link.removeAttribute('aria-current');
        return;
      }
      if (mine) {
        link.setAttribute('aria-current', 'page');
        current = link;
      } else {
        link.removeAttribute('aria-current');
      }
    });
    var group = current ? current.closest('details') : null;
    if (group) {
      group.open = true;
      var title = group.querySelector('summary a.navlink--page');
      if (title && title !== current) title.setAttribute('aria-current', 'true');
    }
    side.querySelectorAll('details.sc-side__group[open]').forEach(function (other) {
      if (other !== group) other.open = false;
    });
    if (current) keepVisible(current);
    var fold = focused && !focused.closest('summary') ? focused.closest('details') : null;
    if (current && fold && !fold.open) current.focus({ preventScroll: true });
  }

  /*
   * ── A page in sections ──
   * Its sections are the menu's links to it (data-section="<id of the section>"). The one whose top
   * has passed a line near the top of the window is on show: the menu marks it and the breadcrumbs
   * name it. A click on one scrolls the page to it, and the mark stays on it until the reader scrolls.
   */

  var LINE = 140; // px from the top of the window
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sections = []; // { link, target } in page order
  var shown = null;
  var hold = null; // 'travel' while the page scrolls to a section picked in the menu, then 'hold'
  var holdTimer = 0;
  var arrived = null;

  function refreshSections() {
    sections = [];
    shown = null;
    hold = null;
    if (!side) return;
    var here = normalize(location.pathname);
    side.querySelectorAll('a.navlink[data-section]').forEach(function (link) {
      if (normalize(link.pathname) !== here) return;
      var target = document.getElementById(link.getAttribute('data-section'));
      if (target) sections.push({ link: link, target: target });
    });
    // Opened at an address with a place on the page (a shared link, a reload, an old page that moved
    // here): go there first, before the scroll decides which section is on show
    var place = placeInAddress();
    if (place && sections.length > 0) {
      place.scrollIntoView();
      var own = sections.filter(function (entry) { return entry.target === place; })[0];
      if (own) {
        show(own);
        hold = 'hold';
        return;
      }
    }
    followScroll();
  }

  function placeInAddress() {
    if (!location.hash) return null;
    try {
      return document.getElementById(decodeURIComponent(location.hash.slice(1)));
    } catch (error) {
      console.warn('The address names no place on this page: ' + error.message);
      return null;
    }
  }

  function show(entry) {
    if (shown === entry) return;
    shown = entry;
    sections.forEach(function (other) {
      if (other === entry) other.link.setAttribute('aria-current', 'page');
      else other.link.removeAttribute('aria-current');
    });
    var crumb = document.querySelector('.sc-crumb__page');
    if (crumb) {
      crumb.textContent = entry.link.getAttribute('data-label');
      // i18n.js translates by key and goes back to the default language from data-i18n-default: the
      // crumb now names this section, so it takes both from the section's link
      var label = entry.link.querySelector('[data-i18n]');
      if (label) {
        crumb.setAttribute('data-i18n', label.getAttribute('data-i18n'));
        crumb.setAttribute('data-i18n-default', label.getAttribute('data-i18n-default') || label.textContent);
      }
    }
    keepVisible(entry.link);
    // An address that already points into this section (#select-filter) stays as it is
    var place = placeInAddress();
    if (place && entry.target.contains(place)) return;
    // The address names the section, so a reload or a shared link opens it; at the very top it names none
    var address = entry === sections[0] && window.scrollY < 8 ? location.pathname : location.pathname + '#' + entry.target.id;
    if (location.pathname + location.hash !== address) history.replaceState(history.state, '', address);
  }

  function followScroll() {
    if (sections.length === 0 || hold === 'travel') return;
    // The page arrived at a section picked in the menu; this scroll is the reader's own
    hold = null;
    var entry = sections[0];
    sections.forEach(function (candidate) {
      if (candidate.target.getBoundingClientRect().top <= LINE) entry = candidate;
    });
    // At the bottom of the page the last section is on show, even if it is too short to reach the line
    var doc = document.documentElement;
    if (window.innerHeight + window.scrollY >= doc.scrollHeight - 2) entry = sections[sections.length - 1];
    show(entry);
  }

  // The mark stays on the section picked until the page has arrived there and the reader scrolls
  // again: on the way the page passes other sections, and near the bottom it may stop short of the line
  function goToSection(entry) {
    show(entry);
    clearTimeout(holdTimer);
    // A click while the page still travels to the previous pick replaces that trip
    if (arrived) window.removeEventListener('scrollend', arrived);
    var margin = parseFloat(getComputedStyle(entry.target).scrollMarginTop) || 0;
    if (Math.abs(entry.target.getBoundingClientRect().top - margin) < 2) {
      hold = 'hold';
      return;
    }
    hold = 'travel';
    arrived = function () {
      arrived = null;
      if (hold === 'travel') hold = 'hold';
    };
    // A browser without the scrollend event gets a generous timer instead
    if ('onscrollend' in window) window.addEventListener('scrollend', arrived, { once: true });
    else holdTimer = setTimeout(arrived, 1500);
    entry.target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  var scrollQueued = false;
  window.addEventListener('scroll', function () {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(function () {
      scrollQueued = false;
      followScroll();
    });
  }, { passive: true });
  window.addEventListener('resize', followScroll);
  document.addEventListener('DOMContentLoaded', refreshSections);

  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest('a[data-section]');
    if (!link) return;
    var entry = sections.filter(function (candidate) { return candidate.link === link; })[0];
    if (!entry) return;
    event.preventDefault();
    closeNav();
    goToSection(entry);
  });

  // A root section's title sits inside its <summary>: a click there must open the page, and must
  // not fold the group on the way. Preventing the default stops the fold; the page is opened by hand.
  document.addEventListener('click', function (event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest('summary a.navlink--page');
    if (!link) return;
    event.preventDefault();
    var group = link.closest('details');
    if (group) group.open = true;
    closeNav();
    go(link.href, true);
  });

  // A page may bring scripts the document on show never loaded (a flow's player).
  // They are loaded once, in the page's order, before its content is made live.
  function loadScripts(next, base) {
    var chain = Promise.resolve();
    next.querySelectorAll('script[src]').forEach(function (tag) {
      var src = new URL(tag.getAttribute('src'), base).href;
      var loaded = Array.prototype.some.call(document.scripts, function (existing) {
        return existing.src === src;
      });
      if (loaded) return;
      chain = chain.then(function () {
        return new Promise(function (resolve, reject) {
          var added = document.createElement('script');
          added.src = src;
          added.onload = resolve;
          added.onerror = function () {
            reject(new Error('Could not load ' + src));
          };
          document.body.appendChild(added);
        });
      });
    });
    return chain;
  }

  // The styles outlive the page they came with, as the menu does: a stylesheet edited while the tab is
  // open would not reach the pages opened after the edit, and a new page would be drawn with the old
  // rules. Each swap asks the server for the site's own stylesheets again and loads anew one that has
  // changed since the tab took it; the new copy goes in beside the old, which leaves once it has loaded.
  var sheetTexts = {};

  function ownSheets() {
    return Array.prototype.filter.call(document.querySelectorAll('link[rel="stylesheet"]'), function (link) {
      return new URL(link.href).origin === location.origin;
    });
  }

  function readSheet(path) {
    return fetch(path, { cache: 'no-store' }).then(function (response) {
      return response.ok ? response.text() : null;
    });
  }

  if (swaps) {
    ownSheets().forEach(function (link) {
      var path = new URL(link.href).pathname;
      readSheet(path).then(function (text) { sheetTexts[path] = text; }).catch(function () {});
    });
  }

  function refreshStyles() {
    ownSheets().forEach(function (link) {
      var path = new URL(link.href).pathname;
      readSheet(path).then(function (text) {
        if (text === null || !(path in sheetTexts) || sheetTexts[path] === text) return;
        sheetTexts[path] = text;
        var fresh = link.cloneNode();
        fresh.href = path + '?v=' + Date.now();
        fresh.addEventListener('load', function () { link.remove(); });
        link.after(fresh);
      }).catch(function () {});
    });
  }

  function go(href, push) {
    var url = new URL(href, location.href);
    if (!local) url.pathname = normalize(url.pathname);
    if (!swaps) {
      location.href = url.href;
      return;
    }
    // A script written with a relative address would re-resolve against the new address once it
    // changes, and then read as "not loaded yet": pin every script to its absolute address first
    Array.prototype.forEach.call(document.scripts, function (existing) {
      if (existing.getAttribute('src')) existing.setAttribute('src', existing.src);
    });
    fetch(url.href)
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        // The page has moved (it became a section of a long page): load it in full, so the browser
        // follows the redirect to the section and the address bar shows where it went
        if (response.redirected && normalize(new URL(response.url).pathname) !== normalize(url.pathname)) throw new Error('the page has moved to ' + response.url);
        return response.text();
      })
      .then(function (html) {
        var next = new DOMParser().parseFromString(html, 'text/html');
        var nextMain = next.querySelector('.sc-main');
        var main = document.querySelector('.sc-main');
        if (!nextMain || !main) throw new Error('The page has no main content');
        // The address changes first, so the relative links of the new content resolve against it
        if (push) history.pushState(null, '', url.href);
        document.title = next.title;
        main.innerHTML = nextMain.innerHTML;
        var crumb = document.querySelector('.sc-crumb');
        var nextCrumb = next.querySelector('.sc-crumb');
        if (crumb && nextCrumb) crumb.innerHTML = nextCrumb.innerHTML;
        markCurrent();
        closeNav();
        refreshStyles();
        var target = url.hash ? document.getElementById(url.hash.slice(1)) : null;
        if (target) target.scrollIntoView();
        else window.scrollTo(0, 0);
        refreshSections();
        return loadScripts(next, url.href).then(function () {
          if (window.showcase) window.showcase.enhance(main);
          document.dispatchEvent(new CustomEvent('pageswap', { detail: { main: main } }));
        });
      })
      .catch(function (error) {
        // The page could not be swapped in: load it the ordinary way, which also shows a real error page
        console.warn('Loading ' + url.pathname + ' in full: ' + error.message);
        location.href = url.href;
      });
  }

  if (swaps) {
    document.addEventListener('click', function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var link = event.target.closest('a[href]');
      if (!link || link.target || !isSitePage(link)) return;
      // A link to a place on the page already on show is the browser's own business
      if (normalize(link.pathname) === normalize(location.pathname) && link.hash) return;
      event.preventDefault();
      go(link.href, true);
    });
    window.addEventListener('popstate', function () {
      go(location.href, false);
    });
  }

  /* ── Keys: Escape closes the menu or leaves presentation; P toggles presentation;
        ← → step through a page's sections, then to the previous / next page ── */

  document.addEventListener('keydown', function (event) {
    if (event.defaultPrevented) return;
    if (event.key === 'Escape') {
      if (document.documentElement.classList.contains('present')) setPresent(false);
      closeNav();
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    var tag = (event.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    // P works wherever the focus is, except in a field; the arrows leave buttons and summaries alone
    if (event.key === 'p' || event.key === 'P') {
      setPresent(!document.documentElement.classList.contains('present'));
      return;
    }
    if (tag === 'button' || tag === 'summary') return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    var forward = event.key === 'ArrowRight';
    var at = sections.indexOf(shown);
    if (at >= 0) {
      if (forward && at < sections.length - 1) {
        event.preventDefault();
        goToSection(sections[at + 1]);
        return;
      }
      if (!forward && at > 0) {
        event.preventDefault();
        goToSection(sections[at - 1]);
        return;
      }
      if (!forward && window.scrollY > 8) {
        event.preventDefault();
        goToSection(sections[0]);
        return;
      }
    }
    var link = document.querySelector(forward ? '.sc-pager__link--next' : '.sc-pager__link--prev');
    if (link) go(link.href, true);
  });
})();
