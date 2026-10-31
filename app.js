(function () {
  'use strict';

  const STORAGE_KEY = 'codex-xujie-box-v1';
  const LANGUAGE_KEY = 'work-context-cards-language';
  const Model = window.WorkContextModel;
  const I18n = window.WorkContextI18n;
  const STATUS_VALUES = ['active', 'waiting', 'paused', 'done'];
  const statusEl = document.getElementById('save-status');
  const listEl = document.getElementById('project-list');
  const searchEl = document.getElementById('project-search');
  const projectDialog = document.getElementById('project-dialog');
  const projectForm = document.getElementById('project-form');
  const formError = document.getElementById('form-error');
  const handoffDialog = document.getElementById('handoff-dialog');
  const handoffText = document.getElementById('handoff-text');
  const handoffStatus = document.getElementById('handoff-status');
  const guideDialog = document.getElementById('guide-dialog');
  const importFile = document.getElementById('import-file');
  const languageButton = document.getElementById('language-toggle');

  let projects = [];
  let locale = readLocale();
  let currentFilter = 'all';
  let activeHandoffId = '';
  let editingProjectId = '';
  let storageNeedsRestore = false;
  let initialStorageError = '';
  let searchAnnounceTimer = 0;
  let saveStatus = { key: 'storage.loading', values: {}, warning: false };

  function t(key, values) {
    return I18n.t(key, locale, values);
  }

  function readLocale() {
    try {
      const saved = window.localStorage.getItem(LANGUAGE_KEY);
      if (saved) return I18n.resolveLocale(saved);
    } catch (error) {
      // Language selection still works for the current page when storage is blocked.
    }
    return I18n.resolveLocale(navigator.language);
  }

  function applyLocale() {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
    ['placeholder', 'aria-label', 'title'].forEach((attribute) => {
      document.querySelectorAll('[data-i18n-' + attribute + ']').forEach((node) => {
        const suffix = attribute.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('');
        node.setAttribute(attribute, t(node.dataset['i18n' + suffix]));
      });
    });
    languageButton.textContent = t('language.switch');
    languageButton.setAttribute('aria-label', t('language.switchLabel'));
    languageButton.setAttribute('aria-pressed', String(locale === 'zh'));
    setSaveStatus(saveStatus.key, saveStatus.values, saveStatus.warning);
    if (projectDialog.open) {
      document.getElementById('project-dialog-title').textContent = t(editingProjectId ? 'dialog.project.edit' : 'dialog.project.create');
    }
    if (handoffDialog.open && activeHandoffId) refreshHandoff();
  }

  function setLocale(nextLocale) {
    locale = I18n.resolveLocale(nextLocale);
    try {
      window.localStorage.setItem(LANGUAGE_KEY, locale);
    } catch (error) {
      // The selected language remains active for this page session.
    }
    applyLocale();
    renderProjects();
  }

  function setSaveStatus(key, values, warning) {
    saveStatus = { key, values: values || {}, warning: Boolean(warning) };
    statusEl.textContent = t(key, saveStatus.values);
    statusEl.classList.toggle('is-warning', saveStatus.warning);
  }

  function announce(key, values) {
    document.getElementById('announcement').textContent = t(key, values);
  }

  function loadProjects() {
    let raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      initialStorageError = error && error.message ? error.message : t('storage.unavailable');
      projects = [];
      setSaveStatus('storage.unavailable', {}, true);
      return;
    }
    if (!raw) {
      projects = [];
      setSaveStatus('storage.accessible');
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      storageNeedsRestore = true;
      initialStorageError = t('storage.corrupt');
      projects = [];
      setSaveStatus('storage.protected', {}, true);
      return;
    }
    const result = Model.validateBackup(parsed, locale);
    if (!result.ok) {
      storageNeedsRestore = true;
      initialStorageError = result.error;
      projects = [];
      setSaveStatus('storage.protected', {}, true);
      return;
    }
    projects = result.projects;
    setSaveStatus('storage.restored', { count: projects.length });
  }

  function persistProjects() {
    if (storageNeedsRestore) {
      setSaveStatus('storage.notSaved', {}, true);
      return false;
    }
    try {
      const backup = Model.makeBackup(projects, new Date().toISOString(), locale);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(backup));
      setSaveStatus('storage.saved');
      return true;
    } catch (error) {
      setSaveStatus('storage.saveFailed', {}, true);
      return false;
    }
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return t('storage.unknownTime');
    return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
  }

  function statusLabel(status) {
    return t('status.' + status);
  }

  function getCounts() {
    return projects.reduce((counts, project) => {
      counts.all += 1;
      counts[project.status] += 1;
      return counts;
    }, { all: 0, active: 0, waiting: 0, paused: 0, done: 0 });
  }

  function renderCounts() {
    const counts = getCounts();
    document.getElementById('active-count').textContent = counts.active;
    Object.keys(counts).forEach((key) => {
      const node = document.getElementById('count-' + key);
      if (node) node.textContent = counts[key];
    });
  }

  function updateProjectStatus(projectId, status) {
    if (!STATUS_VALUES.includes(status)) return;
    projects = projects.map((project) => project.id === projectId
      ? Object.assign({}, project, { status, updatedAt: new Date().toISOString() })
      : project);
    const saved = persistProjects();
    renderProjects();
    announce(saved ? 'announce.statusSaved' : 'announce.statusNotSaved', { status: statusLabel(status) });
  }

  function makeProjectCard(project) {
    const card = element('article', 'project-card');
    card.setAttribute('aria-label', project.name + ', ' + statusLabel(project.status));

    const top = element('div', 'card-topline');
    const titleWrap = element('div', 'card-title-wrap');
    titleWrap.append(element('h3', 'card-title', project.name));
    if (project.area) titleWrap.append(element('p', 'card-area', project.area));
    top.append(titleWrap, element('span', 'status-pill status-' + project.status, statusLabel(project.status)));

    const goal = element('div', 'card-block');
    goal.append(element('span', 'card-label', t('card.goal')), element('p', 'card-goal', project.goal));
    const verified = element('div', 'card-block');
    verified.append(element('span', 'card-label', t('card.verified')), element('p', 'card-state', project.verifiedState));
    const next = element('div', 'card-block card-next');
    next.append(element('span', 'card-label', t('card.next')), element('p', '', project.nextAction));

    const content = [top, goal, verified, next];
    if (project.evidence) content.push(element('p', 'card-evidence', t('card.evidence', { evidence: project.evidence })));

    const bottom = element('div', 'card-bottom');
    bottom.append(element('span', 'card-updated', t('card.updated', { date: formatDate(project.updatedAt) })));
    const actions = element('div', 'card-actions');
    const handoffButton = element('button', 'mini-button mini-button-main', t('card.handoff'));
    handoffButton.type = 'button';
    handoffButton.setAttribute('aria-label', t('card.makeHandoff', { name: project.name }));
    handoffButton.addEventListener('click', () => openHandoff(project.id));
    const editButton = element('button', 'mini-button', t('card.edit'));
    editButton.type = 'button';
    editButton.setAttribute('aria-label', t('card.editName', { name: project.name }));
    editButton.addEventListener('click', () => openEditor(project.id));
    const statusSelect = document.createElement('select');
    statusSelect.className = 'mini-button status-select';
    statusSelect.setAttribute('aria-label', t('card.changeStatus', { name: project.name }));
    STATUS_VALUES.forEach((status) => {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = statusLabel(status);
      option.selected = status === project.status;
      statusSelect.append(option);
    });
    statusSelect.addEventListener('change', () => updateProjectStatus(project.id, statusSelect.value));
    const deleteButton = element('button', 'mini-button', t('card.delete'));
    deleteButton.type = 'button';
    deleteButton.setAttribute('aria-label', t('card.deleteName', { name: project.name }));
    deleteButton.addEventListener('click', () => deleteProject(project.id));
    actions.append(handoffButton, editButton, statusSelect, deleteButton);
    bottom.append(actions);
    content.push(bottom);
    card.append(...content);
    return card;
  }

  function renderProjects() {
    renderCounts();
    listEl.replaceChildren();
    const query = searchEl.value.trim().toLocaleLowerCase();
    const visible = projects
      .filter((project) => currentFilter === 'all' || project.status === currentFilter)
      .filter((project) => !query || [project.name, project.area, project.goal, project.verifiedState, project.nextAction, project.evidence, project.boundaries]
        .join('\n').toLocaleLowerCase().includes(query))
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

    if (!visible.length) {
      const empty = element('section', 'empty-state');
      if (projects.length === 0) {
        empty.append(element('h3', '', t('empty.title')));
        empty.append(element('p', '', t('empty.body')));
        const create = element('button', 'button button-primary', t('empty.create'));
        create.type = 'button';
        create.addEventListener('click', () => openEditor());
        empty.append(create);
      } else {
        empty.append(element('p', 'empty-filter', t('empty.filter')));
      }
      listEl.append(empty);
      return 0;
    }
    visible.forEach((project) => listEl.append(makeProjectCard(project)));
    return visible.length;
  }

  function openEditor(projectId) {
    const project = projects.find((item) => item.id === projectId);
    editingProjectId = project ? project.id : '';
    projectForm.reset();
    formError.hidden = true;
    formError.textContent = '';
    document.getElementById('project-dialog-title').textContent = t(project ? 'dialog.project.edit' : 'dialog.project.create');
    document.getElementById('project-id').value = project ? project.id : '';
    document.getElementById('project-name').value = project ? project.name : '';
    document.getElementById('project-area').value = project ? project.area : '';
    document.getElementById('project-status').value = project ? project.status : 'active';
    document.getElementById('project-goal').value = project ? project.goal : '';
    document.getElementById('project-state').value = project ? project.verifiedState : '';
    document.getElementById('project-evidence').value = project ? project.evidence : '';
    document.getElementById('project-next').value = project ? project.nextAction : '';
    document.getElementById('project-boundaries').value = project ? project.boundaries : '';
    projectDialog.showModal();
    document.getElementById('project-name').focus();
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 'card-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  projectForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(projectForm);
    const id = String(formData.get('id') || '');
    const existing = projects.find((item) => item.id === id);
    if (!existing && projects.length >= Model.MAX_PROJECTS) {
      formError.textContent = t('dialog.maxCards', { max: Model.MAX_PROJECTS });
      formError.hidden = false;
      formError.focus();
      return;
    }
    const now = new Date().toISOString();
    const input = {
      id: existing ? existing.id : createId(),
      name: String(formData.get('name') || ''),
      area: String(formData.get('area') || ''),
      status: String(formData.get('status') || 'active'),
      goal: String(formData.get('goal') || ''),
      verifiedState: String(formData.get('verifiedState') || ''),
      evidence: String(formData.get('evidence') || ''),
      nextAction: String(formData.get('nextAction') || ''),
      boundaries: String(formData.get('boundaries') || ''),
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };
    try {
      const normalized = Model.normalizeProject(input, { locale });
      if (existing) projects = projects.map((item) => item.id === existing.id ? normalized : item);
      else projects.push(normalized);
      const saved = persistProjects();
      projectDialog.close();
      renderProjects();
      announce(saved ? 'announce.cardSaved' : 'announce.cardCurrentOnly');
    } catch (error) {
      formError.textContent = error && error.message ? error.message : t('model.unreadableBackup');
      formError.hidden = false;
      formError.focus();
    }
  });

  function deleteProject(projectId) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    if (!window.confirm(t('confirm.delete', { name: project.name }))) return;
    projects = projects.filter((item) => item.id !== projectId);
    const saved = persistProjects();
    renderProjects();
    announce(saved ? 'announce.cardDeleted' : 'announce.cardDeletedCurrentOnly');
  }

  function refreshHandoff() {
    const project = projects.find((item) => item.id === activeHandoffId);
    if (!project) return;
    document.getElementById('handoff-dialog-title').textContent = t('handoff.dialogTitle', { name: project.name });
    handoffText.value = Model.buildHandoffMarkdown(project, locale);
    handoffStatus.textContent = t('handoff.preview');
  }

  function openHandoff(projectId) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    activeHandoffId = projectId;
    refreshHandoff();
    handoffDialog.showModal();
  }

  function currentHandoff() {
    const project = projects.find((item) => item.id === activeHandoffId);
    return project ? Model.buildHandoffMarkdown(project, locale) : handoffText.value;
  }

  async function copyHandoff() {
    const value = currentHandoff();
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        copied = true;
      }
    } catch (error) {
      copied = false;
    }
    if (!copied) {
      handoffText.focus();
      handoffText.select();
      try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
    }
    handoffStatus.textContent = copied ? t('handoff.copied') : t('handoff.copyFallback');
  }

  function safeFilename(value) {
    const fallback = locale === 'zh' ? '续接卡' : 'handoff-card';
    return String(value || fallback).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim().slice(0, 70) || fallback;
  }

  function downloadText(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportBackup() {
    if (storageNeedsRestore && projects.length === 0) {
      setSaveStatus('storage.noEmptyExport', {}, true);
      return;
    }
    try {
      const backup = Model.makeBackup(projects, new Date().toISOString(), locale);
      const date = new Date().toISOString().slice(0, 10);
      const prefix = locale === 'zh' ? '工作续接卡备份_' : 'work-context-cards-backup_';
      downloadText(prefix + date + '.json', JSON.stringify(backup, null, 2), 'application/json;charset=utf-8');
      setSaveStatus('storage.backupExported');
    } catch (error) {
      setSaveStatus('storage.backupFailed', { error: error.message || t('model.unreadableBackup') }, true);
    }
  }

  async function importBackup(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setSaveStatus('storage.backupTooLarge', {}, true);
      return;
    }
    try {
      const parsed = JSON.parse(await file.text());
      const result = Model.validateBackup(parsed, locale);
      if (!result.ok) {
        setSaveStatus('storage.backupInvalid', { error: result.error }, true);
        return;
      }
      const approved = window.confirm(t('confirm.import', { current: projects.length, incoming: result.projects.length }));
      if (!approved) return;
      projects = result.projects;
      storageNeedsRestore = false;
      initialStorageError = '';
      const saved = persistProjects();
      renderProjects();
      announce(saved ? 'announce.backupImported' : 'announce.backupCurrentOnly', { count: projects.length });
    } catch (error) {
      setSaveStatus('storage.backupUnreadable', {}, true);
    } finally {
      importFile.value = '';
    }
  }

  function setFilter(button) {
    currentFilter = button.dataset.filter || 'all';
    document.querySelectorAll('.filter-button').forEach((item) => {
      const selected = item === button;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    const count = renderProjects();
    const label = currentFilter === 'all' ? t('filter.all') : statusLabel(currentFilter);
    announce('announce.filter', { filter: label, count });
  }

  languageButton.addEventListener('click', () => setLocale(locale === 'en' ? 'zh' : 'en'));
  document.getElementById('new-project-button').addEventListener('click', () => openEditor());
  document.getElementById('export-button').addEventListener('click', exportBackup);
  document.getElementById('import-button').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', () => importBackup(importFile.files && importFile.files[0]));
  document.getElementById('copy-handoff-button').addEventListener('click', copyHandoff);
  document.getElementById('download-handoff-button').addEventListener('click', () => {
    const project = projects.find((item) => item.id === activeHandoffId);
    if (!project) return;
    const suffix = locale === 'zh' ? '_交接说明.md' : '_handoff.md';
    downloadText(safeFilename(project.name) + suffix, currentHandoff(), 'text/markdown;charset=utf-8');
    handoffStatus.textContent = t('handoff.download');
  });
  document.getElementById('quick-guide-button').addEventListener('click', () => guideDialog.showModal());
  document.getElementById('filter-list').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-filter]');
    if (button) setFilter(button);
  });
  searchEl.addEventListener('input', () => {
    const count = renderProjects();
    window.clearTimeout(searchAnnounceTimer);
    searchAnnounceTimer = window.setTimeout(() => announce('announce.search', { count }), 350);
  });
  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => {
      const dialog = document.getElementById(button.dataset.close);
      if (dialog && dialog.open) dialog.close();
    });
  });

  applyLocale();
  loadProjects();
  renderProjects();
  if (initialStorageError) announce('announce.initialStorage', { error: initialStorageError });
})();
