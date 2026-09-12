// The one list of files that hold secrets. The secret-files-guard hook matches against it, and the
// setup-permissions template is generated from it, so the hook and the permission deny list never disagree.
// Globs use the gitignore shape Claude Code permissions understand: a leading double star for any directory,
// a single star within a name.

/** Files the agent never reads, edits or prints. */
export const SECRET_FILE_GLOBS = [
  // environment files
  '**/.env',
  '**/.env.*',
  // key material and signing files
  '**/*.pem',
  '**/*.key',
  '**/*.p8',
  '**/*.p12',
  '**/*.pfx',
  '**/*.jks',
  '**/*.keystore',
  '**/*.mobileprovision',
  '**/*.ppk',
  // ssh private keys, by their default names and anything else inside .ssh
  '**/id_rsa',
  '**/id_dsa',
  '**/id_ecdsa',
  '**/id_ed25519',
  '**/.ssh/*',
  // credential files
  '**/*credentials*.json',
  '**/*service-account*.json',
  '**/.aws/credentials',
  '**/.netrc',
  '**/.pgpass',
];

/** Files that look like secrets by name but are documentation: placeholders, never real values. */
export const EXAMPLE_FILE_GLOBS = [
  '**/.env*.example',
  '**/.env*.sample',
  '**/.env*.template',
  '**/.env*.dist',
  '**/.ssh/*.pub',
  '**/.ssh/config',
  '**/.ssh/known_hosts*',
  '**/.ssh/authorized_keys',
];

const escape = (text) => text.replace(/[.+^$()|[\]\\{}]/g, '\\$&');

// A leading double star and slash matches any (possibly empty) directory prefix; `*` and `?` stay inside
// one path segment. (Not a block comment: the glob's star-slash would end it early.)
const globToRegExp = (glob) => {
  let pattern = '';
  for (let k = 0; k < glob.length; k += 1) {
    if (glob.startsWith('**/', k)) {
      pattern += '(?:.*/)?';
      k += 2;
    } else if (glob[k] === '*') pattern += '[^/]*';
    else if (glob[k] === '?') pattern += '[^/]';
    else pattern += escape(glob[k]);
  }
  return new RegExp(`^${pattern}$`);
};

const SECRET = SECRET_FILE_GLOBS.map(globToRegExp);
const EXAMPLE = EXAMPLE_FILE_GLOBS.map(globToRegExp);

/** Forward slashes, no leading `./`, no trailing slash — so the same file spells the same way everywhere. */
const normalize = (path) => String(path).replace(/\\/g, '/').replace(/^(\.\/)+/, '').replace(/\/+$/, '');

/** True when the path names an example file: placeholders by definition, whatever the line says. */
export const isExampleFile = (path) => {
  if (typeof path !== 'string' || !path) return false;
  const file = normalize(path);
  return EXAMPLE.some((re) => re.test(file));
};

/** True when the path names a secret file. The path is not resolved: `~/.ssh/id_rsa` and `$HOME/.env` still match. */
export const isSecretFile = (path) => {
  if (typeof path !== 'string' || !path) return false;
  const file = normalize(path);
  return SECRET.some((re) => re.test(file)) && !isExampleFile(file);
};
