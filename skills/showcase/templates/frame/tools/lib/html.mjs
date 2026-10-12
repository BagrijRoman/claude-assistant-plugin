// The shell every page of the showcase is written in. Generators under tools/ and the scaffold use
// it, so every page has the same head, the same top bar and the placeholders build.mjs fills: the
// menu (after <body>), the breadcrumbs (data-crumb), the language switch (data-lang-switch), the
// previous / next links (before </main>) and, on the overview, the catalog (data-catalog).
//
// The page is written in the site's default language; a text with a translation carries
// data-i18n="<key>" and the dictionaries in i18n/ hold the other languages.

export const escapeHtml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const attr = (name, value) => (value === undefined || value === null || value === '' ? '' : ` ${name}="${escapeHtml(value)}"`);

// <span data-i18n="key">text</span>
export const t = (key, text, tag = 'span') => `<${tag} data-i18n="${key}">${escapeHtml(text)}</${tag}>`;

/**
 * A whole page.
 * @param {object} page
 * @param {string} page.prefix     "../" once per folder between the page and the site root
 * @param {string} page.lang       the default language of the site
 * @param {string} page.siteName   shown in the window title after the page title
 * @param {string} page.title      the page title (window title and <h1>)
 * @param {string} page.titleKey   i18n key of the title
 * @param {string} [page.overline] small text above the title, e.g. the band
 * @param {string} [page.lead]     one or two sentences under the title (HTML allowed)
 * @param {string} page.body       the page's content: sections, blocks, samples (HTML)
 * @param {string[]} [page.scripts] extra scripts after showcase.js, relative to the site root
 * @param {string} [page.mainClass] extra class on <main>
 */
export function renderPage(page) {
  const prefix = page.prefix ?? '';
  const scripts = ['assets/showcase.js', ...(page.scripts ?? [])]
    .map((src) => `  <script src="${prefix}${src}"></script>`)
    .join('\n');
  const lead = page.lead ? `      ${page.lead}\n` : '';
  const overline = page.overline ? `      <p class="t-label sc-hero__overline">${page.overline}</p>\n` : '';
  return `<!doctype html>
<html lang="${escapeHtml(page.lang ?? 'en')}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.title)} — ${escapeHtml(page.siteName)}</title>
  <link rel="stylesheet" href="${prefix}tokens.css">
  <link rel="stylesheet" href="${prefix}base.css">
  <link rel="stylesheet" href="${prefix}components.css">
  <link rel="stylesheet" href="${prefix}assets/showcase.css">
  <link rel="stylesheet" href="${prefix}assets/site.css">
  <!-- head:start (written by build.mjs) --><!-- head:end -->
</head>
<body>
  <header class="sc-top">
    <button type="button" class="btn btn--secondary btn--sm sc-menu" data-nav-toggle aria-expanded="false" data-i18n="ui.allPages">All pages</button>
    <div class="sc-crumb" data-crumb></div>
    <div class="sc-top__right">
      <div data-lang-switch></div>
      <div class="segmented" role="group" aria-label="Theme">
        <button type="button" class="segmented__item" data-theme-set="light" aria-pressed="false"><svg class="icon" aria-hidden="true"><use href="#i-sun"></use></svg><span data-i18n="ui.theme.light">Light</span></button>
        <button type="button" class="segmented__item" data-theme-set="dark" aria-pressed="false"><svg class="icon" aria-hidden="true"><use href="#i-moon"></use></svg><span data-i18n="ui.theme.dark">Dark</span></button>
        <button type="button" class="segmented__item" data-theme-set="system" aria-pressed="false"><svg class="icon" aria-hidden="true"><use href="#i-monitor"></use></svg><span data-i18n="ui.theme.system">System</span></button>
      </div>
      <button type="button" class="btn btn--ghost btn--sm sc-present" data-present-toggle aria-pressed="false" title="P"><svg class="icon" aria-hidden="true"><use href="#i-eye"></use></svg><span data-i18n="ui.present">Present</span></button>
    </div>
  </header>
  <button type="button" class="btn btn--secondary btn--sm sc-present-exit" data-present-toggle data-i18n="ui.exitPresent">Exit presentation</button>

  <main class="sc-main${page.mainClass ? ` ${escapeHtml(page.mainClass)}` : ''}">
    <section class="sc-hero">
${overline}      <h1 class="t-page-title"${attr('data-i18n', page.titleKey)}>${escapeHtml(page.title)}</h1>
${lead}    </section>

${page.body}
  </main>

${scripts}
</body>
</html>
`;
}

/** A section with a head: <section class="sc-section"> … */
export function section({ id, title, titleKey, desc, descKey, body = '', level = 2 }) {
  const h = `h${level}`;
  const heading = `<${h} class="t-section-title"${attr('data-i18n', titleKey)}>${escapeHtml(title)}</${h}>`;
  const text = desc ? `<p${attr('data-i18n', descKey)}>${desc}</p>` : '';
  return `    <section class="sc-section"${attr('id', id)}>
      <div class="sc-section__head">${heading}${text}</div>
${body}
    </section>
`;
}

