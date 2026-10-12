/*
 * Languages.
 *
 * The page is written in the site's default language. Every text that has a translation carries a
 * key: <span data-i18n="components.button.title">Button</span>. A dictionary per other language
 * registers itself as window.SHOWCASE_I18N.<lang> = { key: text } (see i18n/<lang>.js); build.mjs
 * loads the dictionaries and then this file, deferred, so the swap happens before the first paint.
 *
 * Switching back to the default language restores the text the page was written with: the original
 * is kept on the element the first time it is translated (as HTML when it holds markup, so a <code>
 * inside survives; such an entry in a dictionary is HTML too). A key is never put inside an element
 * that has a key of its own. Attributes translate through
 * data-i18n-attr="placeholder:key;aria-label:other.key". The choice is kept per site folder and
 * stamped on <html lang>, so screen readers and hyphenation follow it.
 */
(function () {
  var site = window.SHOWCASE_SITE || { languages: ['en'], defaultLanguage: 'en' };
  var languages = site.languages || ['en'];
  var defaultLanguage = site.defaultLanguage || languages[0];
  var dictionaries = (window.SHOWCASE_I18N = window.SHOWCASE_I18N || {});
  var folder = location.pathname.slice(0, location.pathname.lastIndexOf('/') + 1);
  // One key per site, like the theme: the site's folder is the one above assets/, where this file
  // lives; the page's own folder stands in when the script's address is not known
  var KEY = 'showcase:lang:' + (document.currentScript ? new URL('..', document.currentScript.src).pathname : folder);
  var current = defaultLanguage;

  function recall() {
    try {
      var saved = localStorage.getItem(KEY);
      return languages.indexOf(saved) >= 0 ? saved : defaultLanguage;
    } catch (error) {
      return defaultLanguage;
    }
  }

  function remember(lang) {
    try {
      if (lang === defaultLanguage) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, lang);
    } catch (error) {
      console.warn('The language could not be saved: ' + error.message);
    }
  }

  function textFor(key, lang) {
    var dictionary = dictionaries[lang];
    return dictionary && Object.prototype.hasOwnProperty.call(dictionary, key) ? dictionary[key] : null;
  }

  // An element whose text holds markup (<code>, <strong>, a tag) keeps it: its default is kept as
  // HTML and its dictionary entry is HTML as well. Any other element is set as plain text.
  function translateText(element, lang) {
    var key = element.getAttribute('data-i18n');
    if (!key) return;
    if (!element.hasAttribute('data-i18n-default')) {
      var markup = element.children.length > 0;
      element.setAttribute('data-i18n-default', markup ? element.innerHTML : element.textContent);
      if (markup) element.setAttribute('data-i18n-rich', '');
    }
    var rich = element.hasAttribute('data-i18n-rich');
    var text = lang === defaultLanguage ? null : textFor(key, lang);
    // A key the dictionary lacks keeps the default text, so a missing translation never blanks a label
    if (text === null) text = element.getAttribute('data-i18n-default');
    if (rich) {
      if (element.innerHTML !== text) element.innerHTML = text;
    } else if (element.textContent !== text) {
      element.textContent = text;
    }
    // The menu sizes a link by data-label and the breadcrumbs read it: keep it in the same language
    var parent = element.parentElement;
    if (parent && parent.hasAttribute('data-label')) parent.setAttribute('data-label', element.textContent);
  }

  function translateAttributes(element, lang) {
    var spec = element.getAttribute('data-i18n-attr');
    if (!spec) return;
    spec.split(';').forEach(function (pair) {
      var parts = pair.split(':');
      if (parts.length < 2) return;
      var attribute = parts[0].trim();
      var key = parts.slice(1).join(':').trim();
      var defaultAttribute = 'data-i18n-default-' + attribute;
      if (!element.hasAttribute(defaultAttribute)) element.setAttribute(defaultAttribute, element.getAttribute(attribute) || '');
      var text = lang === defaultLanguage ? element.getAttribute(defaultAttribute) : textFor(key, lang);
      if (text === null) text = element.getAttribute(defaultAttribute);
      if (element.getAttribute(attribute) !== text) element.setAttribute(attribute, text);
    });
  }

  function apply(lang, scope) {
    current = lang;
    var within = scope || document;
    within.querySelectorAll('[data-i18n]').forEach(function (element) { translateText(element, lang); });
    within.querySelectorAll('[data-i18n-attr]').forEach(function (element) { translateAttributes(element, lang); });
    if (!scope) {
      document.documentElement.setAttribute('lang', lang);
      document.querySelectorAll('[data-lang-set]').forEach(function (button) {
        button.setAttribute('aria-pressed', String(button.getAttribute('data-lang-set') === lang));
      });
      document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
    }
  }

  function start() {
    apply(recall());
  }

  // Deferred scripts run after the document is parsed, so the whole page is there to translate
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-lang-set]');
    if (!button) return;
    var lang = button.getAttribute('data-lang-set');
    if (languages.indexOf(lang) < 0) return;
    remember(lang);
    apply(lang);
  });

  // nav.js swapped a new <main> in: translate it, and the breadcrumbs that came with it
  document.addEventListener('pageswap', function () {
    apply(current);
  });

  window.showcaseI18n = {
    current: function () { return current; },
    apply: apply,
    text: function (key) {
      return current === defaultLanguage ? null : textFor(key, current);
    },
  };
})();
