/**
 * UI-automation test-id registry — the single source of truth for every
 * `data-testid` in the application. See docs/ui-automation.md for the full
 * conventions (naming, stability guarantees, ARIA-first selector guidance).
 *
 * Rules:
 *   - Never write a `data-testid` string inline in a component; add it here.
 *   - Format: `{page}.{section}.{element}`, kebab-case segments.
 *   - Dynamic ids (per-entity elements) are factory functions taking the
 *     entity id, e.g. `TESTID.todos.item(todo.id)`.
 */
export const TESTID = {
  app: {
    header: 'app.header',
    navTodos: 'app.nav.todos',
    navDesignSystem: 'app.nav.design-system',
    themeToggle: 'app.controls.theme-toggle',
    designToggle: 'app.controls.design-toggle',
    localeSelect: 'app.controls.locale-select',
    account: {
      signIn: 'app.account.sign-in',
      signUp: 'app.account.sign-up',
      user: 'app.account.user',
      signOut: 'app.account.sign-out',
    },
  },
  login: {
    page: 'login.page',
    disabled: 'login.disabled',
    form: 'login.form',
    userId: 'login.user-id',
    submit: 'login.submit',
    signUpLink: 'login.sign-up-link',
  },
  signUp: {
    page: 'sign-up.page',
    disabled: 'sign-up.disabled',
    form: 'sign-up.form',
    userId: 'sign-up.user-id',
    displayName: 'sign-up.display-name',
    bio: 'sign-up.bio',
    error: 'sign-up.error',
    submit: 'sign-up.submit',
    loginLink: 'sign-up.login-link',
  },
  logout: {
    page: 'logout.page',
    confirm: 'logout.confirm',
    cancel: 'logout.cancel',
    done: 'logout.done',
    notSignedIn: 'logout.not-signed-in',
    homeLink: 'logout.home-link',
    loginLink: 'logout.login-link',
  },
  todos: {
    page: 'todos.page',
    createForm: 'todos.create.form',
    createInput: 'todos.create.input',
    createSubmit: 'todos.create.submit',
    guestHint: 'todos.guest-hint',
    filterStatus: 'todos.filter.status',
    sortBy: 'todos.sort.by',
    list: 'todos.list',
    item: (id: string) => `todos.item.${id}`,
    itemToggle: (id: string) => `todos.item.${id}.toggle`,
    itemDelete: (id: string) => `todos.item.${id}.delete`,
    loading: 'todos.loading',
    error: 'todos.error',
    errorRetry: 'todos.error.retry',
    empty: 'todos.empty',
    totalCount: 'todos.total-count',
    pagination: 'todos.pagination',
    paginationPrev: 'todos.pagination.prev',
    paginationNext: 'todos.pagination.next',
    paginationStatus: 'todos.pagination.status',
  },
  home: {
    page: 'home.page',
    chat: {
      panel: 'home.chat.panel',
      status: 'home.chat.status',
      participants: 'home.chat.participants',
      log: 'home.chat.log',
      message: (seq: number) => `home.chat.message.${seq}`,
      empty: 'home.chat.empty',
      form: 'home.chat.form',
      input: 'home.chat.input',
      send: 'home.chat.send',
    },
  },
  designSystem: {
    page: 'design-system.page',
    section: (name: string) => `design-system.section.${name}`,
    overlay: {
      openModal: 'design-system.overlay.open-modal',
      openSheet: 'design-system.overlay.open-sheet',
      openSidebar: 'design-system.overlay.open-sidebar',
      modal: 'design-system.overlay.modal',
      sheet: 'design-system.overlay.sheet',
      sidebar: 'design-system.overlay.sidebar',
      /* Opened from inside the modal — the nesting the stack has to survive. */
      nest: 'design-system.overlay.nest',
      confirm: 'design-system.overlay.confirm',
      confirmYes: 'design-system.overlay.confirm.yes',
      confirmNo: 'design-system.overlay.confirm.no',
      save: 'design-system.overlay.save',
      result: 'design-system.overlay.result',
      /* The declarative door — an inline sidebar is layout, not a popup. */
      inline: 'design-system.overlay.inline',
      inlineToggle: 'design-system.overlay.inline.toggle',
    },
  },
  notFound: {
    page: 'not-found.page',
    homeLink: 'not-found.home-link',
  },
} as const;
