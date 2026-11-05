# Illustrations — what to draw

The catalog a plan starts from: the states every product has, the scenes and onboarding moments
most products need, the letters most products send, and a reserve for later. A plan takes from it
what the product has, adds what the documentation names, and proposes what the product's situations
suggest — each proposal marked *proposed* so the operator says yes or no. Nothing is drawn because
the catalog "has it": every picture names where it is used.

The id is the file's name and the symbol's (`ill-<id>`); the words are a starting point, to be
rewritten in the product's own terms and voice.

## States

| Group | Id | When | Words (heading · message · action) | The picture and its gesture |
|-------|----|------|-------------------------------------|-----------------------------|
| Empty | `empty` | a list, a board, a table before its first item | Nothing here yet · Add the first … to start. · Add … | the product's container (a tray, a shelf, a folder) open and empty; its lid settles, a leaf drifts in |
| Empty | `empty-filtered` | a list with items, none matching the filter | Nothing matches · Change or clear the filters. · Clear filters | a loupe over a few faded rows; the loupe drifts and pauses |
| Empty | `search-start` | a search before anything is typed | Search … · Type a name, an id or a date. · — | the loupe at rest beside the field, a glint |
| Empty | `no-notifications` | the bell with nothing in it | You are up to date · New activity will show here. · — | a bell at rest, one slow sway |
| Empty | `trash-empty` | the bin or archive with nothing in it | Nothing archived · Archived … appear here for 30 days. · — | the bin with its lid closed; the lid taps once |
| Nothing found | `not-found-item` | a link to an item that no longer exists | This … is gone · It was deleted or moved. · Back to the list | an outline where the thing stood, dust settles |
| Errors | `error` | a page or a panel that did not load | Something went wrong · We could not load this. Try again. · Try again | a plug out of its socket; it nudges toward the socket |
| Errors | `error-save` | a form that did not save | Not saved · Your changes are kept here; check the connection and try again. · Try again | a sheet with a folded corner, a caution mark; the mark blinks once |
| Errors | `server` | the service is down (500) | We are fixing it · The service is back in a few minutes. · Check status | the product's engine with one part out; a spark |
| Errors | `maintenance` | planned maintenance | Back soon · Scheduled work until 06:00. · — | tools laid out neatly, a wrench turns once |
| Errors | `timeout` | a request that took too long | Taking longer than usual · Wait a moment, or try again. · Try again | sand running in a glass; it runs (loops while waiting) |
| Errors | `too-many` | rate limited (429) | Slow down a little · Too many requests; try again in a minute. · — | a queue of parcels, the first one waits; a tap of the foot |
| Errors | `unsupported-file` | a file the product cannot take | We cannot read this file · Use a CSV or XLSX up to 20 MB. · Choose another file | a file with a question on its face; it tilts |
| Errors | `file-too-large` | a file over the limit | This file is too big · Up to 20 MB; split it or compress it. · Choose another file | a file that will not fit its slot; it tries once |
| Access | `no-access` | a door closed to a role (403) | No access · Ask an administrator for the … role. · Request access | a door with a closed lock; the lock gives one small rattle |
| Access | `session-ended` | the session expired | Signed out · For your safety the session ended. Sign in again. · Sign in | a key on a hook, a clock; the key swings once |
| Access | `locked` | an entity locked (a period closed, a record approved) | Locked · This period is closed; changes need a reopen. · Request a reopen | the product's record under a seal; the seal presses down |
| Access | `plan-limit` | a plan's limit reached | You have reached the limit · Your plan holds 5 sites; upgrade for more. · See plans | a shelf full to the edge, one more item waits; it hovers |
| Access | `payment-due` | payment required | Payment needed · Update the card to keep the account open. · Update payment | a card with a corner lifted; it settles |
| Connection | `offline` | no connection (when the product works offline) | You are offline · Changes are kept and sent when you are back. · — | a signal mast with no waves; a wave appears and fades (loops) |
| Connection | `reconnecting` | the connection lost, retrying | Reconnecting… · Hold on, we are getting you back. · — | two plugs reaching each other; they almost touch (loops) |
| Connection | `pending-sync` | changes waiting to be sent | 3 changes waiting · They are sent when you are back online. · — | parcels on a conveyor, stopped; one shifts |
| Done | `done` | an action completed | Done · The report was sent to 4 people. · Back to … | the product's result with a check; the check draws itself |
| Done | `sent` | something sent | Sent · They will receive it in a minute. · — | an envelope leaving on its path |
| Done | `all-clear` | nothing left to do | All clear · Nothing needs your attention. · — | a clear desk, a cup; steam rises once |
| Pages | `not-found` | the 404 page | Page not found · The address may be wrong, or the page moved. · Go home | a scene from the product's world with the 404 worked into it, one moving detail |
| Pages | `coming-soon` | a module planned for later | Coming soon · … arrives in the next release. · Tell me when | a crate half unpacked; the lid lifts |
| Pages | `beta` | a feature in beta | In beta · It works; some edges are rough. Tell us what you find. · Send feedback | the product's thing with a label; the label waves |
| Pages | `update-available` | a new version | A new version is ready · Reload to get the latest. · Reload | a parcel arriving; it lands |
| Pages | `goodbye` | an account deleted, a subscription ended | Your account is closed · Your data is deleted in 30 days. · — | a door closing softly; it closes |
| Pages | `browser-unsupported` | an old browser | This browser is not supported · Use a current Chrome, Firefox, Safari or Edge. · — | a window with a crack; the crack appears |
| Pages | `loading-companion` | beside a skeleton or a loader on a long wait | Loading your … · This may take a minute. · — | the product's thing being assembled; parts arrive (loops) |

