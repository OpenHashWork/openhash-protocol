const S = (body, vb = '0 0 24 24', extra = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"') =>
  `<svg viewBox="${vb}" ${extra} aria-hidden="true" focusable="false">${body}</svg>`;

// Official X mark.
export const xMark = S(
  '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
  '0 0 24 24', 'fill="currentColor"'
);

// Official GitHub Octicon, mark-github 16.
export const githubMark = S(
  '<path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/>',
  '0 0 16 16', 'fill="currentColor"'
);

export const copy = S('<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/>');
export const check = S('<path d="m5 12.5 4.5 4.5L19 7.5"/>');
export const sun = S('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>');
export const moon = S('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>');
export const menu = S('<path d="M4 7h16M4 12h16M4 17h16"/>');
export const close = S('<path d="m6 6 12 12M18 6 6 18"/>');
export const play = S('<path d="M8 5.5v13l10-6.5z" fill="currentColor"/>');
export const stop = S('<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor"/>');
export const arrow = S('<path d="M5 12h14M13 6l6 6-6 6"/>');
export const refresh = S('<path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4"/>');
export const layers = S('<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>');
export const clock = S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>');
export const lock = S('<rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>');
export const link = S('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3A4.5 4.5 0 0 0 11 19.4l1-1"/>');
export const tag = S('<path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.4 1.4 0 0 1 0 2l-6.2 6.2a1.4 1.4 0 0 1-2 0L3.5 12.2Z"/><circle cx="8" cy="8" r="1.4"/>');
export const shield = S('<path d="M12 3 5 6v5.5c0 4.3 2.9 7.6 7 9.5 4.1-1.9 7-5.2 7-9.5V6l-7-3Z"/>');
export const eye = S('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>');
export const search = S('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>');
export const chevron = S('<path d="m6 9 6 6 6-6"/>');
export const hash = S('<path d="M5 9h15M4 15h15M10 4 8 20M16 4l-2 20"/>');
