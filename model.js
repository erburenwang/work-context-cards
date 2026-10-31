(function (root, factory) {
  const i18n = (root && root.WorkContextI18n) || (typeof require === 'function' ? require('./locales.js') : null);
  const api = factory(i18n);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.WorkContextModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (I18n) {
  'use strict';

  const SCHEMA_VERSION = 1;
  const MAX_PROJECTS = 500;
  const STATUS_VALUES = ['active', 'waiting', 'paused', 'done'];
  const FIELD_LIMITS = {
    id: 100,
    name: 100,
    area: 50,
    goal: 1200,
    verifiedState: 2400,
    evidence: 1600,
    nextAction: 1000,
    boundaries: 1600
  };

  function t(key, locale, values) {
    return I18n ? I18n.t(key, locale, values) : key;
  }

  function fail(message) {
    throw new TypeError(message);
  }

  function readText(value, field, required, locale) {
    const text = typeof value === 'string' ? value.trim() : '';
    const limit = FIELD_LIMITS[field];
    const label = t('model.field.' + field, locale);
    if (text.length > limit) fail(t('model.tooLong', locale, { field: label, limit }));
    if (required && !text) fail(t('model.required', locale, { field: label }));
    return text;
  }

  function validDate(value) {
    return typeof value === 'string' && value.length <= 60 && Number.isFinite(Date.parse(value));
  }

  function normalizeProject(source, options) {
    const opts = options || {};
    const locale = opts.locale;
    if (!source || typeof source !== 'object' || Array.isArray(source)) fail(t('model.invalidProject', locale));
    const id = readText(source.id, 'id', true, locale);
    if (!STATUS_VALUES.includes(source.status)) fail(t('model.invalidStatus', locale));
    const name = readText(source.name, 'name', true, locale);
    const goal = readText(source.goal, 'goal', true, locale);
    const verifiedState = readText(source.verifiedState, 'verifiedState', true, locale);
    const nextAction = readText(source.nextAction, 'nextAction', true, locale);
    const createdAt = source.createdAt;
    const updatedAt = source.updatedAt;
    if (opts.requireMetadata && (!validDate(createdAt) || !validDate(updatedAt))) fail(t('model.invalidMetadata', locale));
    const now = opts.now || new Date().toISOString();
    return {
      id,
      name,
      area: readText(source.area, 'area', false, locale),
      status: source.status,
      goal,
      verifiedState,
      evidence: readText(source.evidence, 'evidence', false, locale),
      nextAction,
      boundaries: readText(source.boundaries, 'boundaries', false, locale),
      createdAt: validDate(createdAt) ? createdAt : now,
      updatedAt: validDate(updatedAt) ? updatedAt : now
    };
  }

  function fence(text) {
    const content = String(text || '').replace(/\r\n?/g, '\n');
    const runs = content.match(/~{3,}/g) || [];
    const longest = runs.reduce((max, item) => Math.max(max, item.length), 2);
    const marker = '~'.repeat(longest + 1);
    return marker + 'text\n' + content + '\n' + marker;
  }

  function inline(text) {
    return String(text || '').replace(/[\r\n]+/g, ' ').replace(/([\\`*_{}\[\]()#+\-.!|>])/g, '\\$1');
  }

  function buildHandoffMarkdown(source, locale) {
    const project = normalizeProject(source, { locale });
    const sections = [
      [
        t('handoff.title', locale),
        t('handoff.project', locale, { name: inline(project.name) }),
        project.area ? t('handoff.area', locale, { area: inline(project.area) }) : '',
        t('handoff.status', locale, { status: t('status.' + project.status, locale) })
      ].filter(Boolean).join('\n'),
      t('handoff.goal', locale) + '\n\n' + fence(project.goal),
      t('handoff.verified', locale) + '\n\n' + fence(project.verifiedState)
    ];
    if (project.evidence) sections.push(t('handoff.evidence', locale) + '\n\n' + fence(project.evidence));
    sections.push(t('handoff.next', locale) + '\n\n' + fence(project.nextAction));
    if (project.boundaries) sections.push(t('handoff.boundaries', locale) + '\n\n' + fence(project.boundaries));
    sections.push([
      t('handoff.rules', locale),
      t('handoff.rule.verify', locale),
      t('handoff.rule.facts', locale),
      t('handoff.rule.next', locale),
      t('handoff.rule.boundaries', locale),
      t('handoff.rule.report', locale)
    ].join('\n'));
    return sections.join('\n\n');
  }

  function makeBackup(projects, exportedAt, locale) {
    if (!Array.isArray(projects) || projects.length > MAX_PROJECTS) fail(t('model.invalidCount', locale));
    return {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: validDate(exportedAt) ? exportedAt : new Date().toISOString(),
      projects: projects.map((project) => normalizeProject(project, { requireMetadata: true, locale }))
    };
  }

  function validateBackup(value, locale) {
    try {
      if (!value || typeof value !== 'object' || Array.isArray(value)) fail(t('model.invalidBackupRoot', locale));
      if (value.schemaVersion !== SCHEMA_VERSION) fail(t('model.unsupportedVersion', locale));
      if (!Array.isArray(value.projects) || value.projects.length > MAX_PROJECTS) fail(t('model.invalidCount', locale));
      const projects = value.projects.map((project) => normalizeProject(project, { requireMetadata: true, locale }));
      const ids = new Set(projects.map((project) => project.id));
      if (ids.size !== projects.length) fail(t('model.duplicateIds', locale));
      return { ok: true, projects };
    } catch (error) {
      return { ok: false, error: error && error.message ? error.message : t('model.unreadableBackup', locale) };
    }
  }

  return {
    SCHEMA_VERSION,
    MAX_PROJECTS,
    STATUS_VALUES: STATUS_VALUES.slice(),
    normalizeProject,
    buildHandoffMarkdown,
    makeBackup,
    validateBackup
  };
});
