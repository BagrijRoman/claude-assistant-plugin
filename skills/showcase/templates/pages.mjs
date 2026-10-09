// The pages of the showcase, in menu order. This list is the one source for the menu, the
// breadcrumbs, the catalog on the overview and the previous / next links: build.mjs writes all four
// into every page as static markup. Run `node build.mjs` after changing it (open.mjs runs it too).
//
// Shape: a band is a label in the menu that does not fold. A page under it is one root section: one
// long HTML page; its `sections` are the anchors the menu lists under it, each an element of the
// page with that id (the menu marks the one on screen as the page scrolls). Flows is the exception:
// its `children` are pages of their own, one per flow. An entry without a path is planned: listed
// in the menu and the catalog, not a link. Every id is also the i18n key: nav.<page id>,
// nav.<page id>.<section id>, nav.band.<band id>.
//
// The order is the order of attention for the customer — identity first, then the product in use,
// then the details, then how it is built. It is not the order the sections are made in.
export const BANDS = [
  {
    id: 'product',
    title: 'Product',
    desc: 'The product as the customer will meet it: its mark, its first screen, its shell, its flows.',
    pages: [
      { id: 'overview', path: 'index.html', title: 'Overview', desc: 'Every page of this site, where its content comes from, and how to read it.' },
      { id: 'principles', path: 'principles/index.html', title: 'Principles', desc: 'What the design holds to, each with an example of doing it and of not doing it.', sections: [] },
      {
        id: 'logo', path: 'logo/index.html', title: 'Logo', desc: 'Marks for the product, each from an idea in it, at every size it will be used at.',
        sections: [
          { id: 'sideBySide', title: 'Side by side', desc: 'Every mark at one size, on light and on dark, then at the size of the menu and of a browser tab.' },
          { id: 'sizes', title: 'Sizes and spacing', desc: 'The mark at 16, 24, 32, 64 and 128 px; its clear space; what it must never be put on.' },
        ],
      },
      { id: 'signIn', path: 'signIn/index.html', title: 'Sign-in layouts', desc: 'The first screen a user sees: the form, and an animated panel about the product beside it. Several layouts; one is selected.', sections: [] },
      { id: 'appLayout', path: 'appLayout/index.html', title: 'App layout', desc: 'The shell every screen lives in: a sidebar with grouped menus that folds, a top bar, the page under them. Several layouts; one is selected.', sections: [] },
      { id: 'screens', path: 'screens/index.html', title: 'Key screens', desc: 'The main screens of the product on the devices it is used on.', sections: [] },
      { id: 'flows', path: 'flows/index.html', title: 'Flows', desc: 'The product in use, step by step: signing in first, then the flows of the product itself. Each flow is a page of its own with a step player.', children: [] },
      {
        id: 'emails', path: 'emails/index.html', title: 'Emails', desc: 'The letters the product sends, as a mail client shows them: the common ones, and the ones the product’s own flows need.',
        sections: [
          { id: 'general', title: 'Common letters', desc: 'Invitation, verification code, password reset, welcome, digest, security alert.' },
          { id: 'product', title: 'The product’s letters', desc: 'Letters its own flows send.' },
        ],
      },
    ],
  },
  {
    id: 'design',
    title: 'Design',
    desc: 'The pieces every screen is made of, and the rules they follow.',
    pages: [
      {
        id: 'illustrations', path: 'illustrations/index.html', title: 'Illustrations', desc: 'Pictures in the product’s own style and colors for every situation that has no data to show, some of them moving; with a reserve for later.',
        sections: [
          { id: 'sideBySide', title: 'Side by side', desc: 'Every picture at one size, with the situations it serves.' },
          { id: 'inPlace', title: 'In place', desc: 'Each picture where it sits in the product.' },
        ],
      },
      {
        id: 'states', path: 'states/index.html', title: 'States', desc: 'What a screen shows when it has nothing, is loading, failed, is closed to a role, is offline or has just succeeded — the picture, the words and the action.',
        sections: [
          { id: 'empty', title: 'Empty', desc: 'Nothing yet, and nothing matching a search or a filter.' },
          { id: 'loading', title: 'Loading', desc: 'Skeletons, spinners and when to use which.' },
          { id: 'error', title: 'Error', desc: 'A page that did not load; a form that did not save.' },
          { id: 'access', title: 'Access', desc: 'A door closed to a role; a session that ended.' },
          { id: 'offline', title: 'Offline', desc: 'No connection; changes waiting to sync.' },
          { id: 'success', title: 'Done', desc: 'A thing completed.' },
        ],
      },
      { id: 'notFound', path: 'notFound/index.html', title: 'Not found page', desc: 'The page an address no route matches lands on: several versions, each with a moving picture in the product’s style.', sections: [] },
      { id: 'charts', title: 'Charts', desc: 'The product’s figures drawn in its palette, in both themes.' },
      {
        id: 'components', path: 'components/index.html', title: 'Components', desc: 'Every component on one page, one section each: what it is for, its variations and states, its sizes. The standard set, the product’s own, and a reserve for later.',
        sections: [
          { id: 'button', title: 'Button', desc: 'Variants and sizes; hover, focus, disabled and loading; with an icon.' },
          { id: 'textField', title: 'Text field', desc: 'Label, hint and error; disabled and read-only; password; the text area.' },
          { id: 'select', title: 'Select', desc: 'A labeled field and a compact filter; placeholder, chosen value, disabled; the list that opens.' },
          { id: 'choice', title: 'Checkbox, radio, switch', desc: 'One or many of a list, one of a few, on or off.' },
          { id: 'datePicker', title: 'Date picker', desc: 'A date and a range; the calendar and its keyboard.' },
          { id: 'badge', title: 'Badge and status', desc: 'Neutral badges and the status tones with their icons.' },
          { id: 'avatar', title: 'Avatar', desc: 'Initials and pictures, sizes, a stack of them.' },
          { id: 'card', title: 'Card', desc: 'Title only, with actions, with an edge-to-edge table.' },
          { id: 'tile', title: 'Stat tile', desc: 'A figure with its unit and a change against the previous period; loading.' },
          { id: 'table', title: 'Data table', desc: 'The list table and its four states: loading, error, empty, filled.' },
          { id: 'pagination', title: 'Pagination', desc: 'First, middle and last page.' },
          { id: 'tabs', title: 'Tabs', desc: 'Active, inactive and hover.' },
          { id: 'breadcrumbs', title: 'Breadcrumbs', desc: 'Where the user is; a long path that folds.' },
          { id: 'menu', title: 'Dropdown menu', desc: 'Actions on a thing; a destructive one set apart.' },
          { id: 'tooltip', title: 'Tooltip and popover', desc: 'A hint on hover; a small panel on click.' },
          { id: 'progress', title: 'Progress and meter', desc: 'How far along; how full.' },
          { id: 'feedback', title: 'Alert and toast', desc: 'Inline alerts in four tones; toasts that confirm or report.' },
          { id: 'modal', title: 'Modal', desc: 'A dialog with a title, a body and two actions; the confirm-before-leaving case.' },
          { id: 'drawer', title: 'Drawer', desc: 'A panel from the side for details and forms.' },
          { id: 'emptyState', title: 'Empty state', desc: 'A picture, a sentence and the one thing to do next.' },
          { id: 'fileUpload', title: 'File upload', desc: 'Drop zone, progress, the file list, an error.' },
          { id: 'stepper', title: 'Stepper', desc: 'Steps done, current and to come.' },
          { id: 'appShell', title: 'App shell', desc: 'The sidebar, the top bar and the page, as components.' },
        ],
      },
      {
        id: 'icons', path: 'icons/index.html', title: 'Icons', desc: 'The icon set on its grid, with the names used in code, at its sizes, in both themes.',
        sections: [
          { id: 'set', title: 'The set', desc: 'Every icon with its name.' },
          { id: 'sizes', title: 'Sizes and rules', desc: 'The grid, the stroke, where an icon stands alone and where it needs a label.' },
        ],
      },
      {
        id: 'foundations', path: 'foundations/index.html', title: 'Foundations', desc: 'The color scheme and every token the product is drawn with: colors, type, spacing, radius, shadows, motion, sizes. Values are read from tokens.css in the browser.',
        sections: [
          { id: 'scheme', title: 'Color scheme', desc: 'The brand color and its companions; why these.' },
          { id: 'colors', title: 'Colors', desc: 'Surfaces, text, borders, brand, feedback; light and dark; contrast computed from the tokens.' },
          { id: 'typography', title: 'Typography', desc: 'The typefaces and the text styles with the classes that write them.' },
          { id: 'spacing', title: 'Spacing', desc: 'The scale and how it is used.' },
          { id: 'shape', title: 'Radius and shadows', desc: 'The radii and the elevations.' },
          { id: 'motion', title: 'Motion', desc: 'Durations and easings, replayed on demand; what never moves.' },
          { id: 'sizes', title: 'Sizes', desc: 'Controls, the shell, the form width.' },
        ],
      },
      {
        id: 'microcopy', path: 'microcopy/index.html', title: 'Microcopy and tone', desc: 'How the product speaks: its voice, and the patterns for buttons, errors, empty states, confirmations and notifications, in every language of the interface. The source of every string on this site.',
        sections: [
          { id: 'voice', title: 'Voice', desc: 'Who is speaking and how.' },
          { id: 'buttons', title: 'Buttons and links', desc: 'Verbs, length, capitalisation.' },
          { id: 'errors', title: 'Errors', desc: 'What went wrong, what to do; never whose fault.' },
          { id: 'emptyStates', title: 'Empty states', desc: 'What this is for and the first thing to do.' },
          { id: 'confirmations', title: 'Confirmations', desc: 'Before a destructive action; after a success.' },
          { id: 'notifications', title: 'Notifications and emails', desc: 'Subject lines, the first sentence, the one action.' },
          { id: 'languages', title: 'Languages', desc: 'The same message in every interface language, side by side.' },
        ],
      },
    ],
  },
  {
    id: 'project',
    title: 'Project',
    desc: 'How the product is built, what was decided and what comes next.',
    pages: [
      {
        id: 'technology', path: 'technology/index.html', title: 'Technology', desc: 'The architecture as one picture, and the technologies chosen with what each is for.',
        sections: [
          { id: 'architecture', title: 'Architecture', desc: 'The parts of the system and how they talk.' },
          { id: 'stack', title: 'The stack', desc: 'Every technology with its mark and what it is for.' },
          { id: 'request', title: 'One request', desc: 'The path of one action through the system.' },
        ],
      },
      { id: 'decisions', path: 'decisions/index.html', title: 'Decisions', desc: 'Every choice made on this site — languages, stack, color scheme, logo, layouts — with the alternatives beside it and the reason.', sections: [] },
      { id: 'changelog', path: 'changelog/index.html', title: 'Changelog', desc: 'What changed on this site between showings, by date.', sections: [] },
      {
        id: 'next', path: 'next/index.html', title: 'Next steps', desc: 'What this site will get next, in order, and ideas for the product beyond it.',
        sections: [
          { id: 'queue', title: 'Queue', desc: 'What is next on this site, in order.' },
          { id: 'ideas', title: 'Ideas', desc: 'Proposals for the product, each with what it is and why.' },
        ],
      },
    ],
  },
];
