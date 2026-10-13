#!/usr/bin/env node
// scaffold — creates a component folder laid out as RCT-02 says, so the layout is right by construction.
//
//   node bin/scaffold.mjs component <Name> --feature <feature> [--hook] [--styles] [--dir <project>]
//   node bin/scaffold.mjs component <Name> --shared [<group>] [--hook] [--styles] [--dir <project>]
//   node bin/scaffold.mjs component <Name> --in <parent component folder> [--single | --hook] [--styles] [--dir <project>]
//
// Folders come from the project's installed `react` pack (.claude/standards/standards.json), or, without one,
// from what the project looks like. `--in` makes a subcomponent in the parent's components/; `--single` makes it
// one file. Never overwrites: an existing folder or file is an error. Prints what it created.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { detectSettings, findProjectRoot, readState } from './lib/standards.mjs';

const fail = (message) => {
  process.stderr.write(`[dev-assistant] scaffold: ${message}\n`);
  process.exit(1);
};

const parseArgs = (argv) => {
  const [kind, name, ...rest] = argv;
  const options = {};
  for (let k = 0; k < rest.length; k += 1) {
    const arg = rest[k];
    if (['--hook', '--styles', '--single'].includes(arg)) options[arg.slice(2)] = true;
    else if (arg === '--shared') {
      options.shared = true;
      if (rest[k + 1] && !rest[k + 1].startsWith('--')) options.group = rest[(k += 1)];
    } else if (['--feature', '--in', '--dir'].includes(arg)) options[arg.slice(2)] = rest[(k += 1)];
    else fail(`unknown argument "${arg}".`);
  }
  return { kind, name, options };
};

const { kind, name, options } = parseArgs(process.argv.slice(2));
if (kind !== 'component') fail('usage: component <Name> (--feature <feature> | --shared [<group>] | --in <parent folder>) [--hook] [--styles] [--single]');
if (!/^[A-Z][A-Za-z0-9]*$/.test(name ?? '')) fail(`"${name ?? ''}" is not a PascalCase component name.`);
const places = ['feature', 'shared', 'in'].filter((key) => options[key]);
if (places.length !== 1) fail('say where it goes: exactly one of --feature <feature>, --shared [<group>], --in <parent folder>.');
if (options.single && !options.in) fail('--single is for a subcomponent: use it with --in.');
if (options.single && (options.hook || options.styles)) fail('a single-file subcomponent has no hook and no styles of its own; drop --single to make it a folder.');

const dir = resolve(options.dir ?? process.cwd());
const root = findProjectRoot(dir) ?? dir;
const settings = readState(root)?.packs?.react?.settings ?? detectSettings(root);
const native = settings.platform === 'native';
const ts = existsSync(join(root, 'tsconfig.json'));
const [code, markup] = ts ? ['ts', 'tsx'] : ['js', 'jsx'];

const parent = options.feature ? `${settings.featuresDir}/${options.feature}/components`
  : options.shared ? [settings.sharedDir, options.group].filter(Boolean).join('/')
    : `${options.in.replace(/\/+$/, '')}/components`;
if (options.in && !existsSync(join(root, options.in))) fail(`the parent component "${options.in}" does not exist.`);

const imports = (lines) => (lines.length ? `${lines.join('\n')}\n\n` : '');

const component = ({ hook, styles }) => {
  const lines = [
    ...(native ? ["import { Text, View } from 'react-native';"] : []),
    ...(styles ? [native ? `import { styles } from './${name}.styles';` : `import { rootClassName } from './${name}.styles';`] : []),
    ...(hook ? [`import { use${name} } from './use${name}';`] : []),
  ];
  const text = hook ? '{title}' : name;
  const view = native
    ? `(\n    <View${styles ? ' style={styles.root}' : ''}>\n      <Text>${text}</Text>\n    </View>\n  )`
    : `<div${styles ? ' className={rootClassName}' : ''}>${text}</div>`;
  const body = hook
    ? `{\n  const { title } = use${name}();\n\n  return ${view};\n}`
    : native ? `{\n  return ${view};\n}` : view;
  return `${imports(lines)}export const ${name} = () => ${body};\n`;
};

const hookFile = () => `/** The logic of ${name} — data, effects, handlers, derived values (RCT-02). ${name} renders what this returns. */
export const use${name} = () => ({ title: '${name}' });
`;

const stylesFile = () => (native
  ? `import { StyleSheet } from 'react-native';

// Theme tokens only (RCT-03): colors, typography and radii come from the theme.
export const styles = StyleSheet.create({
  root: {},
});
`
  : `// Token utilities only (RCT-03): no palette classes, hex values or arbitrary values.
export const rootClassName = 'flex flex-col';
`);

const files = options.single
  ? { [`${parent}/${name}.${markup}`]: component({}) }
  : {
    [`${parent}/${name}/index.${code}`]: `export { ${name} } from './${name}';\n`,
    [`${parent}/${name}/${name}.${markup}`]: component(options),
    ...(options.hook ? { [`${parent}/${name}/use${name}.${code}`]: hookFile() } : {}),
    ...(options.styles ? { [`${parent}/${name}/${name}.styles.${code}`]: stylesFile() } : {}),
  };

const target = options.single ? Object.keys(files)[0] : `${parent}/${name}`;
if (existsSync(join(root, target))) fail(`${target} already exists; nothing written.`);
for (const [path, content] of Object.entries(files)) {
  mkdirSync(join(root, path, '..'), { recursive: true });
  writeFileSync(join(root, path), content);
}

const barrel = ['ts', 'tsx', 'js', 'jsx'].map((ext) => `${parent}/index.${ext}`).find((path) => existsSync(join(root, path)));
process.stdout.write([
  `[dev-assistant] scaffold: ${name} created in ${root}`,
  ...Object.keys(files).map((path) => `  + ${path}`),
  ...(barrel ? [`${barrel} exports its neighbours: add ${name} there if it should be exported too.`] : []),
  'Fill it in: markup in the component file, logic in the hook, values from the tokens.',
].join('\n') + '\n');
