// The permission `deny` rules the plugin writes into a project. Built from the same secret-file list the
// secret-files-guard hook uses, so the hard boundary (permissions) and the second line (the hook) agree.
// `skills/setupPermissions/templates/permissions.json` is the generated, human-readable copy of this list; a
// test keeps it in sync.

import { SECRET_FILE_GLOBS } from './secretPaths.mjs';

/** Files that live in the home directory, not the project; permissions need the `~/` form for those. */
const HOME_FILES = ['~/.ssh/**', '~/.aws/credentials', '~/.netrc', '~/.pgpass'];

/** Commands that cannot be undone, or that publish. A human runs these from their own terminal. */
const IRREVERSIBLE_COMMANDS = [
  'git push --force:*',
  'git push -f:*',
  'gh pr merge:*',
  'gh release create:*',
  'npm publish:*',
  'pnpm publish:*',
  'yarn publish:*',
  'eas submit:*',
];

// Prefixes the glob with `./`: relative to the project root, at any depth. (A line comment on purpose: the
// glob's star-slash would end a block comment early.)
const projectGlob = (glob) => `./${glob}`;

export const buildDenyRules = () => {
  const files = [...SECRET_FILE_GLOBS.map(projectGlob), ...HOME_FILES];
  return [
    ...files.map((pattern) => `Read(${pattern})`),
    ...files.map((pattern) => `Edit(${pattern})`),
    ...IRREVERSIBLE_COMMANDS.map((pattern) => `Bash(${pattern})`),
  ];
};
