import * as readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';

let lastPing = 0;
let firstPing = false;
let tabClosed = false;
let prompting = false;
let appUrl = '';
let reader: readline.Interface | null = null;

function getReader() {
  if (!reader) reader = readline.createInterface({ input, output });
  return reader;
}

export function setAppUrl(url: string) {
  appUrl = url;
}

export function recordPing() {
  lastPing = Date.now();
  firstPing = true;
  tabClosed = false;
}

export function startWatchdog() {
  setInterval(() => {
    if (firstPing && !tabClosed && Date.now() - lastPing > 5000) {
      tabClosed = true;
      promptOnClose();
    }
  }, 1000);
}

export function promptOnClose() {
  if (prompting || tabClosed) return;
  tabClosed = true;
  prompting = true;
  console.log('\n[open-in-web diff] Browser tab closed.');
  if (!process.stdin.isTTY) {
    console.log('[open-in-web diff] Non-TTY: continuing to serve.');
    prompting = false;
    return;
  }
  getReader().question('[open-in-web diff] Choose: (r)eopen, (q)uit, (c)ontinue: ', (answer) => {
    prompting = false;
    const choice = answer.trim().toLowerCase();
    if (choice === 'r' || choice === 'reopen') {
      openBrowser(appUrl);
    } else if (choice === 'q' || choice === 'quit') {
      reader?.close();
      process.exit(0);
    } else {
      console.log('[open-in-web diff] Continuing to serve. Open the tab again to reconnect.');
    }
  });
}

export function openBrowser(url: string) {
  if (process.platform === 'win32') {
    Bun.spawn({ cmd: ['powershell', '-NoProfile', '-Command', `Start-Process '${url}'`] });
  } else if (process.platform === 'darwin') {
    Bun.spawn({ cmd: ['open', url] });
  } else {
    Bun.spawn({ cmd: ['xdg-open', url] });
  }
}
