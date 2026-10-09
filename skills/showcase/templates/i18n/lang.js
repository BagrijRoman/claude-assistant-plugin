// {{LANGUAGE_NAME}} dictionary of the showcase. The pages are written in the default language;
// every key here is a data-i18n key in a page or in the navigation that build.mjs writes.
// `/showcase audit` lists the keys the pages use that this file lacks, and the keys here that no
// page uses. The texts of the product itself (screens, components, emails) come from the
// Microcopy and tone page: write them there first, then here. An entry for an element that holds
// markup (a <code>, a tag) is HTML, with the same markup.
window.SHOWCASE_I18N = window.SHOWCASE_I18N || {};
window.SHOWCASE_I18N['{{LANG}}'] = {
  // ── The site's own interface ──
  'ui.allPages': 'All pages',
  'ui.keysHint': 'The ← → keys step through the sections and pages.',
  'ui.soon': 'soon',
  'ui.planned': 'Planned',
  'ui.previous': '← Previous',
  'ui.next': 'Next →',
  'ui.theme.light': 'Light',
  'ui.theme.dark': 'Dark',
  'ui.theme.system': 'System',
  'ui.present': 'Present',
  'ui.exitPresent': 'Exit presentation',
  'ui.selected': 'Selected',
  'ui.alternative': 'Alternative',
  'ui.inProgress': 'Being prepared.',
  'ui.inProgressTitle': 'In progress',
  'ui.contrast.on': 'on',
  'ui.contrast.passes': 'Passes',
  'ui.contrast.fails': 'Fails',
  'ui.switch.on': 'On',
  'ui.switch.off': 'Off',
  'ui.reveal.show': 'Show',
  'ui.reveal.hide': 'Hide',
  'ui.reveal.showPassword': 'Show password',
  'ui.reveal.hidePassword': 'Hide password',
  'ui.toast.dismiss': 'Dismiss',
  'flow.step': 'Step',
  'flow.of': 'of',
  'flow.all': 'All steps',
  'flow.full': 'Full screen',
  'flow.prev': 'Previous step',
  'flow.next': 'Next step',
  'flow.notDrawn': 'This screen is not drawn yet',
  'flow.hints': 'Hints',

  // ── The starting pages: how to read the site (on the overview), the Flows index ──
  'overview.how.title': 'How to read this site',
  'overview.how.theme.title': 'Theme.',
  'overview.how.theme': 'The switch in the top bar sets light, dark or follow the device; every page follows.',
  'overview.how.navigation.title': 'Navigation.',
  'overview.how.navigation': 'The menu lists every section; a root section is one page, its items scroll to its parts, and opening one folds the one that was open. ← → step through them; each page ends with previous and next.',
  'overview.how.presentation.title': 'Presentation.',
  'overview.how.presentation': 'Press P, or add <code>?present=1</code> to the address: the page alone, larger. Escape leaves it.',
  'overview.how.selected.title': 'Selected and alternative.',
  'overview.how.selected': 'Where several variants are shown, the one chosen carries a <span class="tag tag--selected">Selected</span> mark; the Decisions page says why.',
  'overview.how.sample.title': 'Sample data.',
  'overview.how.sample': 'Names and figures are invented for a fictional company; see <code>sample.mjs</code>.',
  'flows.list.title': 'The flows',
  'flows.list.desc': 'Sign-in first, then the flows of the product, in the order they are met.',

  // ── Navigation: nav.<page id>, nav.<page id>.desc, nav.<page id>.<section id>, nav.band.<id>, and a
  //    child page under its root: nav.<root id>.<child id> (a flow: nav.flows.<flow id>) ──
  // Written by the scaffold from pages.mjs; keep them in step with it.
{{NAV_KEYS}}
};
