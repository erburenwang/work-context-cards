const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const I18n = require('../locales.js');

test('every page and application translation key exists in both locales', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const model = fs.readFileSync(path.join(root, 'model.js'), 'utf8');
  const keys = new Set([
    ...[...html.matchAll(/\bdata-i18n(?:-[\w-]+)?="([^"]+)"/g)].map((match) => match[1]),
    ...[...app.matchAll(/\bt\('([^']+)'(?!\s*\+)/g)].map((match) => match[1]),
    ...[...model.matchAll(/\bt\('([^']+)'(?!\s*\+)/g)].map((match) => match[1])
  ]);

  for (const key of keys) {
    assert.ok(Object.hasOwn(I18n.messages.en, key), `English translation missing: ${key}`);
    assert.ok(Object.hasOwn(I18n.messages.zh, key), `Chinese translation missing: ${key}`);
  }
});

test('locale resolution safely falls back to English', () => {
  assert.equal(I18n.resolveLocale('zh-CN'), 'zh');
  assert.equal(I18n.resolveLocale('en-US'), 'en');
  assert.equal(I18n.resolveLocale('unknown'), 'en');
});

test('dynamic status and field translation keys exist in both locales', () => {
  for (const locale of ['en', 'zh']) {
    for (const status of ['active', 'waiting', 'paused', 'done']) {
      assert.ok(Object.hasOwn(I18n.messages[locale], `status.${status}`));
    }
    for (const field of ['id', 'name', 'area', 'goal', 'verifiedState', 'evidence', 'nextAction', 'boundaries']) {
      assert.ok(Object.hasOwn(I18n.messages[locale], `model.field.${field}`));
    }
  }
});
