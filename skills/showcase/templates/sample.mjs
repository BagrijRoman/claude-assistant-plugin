// The sample world every page draws from: one fictional company, a few people with the product's
// roles, and the data of the domain. Every generator under tools/ imports this file, so a name on
// the sign-in screen, in a table and in an email is the same name, and the story the site tells is
// one story. Nothing here is real; the company and the people are invented for the showcase.
//
// Fill it in the Intake phase from the documentation (the actors of the brief become the cast),
// before any screen is drawn; change it here, never on a page.

export const COMPANY = {
  name: '{{SAMPLE_COMPANY}}',
  short: '{{SAMPLE_COMPANY_SHORT}}',
  domain: '{{sample-company}}.example',
  // The place the company is in, for addresses, time zones and the currency of the samples
  locale: { country: '', city: '', currency: '', timeZone: '' },
};

// One person per role of the product, as the brief names the roles. `initials` draw the avatar.
export const PEOPLE = {
  // admin: { name: 'Dana Kovalenko', role: 'Administrator', initials: 'DK', email: 'dana@…' },
};

// The things of the domain the screens show: a handful of each, enough for a table with a filled
// state and a chart with a shape. Names, not ids; the generators number them.
export const DATA = {
  // facilities: [{ name: 'North plant', city: 'Lviv' }, …],
};

// The dates the samples use, so a "today" is the same on every screen
export const WHEN = {
  today: '{{YYYY-MM-DD}}',
};
