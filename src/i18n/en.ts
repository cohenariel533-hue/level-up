/**
 * All user-facing text lives here, so a Hebrew version (he.ts) can be added
 * later by translating one file. Each build stage adds its own section.
 */
export const en = {
  appName: 'Level Up',

  nav: {
    today: 'Today',
    week: 'Week',
    money: 'Money',
    hustle: 'Hustle',
    gym: 'Gym',
    youtube: 'YouTube',
    review: 'Review',
    settings: 'Settings',
    more: 'More',
  },

  greeting: {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
    night: 'Still up?',
  },

  today: {
    focusTitle: 'The one thing that matters today',
    weekTitle: 'This week',
    rings: { gym: 'Gym', hustle: 'Hustle', youtube: 'YouTube', money: 'Money check' },
  },

  comingSoon: 'Coming in stage',

  more: {
    title: 'More',
  },

  settings: {
    title: 'Settings',
    appearance: 'Appearance',
    themeDark: 'Dark',
    themeLight: 'Light',
    themeSystem: 'Auto',

    backupTitle: 'Backup',
    backupIntro: 'Everything lives only on this device. Export a backup now and then, and keep it in Files or iCloud Drive.',
    lastBackup: 'Last backup',
    never: 'Not yet',
    today: 'Today',
    daysAgo: (n: number) => (n === 1 ? 'Yesterday' : `${n} days ago`),
    exportBtn: 'Export backup',
    importBtn: 'Restore from file',
    backupSaved: 'Backup saved ✨',
    backupFailed: 'Couldn’t create the backup. Try again?',

    restoreTitle: 'Restore this backup?',
    restoreBody: (records: number, date: string) =>
      `This backup from ${date} has ${records} records. It will replace what’s in the app right now.`,
    restoreConfirm: 'Replace my data',
    restored: 'Backup restored',
    cancel: 'Cancel',
    importErrorTitle: 'That file didn’t work',
    ok: 'OK',

    storageTitle: 'Storage',
    storageInstalled: 'Installed on this device',
    storageInstalledSub: 'Your data is kept safe here.',
    storageNotInstalled: 'Not installed yet',
    storageNotInstalledSub:
      'On iPhone, tap Share → Add to Home Screen. Installed apps keep their data; a Safari tab can lose it after weeks unused.',

    resetTitle: 'Start fresh',
    resetRow: 'Erase all data on this device',
    resetBody: 'This deletes everything in Level Up on this device. Export a backup first if you might want it back.',
    resetConfirm: 'Erase everything',

    about: 'About',
    version: 'Version',
  },

  backup: {
    errNotJson: 'This isn’t a JSON file.',
    errNotBackup: 'This file isn’t a Level Up backup.',
    errNewer: 'This backup was made by a newer version of Level Up. Update the app first.',
    errRestore: 'Something in the backup didn’t fit, so nothing was changed.',
  },
} as const;

/** The active language. Swap to `he` here once a Hebrew file exists. */
export const t = en;
