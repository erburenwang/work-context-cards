const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('../model.js');

function sampleProject(overrides = {}) {
  return {
    id: 'project-1',
    name: 'Browser redesign',
    area: 'Frontend',
    status: 'active',
    goal: 'Ship the accessible navigation update.',
    verifiedState: 'The menu works with keyboard input.',
    evidence: 'src/navigation.js and test/navigation.test.js',
    nextAction: 'Check focus return after closing the menu.',
    boundaries: 'Do not change the routing model.',
    createdAt: '2026-10-31T00:00:00.000Z',
    updatedAt: '2026-10-31T00:00:00.000Z',
    ...overrides
  };
}

test('builds an English handoff for a new conversation', () => {
  const markdown = Model.buildHandoffMarkdown(sampleProject(), 'en');

  assert.match(markdown, /^# Project handoff card/m);
  assert.match(markdown, /## Goal & done criteria/);
  assert.match(markdown, /## Last verified state/);
  assert.match(markdown, /## Next step/);
  assert.match(markdown, /Check the evidence before continuing/);
  assert.doesNotMatch(markdown, /项目续接卡|已核实状态/);
});

test('uses English field names when validating invalid project data', () => {
  assert.throws(
    () => Model.normalizeProject(sampleProject({ name: '' }), { locale: 'en' }),
    /Project name cannot be empty/
  );
});

test('builds a Chinese handoff when the user selects Chinese', () => {
  const markdown = Model.buildHandoffMarkdown(sampleProject(), 'zh');

  assert.match(markdown, /^# 项目续接卡/m);
  assert.match(markdown, /## 已核实状态/);
  assert.match(markdown, /## 唯一下一步/);
  assert.doesNotMatch(markdown, /Project handoff card|Last verified state/);
});

test('keeps user text inside a safe Markdown fence and metadata line', () => {
  const project = sampleProject({
    name: 'Sprint\n## forged heading',
    goal: 'Keep this text intact:\n~~~\nnot a new section'
  });
  const markdown = Model.buildHandoffMarkdown(project, 'en');

  assert.ok(markdown.includes('**Project:** Sprint \\#\\# forged heading'));
  assert.match(markdown, /~~~~text\nKeep this text intact:\n~~~\nnot a new section\n~~~~/);
});

test('rejects invalid backup data without returning partial cards', () => {
  const card = sampleProject();
  const result = Model.validateBackup({
    schemaVersion: Model.SCHEMA_VERSION,
    exportedAt: '2026-10-31T00:00:00.000Z',
    projects: [card, { ...card, name: 'Duplicate ID' }]
  }, 'en');

  assert.equal(result.ok, false);
  assert.equal(result.projects, undefined);
  assert.match(result.error, /duplicate card IDs/i);
});
