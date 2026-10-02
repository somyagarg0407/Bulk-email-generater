import { useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { COPY_FORMATS, copyToClipboard, errMsg, fmtNum } from '../../utils/format.js';
import { Button, MenuButton } from '../ui/index.jsx';

/**
 * copy(format)     -> Promise<{ data: { count, text } }>   (server-formatted text)
 * download(format) -> Promise                              ('csv' | 'lines')
 * Nothing here sends email: it only copies or downloads the recipient list.
 */
export default function CopyExportBar({ copy, download, disabled }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null);

  const doCopy = async (format) => {
    setBusy('copy');
    try {
      const r = await copy(format);
      await copyToClipboard(r.data.text);
      toast.success(`${fmtNum(r.data.count)} email addresses copied.`);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  };
  const doDownload = async (format) => {
    setBusy('export');
    try { await download(format); toast.success('Export downloaded.'); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MenuButton label={busy === 'copy' ? 'Copying…' : 'Copy Emails'} disabled={disabled || !!busy}
        items={COPY_FORMATS.map((f) => ({ label: f.label, onClick: () => doCopy(f.id) }))} />
      <Button variant="secondary" disabled={disabled || !!busy} loading={busy === 'export'} onClick={() => doDownload('csv')}>Export CSV</Button>
      <Button variant="secondary" disabled={disabled || !!busy} onClick={() => doDownload('lines')}>Export TXT</Button>
    </div>
  );
}
