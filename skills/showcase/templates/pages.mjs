// The pages of the showcase, in menu order. This list is the one source for the menu, the
// breadcrumbs, the catalog on the Product page and the previous / next links: build.mjs writes all
// four into every page as static markup. Run `node build.mjs` after changing it (open.mjs runs it too).
//
// Shape: a band is a group of root sections. The menu shows no label for it, only a gap before the
// next group; the catalog on the Product page uses its title and description as headings. A root
// section folds in the menu and shows two kinds of items under it: its `sections`, the anchors of its
// own page (the menu marks the one on screen as the page scrolls; Components, Email templates and Charts have
// one per item of a list that grows), and its `children`, pages of their own one level down (Design's pages,
// the stack under Product, each flow under Flows). A child may have `sections` of its own; they are
// anchors on its page, not menu items. An entry without a path is planned: listed in the menu and the
// catalog, not a link. Every id is also the i18n key: nav.<page>, nav.<page>.<section>,
// nav.<root>.<child>, nav.<root>.<child>.<section>, nav.band.<band>.
//
// The order is the order of attention for the customer — the product, how it is built, what keeps it
// safe, its flows step by step and its screens first (the flows are the weightiest part, the screens
// follow them); then its design, its pictures, its layouts, its email templates, its components and its charts;
// then the project. It is not the order the sections are made in. The first page is the home page:
// the Product page, index.html.
export const BANDS = [
  {
    id: 'product',
    title: 'Product',
    desc: 'What the product is, who it is for, what it is built with, how its parts fit together, what keeps its data safe — and the product in use: its flows step by step, then its screens.',
    pages: [
      {
        id: 'product', path: 'index.html', title: 'Product', desc: 'The product in a few minutes: what it is and for whom, the roles, the modules, how it works, the sample company — and how to read this site.',
        sections: [
          { id: 'about', title: 'What it is', desc: 'The product in one paragraph: what it does, for whom, the problem it solves.' },
          { id: 'roles', title: 'Who uses it', desc: 'Every role, what it does in the product and where.' },
          { id: 'modules', title: 'Modules', desc: 'The parts of the product, each in a line, and which come first.' },
          { id: 'loop', title: 'How it works', desc: 'The product’s main loop, drawn step by step.' },
          { id: 'sample', title: 'Sample company', desc: 'The fictional company and people every sample on this site uses.' },
          { id: 'site', title: 'About this site', desc: 'Every page of this site, where its content comes from, and how to read it.' },
        ],
        children: [
          {
            id: 'stack', path: 'product/stack.html', title: 'Technology stack', desc: 'The technologies the product is built with, by layer: each with its official mark, one line of what it is for, and a link to its site.',
            sections: [
              { id: 'client', title: 'Clients', desc: 'What the user’s browser or device runs.' },
              { id: 'server', title: 'Server', desc: 'The backend and its frameworks.' },
              { id: 'data', title: 'Data and files', desc: 'Where data and files are kept.' },
              { id: 'services', title: 'Services', desc: 'Mail, jobs, AI and the other services the product talks to.' },
              { id: 'infrastructure', title: 'Hosting and delivery', desc: 'Where it runs and how it gets there.' },
              { id: 'quality', title: 'Quality', desc: 'Tests, linting and the checks every change passes.' },
            ],
          },
        ],
      },
      {
        id: 'architecture', path: 'architecture/index.html', title: 'Architecture', desc: 'How the product is put together, drawn for the customer: the system in its world, its parts, its modules, how data moves, where it runs.',
        sections: [
          { id: 'context', title: 'The system in its world', desc: 'The product, the people who use it and the systems around it.' },
          { id: 'containers', title: 'Its parts', desc: 'The applications and stores the product is made of, and how they talk.' },
          { id: 'modules', title: 'Modules', desc: 'The modules of the product and what each depends on.' },
          { id: 'dataFlow', title: 'How data moves', desc: 'From the first entry to the reported figure.' },
          { id: 'deployment', title: 'Where it runs', desc: 'The installation: hosting, regions, what runs where.' },
          { id: 'request', title: 'One request', desc: 'The path of one user action through the system, numbered.' },
        ],
      },
      {
        // In the customer's words, not the team's: every claim from the documentation, done or planned
        id: 'security', path: 'security/index.html', title: 'Security', desc: 'What keeps the customer’s data safe, in the customer’s words: where it lives and who can reach it, how it is kept from loss and from attack, what stays on record — and what is not promised yet.',
        sections: [
          { id: 'data', title: 'Your data', desc: 'Where it lives, who can reach it, encrypted on the way and at rest, kept how long, taken out how.' },
          { id: 'access', title: 'Who gets in', desc: 'Accounts by invitation, roles and their scope, passwords, the second step, sessions, the letters that warn.' },
          { id: 'loss', title: 'Nothing is lost', desc: 'Backups and restore, versioned files, what is never deleted once reported or locked.' },
          { id: 'attacks', title: 'Against attacks', desc: 'Pauses and limits, what every input is checked for, dependencies kept current, who watches.' },
          { id: 'trail', title: 'Every change on record', desc: 'Who did what and when, kept and unchangeable, open to an auditor.' },
          { id: 'claims', title: 'What is promised, and what is not yet', desc: 'Certifications and checks held or not, what is planned, whom to ask.' },
        ],
      },
      // Right after Security: the flows are the weightiest part for the customer — the product working, step
      // by step — so they stand in the first group, in reach from the home page, not after the design
      { id: 'flows', path: 'flows/index.html', title: 'Flows', desc: 'The product in use, step by step: signing in first, then the flows of the product itself. Each flow is a page of its own with a step player.', children: [] },
      // Right after Flows: the screens are the product in use too, one click on from the flows
      {
        id: 'screens', path: 'screens/index.html', title: 'Screens', desc: 'The screens of the product in its picked shell.',
        children: [
          { id: 'key', path: 'screens/key.html', title: 'Key screens', desc: 'The main screens of the product on the devices it is used on.', sections: [] },
        ],
      },
    ],
  },
  {
    id: 'design',
    title: 'Design',
    desc: 'The design system: the basics every screen is drawn with, the pictures, the layouts, the email templates, the components and the charts.',
    pages: [
      {
        id: 'design', path: 'design/index.html', title: 'Design', desc: 'The basics of the design — principles, colors, type, spacing, shape, motion, the logo and its loaders, icons, words and states — each on a page of its own.',
        children: [
          { id: 'principles', path: 'design/principles.html', title: 'Principles', desc: 'What the design holds to, each with an example of doing it and of not doing it.', sections: [] },
          {
            id: 'colors', path: 'design/colors.html', title: 'Colors', desc: 'The color scheme and every color token, light and dark, with contrast computed from the tokens.',
            sections: [
              { id: 'scheme', title: 'Color scheme', desc: 'The brand color and its companions; why these.' },
              { id: 'palette', title: 'Palette', desc: 'Surfaces, text, borders, brand, feedback; light and dark.' },
              { id: 'categories', title: 'Categories', desc: 'The colors that tell the domain’s categories apart.' },
              { id: 'contrast', title: 'Contrast', desc: 'Every text pair, both themes, against WCAG AA.' },
            ],
          },
          {
            id: 'typography', path: 'design/typography.html', title: 'Typography', desc: 'The typefaces and the text styles with the classes that write them.',
            sections: [
              { id: 'typefaces', title: 'Typefaces', desc: 'The families, their weights and the scripts they cover.' },
              { id: 'styles', title: 'Text styles', desc: 'Every style with its size, line height, weight and class.' },
            ],
          },
          {
            id: 'spacing', path: 'design/spacing.html', title: 'Spacing and layout', desc: 'The spacing scale, the grid, the breakpoints and the sizes of controls and the shell.',
            sections: [
              { id: 'scale', title: 'Spacing scale', desc: 'The scale and where each step is used.' },
              { id: 'layout', title: 'Grid and breakpoints', desc: 'Columns, gutters, the widths the layout changes at.' },
              { id: 'sizes', title: 'Sizes', desc: 'Controls, the shell, the form width.' },
            ],
          },
          {
            id: 'shape', path: 'design/shape.html', title: 'Radius and shadows', desc: 'The radii and the elevations.',
            sections: [
              { id: 'radius', title: 'Radius', desc: 'The radii on controls, cards and pills.' },
              { id: 'shadows', title: 'Shadows', desc: 'The elevations and where each is used.' },
            ],
          },
          {
            id: 'motion', path: 'design/motion.html', title: 'Motion', desc: 'Durations and easings, replayed on demand; what never moves.',
            sections: [
              { id: 'timing', title: 'Durations and easings', desc: 'Each replayed on demand.' },
              { id: 'reduced', title: 'Reduced motion', desc: 'What stops, and what the still version shows.' },
            ],
          },
          {
            id: 'logo', path: 'design/logo.html', title: 'Logo', desc: 'Marks for the product, each from an idea in it, at every size it will be used at.',
            sections: [
              { id: 'sideBySide', title: 'Side by side', desc: 'Every mark at one size, on light and on dark, then at the size of the menu and of a browser tab.' },
              { id: 'sizes', title: 'Sizes and spacing', desc: 'The mark at 16, 24, 32, 64 and 128 px; its clear space; what it must never be put on.' },
            ],
          },
          {
            id: 'loaders', path: 'design/loaders.html', title: 'Loaders', desc: 'The logo set in motion: what the product shows while it waits, in a button, a panel and at start.',
            sections: [
              { id: 'kinds', title: 'While it waits', desc: 'Each loader at 64, 32 and 16 px, and what it is for.' },
              { id: 'progress', title: 'When the share is known', desc: 'The mark that fills as the work goes.' },
              { id: 'inUse', title: 'Where they stand', desc: 'A button, a panel, a long wait, the start of the application.' },
              { id: 'rules', title: 'Rules', desc: 'When a loader shows, the words beside it, reduced motion.' },
            ],
          },
          {
            id: 'icons', path: 'design/icons.html', title: 'Icons', desc: 'Two groups only — the base icons the components and screens use, and the icons of the product’s domain — on their grid, with the names used in code, in both themes.',
            sections: [
              { id: 'base', title: 'Base', desc: 'The standard icons the components and screens use, with the library’s names.' },
              { id: 'domain', title: 'From the domain', desc: 'The icons of the product’s own subjects, drawn for it.' },
              { id: 'rules', title: 'Sizes and rules', desc: 'The grid, the stroke, where an icon stands alone and where it needs a label.' },
            ],
          },
          {
            id: 'states', path: 'design/states.html', title: 'States', desc: 'What a screen shows when it has nothing, is loading, failed, is closed to a role, is offline or has just succeeded — the picture, the words and the action.',
            sections: [
              { id: 'empty', title: 'Empty', desc: 'Nothing yet, and nothing matching a search or a filter.' },
              { id: 'loading', title: 'Loading', desc: 'Skeletons, spinners and when to use which.' },
              { id: 'error', title: 'Error', desc: 'A page that did not load; a form that did not save.' },
              { id: 'access', title: 'Access', desc: 'A door closed to a role; a session that ended.' },
              { id: 'offline', title: 'Offline', desc: 'No connection; changes waiting to sync.' },
              { id: 'success', title: 'Done', desc: 'A thing completed.' },
            ],
          },
        ],
      },
      {
        id: 'illustrations', path: 'illustrations/index.html', title: 'Illustrations', desc: 'Pictures in the product’s own style and colors: for every state a screen can be in, and for the cases of the product’s domain — some of them moving, with a reserve for later.',
        sections: [
          { id: 'states', title: 'For states', desc: 'Empty, error, no access, locked, offline, done — a picture for each.' },
          { id: 'domain', title: 'From the domain', desc: 'Scenes from the product’s world, for onboarding, panels, letters and announcements.' },
          { id: 'inPlace', title: 'In place', desc: 'Each picture where it sits in the product.' },
          { id: 'reserve', title: 'Reserve', desc: 'Pictures ready for situations the product will meet later.' },
        ],
      },
      {
        id: 'layouts', path: 'layouts/index.html', title: 'Layouts', desc: 'The frames every screen sits in — the sign-in, the application’s shell, the page a wrong address lands on — each in several variants with the product’s pictures in motion. One of each is selected.',
        children: [
          { id: 'signIn', path: 'layouts/signIn.html', title: 'Auth layout', desc: 'The screens before the product — sign-in, invitation, forgotten password: the form beside an animated scene from the product’s world. Several variants; one is selected.', sections: [] },
          { id: 'appLayout', path: 'layouts/appLayout.html', title: 'App layout', desc: 'The shell every screen lives in: the sidebar that folds, the top bar, the page — with the product’s pictures where a user meets them first. Several variants; one is selected.', sections: [] },
          { id: 'notFound', path: 'layouts/notFound.html', title: 'Not found page', desc: 'The page an address no route matches lands on: several versions, each with a moving picture in the product’s style.', sections: [] },
        ],
      },
      {
        // Right after Layouts, named Email templates. One page, a section per letter: the Template, then the
        // common letters, then the product’s own — the Email templates step adds a section for each letter it
        // approves, so the menu grows with the list
        id: 'emails', path: 'emails/index.html', title: 'Email templates', desc: 'The letters the product sends, as a mail client shows them: the one template, the common letters, and the ones the product’s own flows need.',
        sections: [
          { id: 'template', title: 'Template', desc: 'The one layout every letter uses, its parts named, and what a mail client changes.' },
          { id: 'invitation', title: 'Invitation', desc: 'Asks a person to join: who invited them, and the one button to accept.' },
          { id: 'verificationCode', title: 'Verification code', desc: 'The code that confirms an address or a sign-in, and how long it lasts.' },
          { id: 'passwordReset', title: 'Password reset', desc: 'The link to choose a new password, and what to do if it was not asked for.' },
          { id: 'welcome', title: 'Welcome', desc: 'The first letter after joining: what to do first.' },
          { id: 'digest', title: 'Digest', desc: 'What happened in a period, in a few lines, with the one thing that needs a look.' },
          { id: 'securityAlert', title: 'Security alert', desc: 'A sign-in from a new device or a changed password, and the way to secure the account.' },
        ],
      },
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
      // Right after Components, a root of its own, and only when the product has figures. Planned (no path)
      // until the Charts step lays it. Its sections are the uses of a chart in the product, each drawn where
      // the product shows it — none until the step's plan is approved, then one per use, as Components and
      // Email templates grow: `{ id, title, desc }` each, and `nav.charts.<use id>` in every dictionary.
      { id: 'charts', title: 'Charts', desc: 'The product’s figures drawn as the product shows them — each use of a chart on its screen or card, in the palette, in both themes.' },
    ],
  },
  {
    id: 'project',
    title: 'Project',
    desc: 'What was decided, what changed, and what comes next.',
    pages: [
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
