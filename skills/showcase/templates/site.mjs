// The showcase's settings: what build.mjs and open.mjs need to know about this site.
// Written by the scaffold; edit by hand when the project's name, languages or fonts change, then
// run `node build.mjs` (or `node open.mjs`, which runs it first).
export const SITE = {
  // Shown in the brand tile at the top of the menu and in every window title
  name: '{{NAME}}',
  // The brand tile's mark: a letter until the Logo section has a selected mark, then its inline SVG
  mark: '{{MARK}}',
  port: {{PORT}},

  // The interface languages. The pages are written in the default one; every other language has a
  // dictionary in i18n/<lang>.js and a button in the top bar.
  languages: {{LANGUAGES}},
  defaultLanguage: '{{DEFAULT_LANGUAGE}}',

  // Web fonts, loaded in <head> of every page. Keep a local copy under assets/fonts/ as well when
  // the site must work offline; tokens.css names the families.
  fonts: {
    links: ['https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'],
  },

  // Picks the operator made among variants, by section: { logo: 'valley', signIn: 'liveApp',
  // appLayout: 'rail', notFound: 'crane' }. The Decisions page and the Selected marks follow this.
  selected: {},
};