The product's own states come from the documentation: every situation a screen names (a period
not yet reported, a factor missing, an import with errors, a target met, an approval waiting) is a
state with a picture, and goes under the group it belongs to.

## Scenes

A scene is named after the place it will sit, from the reading's *The world*: its places, objects,
moments and instruments.

| Id | Where | What it shows |
|----|-------|---------------|
| `sign-in` | the panel beside the sign-in form | the product's world at rest, one slow motion (smoke thinning over a plant, a meter turning, figures rising into a report) |
| `hero` | the home or landing page's first screen | the product's promise in one picture: the thing, the result, the people around it as shapes, never faces |
| `announcement` | a release note, a banner | something new arriving into the world of the product |
| `not-found-scene` | the 404 page | a place in the product's world with the 404 worked in as an object (a sign, a gate, a tag) |
| `letter-band` | the band of a letter with no picture of its own | the world of the product, wide, calm |
| `first-setup` · `import` · `approval` · `report-ready` · `target-reached` | the moments of the product's loop | each moment as an object and a result: a box opening, files pouring into a ledger, a stamp, a bound report, a flag on a bar |

## Onboarding

| Id | Screen | Words (heading · message · action) |
|----|--------|-------------------------------------|
| `welcome` | the first screen after sign-up | Welcome to … · Let us set up your first … in three steps. · Start |
| `first-step` | the first thing to do | Add your first … · Everything else builds on it. · Add … |
| `setup-<step>` | one per step of the product's setup (from the documentation's setup flow) | the step's name · what it needs · Continue |
| `invite-team` | inviting colleagues | Bring your team · Invite the people who enter and review data. · Invite |
| `empty-workspace` | the workspace before any data | Your workspace is ready · Import data or add it by hand. · Import |
| `tour` | the guided tour's opener | A two-minute tour · See where things are. · Take the tour / Skip |
| `first-success` | the first result achieved | Your first … is ready · Here is what it says. · See it |

## Letters

Each letter: its moment, subject, heading, message, action, detail and the picture's idea.

**Common letters** — every product sends them:

| Id | Moment | Subject · heading · action | Picture |
|----|--------|-----------------------------|---------|
| `invitation` | an administrator invites someone | … invited you to … · You are invited · Accept the invitation | a door opening onto the product's world |
| `verification` | a code to confirm the address or a sign-in | Your … code · Confirm it is you · (the code as the detail) | a key with a tag, the tag turns |
| `password-reset` | a reset requested | Reset your password · Choose a new password · Reset password | a key being cut, the last tooth appears |
| `welcome` | the account is ready | Welcome to … · You are in · Open … | the hero scene, calm |
| `digest` | the weekly summary | Your week at … · This week · See the details | the week's figures rising into a small report |
| `security-alert` | a sign-in from a new device, a password changed | New sign-in to your account · Was this you? · Secure my account | a shield, a glint runs its edge |

**Beyond the common** — proposed unless the documentation names them:

| Id | Moment | Subject · heading · action | Picture |
|----|--------|-----------------------------|---------|
| `receipt` | a payment taken | Your receipt from … · Thank you · Download the receipt | a receipt printing, the last line prints |
| `trial-ending` | three days before a trial ends | Your trial ends on … · Three days left · Choose a plan | sand in a glass, nearly through |
| `mention` | someone mentions or assigns the reader | … mentioned you in … · … needs you · Open it | a speech bubble with a pin |
| `reminder` | something due (a period to close, a review to finish) | … is due on … · A reminder · Finish it | a calendar page with a ring |
| `export-ready` | a long export is done | Your export is ready · Download it within 7 days · Download | a bound file, the ribbon ties |
| `new-device` | a sign-in from a new device | New device signed in · Was this you? · Review devices | two devices, a line between them lights |
| `goodbye` | an account deleted | Your account is closed · Goodbye · — | a door closing softly |

**The product's own** — from its flows and notifications: who sends what to whom and when (a
submission received, a review requested, a period closed, a report published, an import with
errors, a target met). Each named after the moment.

## Reserve

Pictures for situations the product will meet later, each with when:

| Id | When |
|----|------|
| `mobile-coming` | the app not yet on a surface |
| `api-key` | developer access, keys and tokens |
| `integration` | a connection to another system set up or broken |
| `data-export` | taking the data out |
| `two-factor` | a second step at sign-in |
| `holiday` | a seasonal greeting on the home screen |
| `big-number` | a milestone (the 1,000th record) |
| `survey` | a feedback request |
| `archive` | old data moved to cold storage |
| `migration` | moving from another product |
