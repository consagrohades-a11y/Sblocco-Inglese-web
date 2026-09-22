import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

function assertContains(source, fragment, message) {
  if (!source.includes(fragment)) throw new Error(message);
}

function assertNotContains(source, fragment, message) {
  if (source.includes(fragment)) throw new Error(message);
}

const toggle = read('src/components/ThemeToggle.jsx');
const index = read('index.html');
const home = read('src/pages/Home.jsx');

assertContains(toggle, "window.localStorage.getItem('sblocco_theme') === 'dark'", 'Theme toggle must default to light unless dark was explicitly saved.');
assertNotContains(toggle, 'prefers-color-scheme', 'System dark preference must not override the Sblocco light default.');

assertContains(index, "if (saved === 'dark'", 'Initial paint may enter dark mode only from an explicit saved preference.');
assertNotContains(index, 'prefers-color-scheme', 'Initial paint must not follow system dark mode by default.');

assertContains(home, "window.localStorage.getItem('sblocco_theme') === 'dark'", 'Homepage may restore only an explicit saved dark preference.');
assertNotContains(home, 'prefersDark', 'Homepage must not restore system dark mode when no preference was saved.');

console.log('Light mode default validation passed.');
