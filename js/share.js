// Builds the "copy my score" text and puts it on the clipboard.

function withArticle(rank) {
  return /^[aeiou]/i.test(rank) ? `an ${rank}` : `a ${rank}`;
}

// Only include a link once the game is hosted somewhere other people can open.
function publicUrl() {
  const local = ['localhost', '127.0.0.1', ''].includes(location.hostname);
  return local ? '' : location.origin + location.pathname;
}

export function buildShareText(report, levelLabel) {
  const text =
    `I caught ${report.fraudCaught}/${report.fraudTotal} fraudsters as ${withArticle(report.rank)} 🕵️ ` +
    `in Catch the Fraudster (${levelLabel}, ${report.score} points) — can you beat me?`;
  const url = publicUrl();
  return url ? `${text} ${url}` : text;
}

// Returns true if the text reached the clipboard.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers, or pages without clipboard permission.
    try {
      const box = document.createElement('textarea');
      box.value = text;
      box.setAttribute('readonly', '');
      box.style.position = 'fixed';
      box.style.opacity = '0';
      document.body.append(box);
      box.select();
      const copied = document.execCommand('copy');
      box.remove();
      return copied;
    } catch {
      return false;
    }
  }
}
