// Plain English for a PDF that won't open — never pdf.js's own text ("Invalid PDF
// structure.", "…i.e. its size is zero bytes."). Shared by the reader and Import.
// Kept apart from lib/pdf.js so it never pulls pdf.js in (and survives its mocks).
export function pdfOpenErrorMessage(e) {
  return e?.name === 'PasswordException'
    ? 'That PDF is password-protected — save an unlocked copy and try again.'
    : 'Couldn’t open that file — it may be damaged or not a PDF. Try another file.'
}
