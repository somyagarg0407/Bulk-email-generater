const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Format recipients for copy/paste or download. */
export function formatRecipients(recipients, format) {
  const emails = recipients.map((r) => r.email);
  switch (format) {
    case 'comma': return { text: emails.join(', '), contentType: 'text/plain', ext: 'txt' };
    case 'semicolon': return { text: emails.join('; '), contentType: 'text/plain', ext: 'txt' };
    case 'lines': return { text: emails.join('\n'), contentType: 'text/plain', ext: 'txt' };
    case 'csv': {
      const rows = ['rollNumber,email,batch,branch', ...recipients.map((r) =>
        [r.rollNumber, r.email, r.batch, r.branch].map(csvCell).join(','))];
      return { text: rows.join('\r\n') + '\r\n', contentType: 'text/csv', ext: 'csv' };
    }
    default: throw new Error('Unknown export format');
  }
}

export const sendFormatted = (res, recipients, format, baseName) => {
  const { text, contentType, ext } = formatRecipients(recipients, format);
  res.setHeader('Content-Type', `${contentType}; charset=utf-8`);
  res.setHeader('Content-Disposition', `attachment; filename="${baseName}.${ext}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(text);
};