/** A block of a page in sections: the menu scrolls to it by id. */
export function block({ id, title, titleKey, lead, leadKey, source, body = '' }) {
  const text = lead ? `        <p${attr('data-i18n', leadKey)}>${lead}</p>\n` : '';
  const from = source ? `        <p class="sc-source">${source}</p>\n` : '';
  return `    <!-- ═══════════ ${escapeHtml(title)} ═══════════ -->
    <article class="sc-block" id="${escapeHtml(id)}">
      <header class="sc-hero">
        <h2 class="t-page-title"${attr('data-i18n', titleKey)}>${escapeHtml(title)}</h2>
${text}${from}      </header>
${body}
    </article>
`;
}

/** A variant inside a block or a section, with its Selected / alternative mark. */
export function variant({ id, title, titleKey, desc, descKey, selected = false, body = '' }) {
  const tag = selected
    ? '<span class="tag tag--selected" data-i18n="ui.selected">Selected</span>'
    : '<span class="tag tag--alternative" data-i18n="ui.alternative">Alternative</span>';
  return `      <section class="sc-section variant" id="${escapeHtml(id)}" data-variant="${escapeHtml(id)}"${selected ? ' data-selected' : ''}>
        <div class="sc-section__head variant__head"><h3 class="t-section-title"${attr('data-i18n', titleKey)}>${escapeHtml(title)}</h3>${tag}</div>
        ${desc ? `<p${attr('data-i18n', descKey)}>${desc}</p>` : ''}
${body}
      </section>
`;
}

/**
 * The flow player: steps in order, each a screen and a note. A step's title is written once, in its
 * head, with its key; the player's bar shows the title of the step on show from there, so it follows
 * the language too. In a screen, what the user acts on in that step carries data-flow-target="1",
 * "2", … in the order of acting — on the component's outer element (the field, the button, the row);
 * the player rings and numbers it, and the note names it with flowMark(1). With targets in any step
 * the bar gets a Hints button that turns the rings off.
 * @param {{ id: string, title: string, titleKey?: string, steps: { title: string, titleKey?: string, screen: string, note?: string, noteKey?: string }[] }} flow
 */
export function flowPlayer(flow) {
  const hinted = flow.steps.some((step) => /\sdata-flow-target\b/.test(step.screen));
  const steps = flow.steps.map((step, index) => `      <li class="flow__step${index === 0 ? ' is-current' : ''}" data-step id="step-${index + 1}" data-title="${escapeHtml(step.title)}">
        <p class="flow__step-head"><strong>${index + 1}</strong> <span class="flow__step-title"${attr('data-i18n', step.titleKey)}>${escapeHtml(step.title)}</span></p>
        <div class="flow__screen">
${step.screen}
        </div>
        ${step.note ? `<p class="flow__note"${attr('data-i18n', step.noteKey)}>${step.note}</p>` : ''}
      </li>`).join('\n');
  return `    <div class="flow" data-flow id="${escapeHtml(flow.id)}">
      <div class="flow__bar">
        <button type="button" class="btn btn--secondary btn--sm" data-flow-prev aria-label="Previous step" data-i18n-attr="aria-label:flow.prev">←</button>
        <span class="flow__counter"><span data-i18n="flow.step">Step</span> <span data-flow-index>1</span> <span data-i18n="flow.of">of</span> <span data-flow-count>${flow.steps.length}</span></span>
        <span class="flow__title" data-flow-step-title></span>
        <span class="flow__end" data-i18n="flow.notDrawn">This screen is not drawn yet</span>
        <button type="button" class="btn btn--secondary btn--sm" data-flow-next aria-label="Next step" data-i18n-attr="aria-label:flow.next">→</button>
        <button type="button" class="btn btn--ghost btn--sm" data-flow-all aria-pressed="false" data-i18n="flow.all">All steps</button>
        <button type="button" class="btn btn--ghost btn--sm" data-flow-full aria-pressed="false" data-i18n="flow.full">Full screen</button>${hinted ? `
        <button type="button" class="btn btn--ghost btn--sm" data-flow-hints aria-pressed="true" data-i18n="flow.hints">Hints</button>` : ''}
      </div>
      <ol class="flow__steps">
${steps}
      </ol>
    </div>
`;
}

/** The number of a step's target in its note — "Types the email ${flowMark(1)}" — as its badge looks. */
export const flowMark = (number) => `<span class="flow__mark">${escapeHtml(number)}</span>`;

/** A screen inside a device frame: phone, tablet or desktop. */
export const device = (kind, screen) =>
  `<div class="device device--${kind}"><div class="device__screen">${screen}</div></div>`;

/** A letter as a mail client shows it. */
export const mail = ({ from, to, subject, body }) =>
  `<div class="mail"><div class="mail__meta"><strong>${escapeHtml(subject)}</strong><br>${escapeHtml(from)} → ${escapeHtml(to)}</div>${body}</div>`;
