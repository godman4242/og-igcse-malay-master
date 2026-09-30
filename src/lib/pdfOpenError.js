// Plain English for a PDF that won't open — never pdf.js's own text ("Invalid PDF
// structure.", "…i.e. its size is zero bytes."). Shared by the reader and Import.
// Kept apart from lib/pdf.js so it never pulls pdf.js in (and survives its mocks).
// Only pdf.js's own "bad file" exceptions blame the file; anything else (a hashed
// pdf.worker 404 after a deploy, an app bug) is ours → reload, not "another file".
const FILE_FAULTS = new Set(['InvalidPDFException', 'MissingPDFException'])

export function pdfOpenErrorMessage(e) {
  if (e?.name === 'PasswordException') return 'That PDF is password-protected — save an unlocked copy and try again.'
  return FILE_FAULTS.has(e?.name)
    ? 'Couldn’t open that file — it may be damaged or not a PDF. Try another file.'
    : 'Couldn’t open the reader — reload the page and try again.'
}
