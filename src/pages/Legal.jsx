import { Link, useLocation } from 'react-router-dom'
import { Shield, FileText } from 'lucide-react'
import Meta from '../components/Meta'

// Privacy Policy + Terms of Use. One component, two routes (/privacy, /terms) — the same
// chunk serves both, and the launch gate checks that these WORDS actually ship (a route table
// says nothing, since the SPA serves index.html for every path).
//
// EVERY factual claim below was verified against the code on 2026-09-16, not assumed:
//   - speaking_history stores `{ ts, scenarioId, turnIndex, band }` JSONB — scores, never audio.
//   - SpeakingMicroTurn's MediaRecorder has NO `ondataavailable` handler, so the audio is never
//     collected into a variable at all. "Your voice never leaves the device" is literally true.
//   - The live site sends no Set-Cookie header; @vercel/analytics is cookieless.
//   - 9 of the 11 auth.users references are ON DELETE CASCADE. The two that are not are
//     `translations.created_by` (a SHARED word-pair cache, no personal content) — which is why the
//     'Your rights' section names that exception instead of over-promising a clean wipe.
// If you change any of those, change this page in the same commit.

// One-line edit: this is the only place the contact address appears.
const CONTACT = '[YOUR CONTACT EMAIL]'
const UPDATED = '16 September 2026'

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h3 className="text-base font-bold">{title}</h3>
      <div className="text-sm space-y-2" style={{ color: 'var(--color-dim)' }}>{children}</div>
    </section>
  )
}

function Privacy() {
  return (
    <>
      <Meta
        title="Privacy Policy | IGCSE Malay Master"
        description="What IGCSE Malay Master collects, what it never collects, who else receives it, and how to delete everything."
      />
      <header className="pt-1">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield size={20} style={{ color: 'var(--color-accent)' }} aria-hidden={true} />
          Privacy Policy
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-dim)' }}>Last updated {UPDATED}</p>
      </header>

      <Section title="The short version">
        <p>
          You can use almost all of this app without an account, and without sending us anything. If you
          sign in, we store your study progress so it follows you between devices. We do not sell anything,
          we run no advertising, and we do not track you across other websites.
        </p>
      </Section>

      <Section title="Who runs this">
        <p>
          IGCSE Malay Master is run by an individual developer in Malaysia as a free study aid. Contact:{' '}
          <strong style={{ color: 'var(--color-text)' }}>{CONTACT}</strong>.
        </p>
      </Section>

      <Section title="What we collect">
        <p><strong style={{ color: 'var(--color-text)' }}>Without an account:</strong> nothing that identifies
          you. Your flashcards, progress and settings are saved inside your own browser and never leave your device.</p>
        <p><strong style={{ color: 'var(--color-text)' }}>With an account:</strong> your email address (used only
          to sign you in), and your study data so it can sync across your devices — flashcards and review
          history, mistakes you have logged, writing you have submitted for feedback, speaking-practice scores,
          saved translations, and your settings.</p>
        <p>We also keep basic usage counters so the app can stay within its own service limits.</p>
      </Section>

      <Section title="What we never collect">
        <p><strong style={{ color: 'var(--color-text)' }}>Your voice.</strong> Speaking practice uses your
          microphone only to time your turn. The recording is never saved to a file and never sent anywhere —
          it is discarded the instant you stop. Only your own self-grade and band score are kept.</p>
        <p><strong style={{ color: 'var(--color-text)' }}>Payment details.</strong> The app is free and takes no
          payments, so there is nothing to collect.</p>
        <p>We do not build advertising profiles and we do not follow you to other sites.</p>
      </Section>

      <Section title="AI features and your own key">
        <p>
          Roleplay, writing feedback and Cikgu Maya run on an AI provider using an API key that{' '}
          <em>you</em> paste into Settings. When you use those features, the text you submit goes directly
          from your browser to that provider — OpenRouter or Google, depending on what you configured. It does
          not pass through us, and we never see or store it. Your key is kept in your own browser only.
        </p>
        <p>Those providers have their own privacy policies, and your text is subject to them. Please do not
          type anything into an AI feature that you would not want a third party to process.</p>
      </Section>

      <Section title="Cookie Policy">
        <p>
          <strong style={{ color: 'var(--color-text)' }}>This site sets no cookies.</strong> That is why you
          are not being asked to dismiss a cookie banner.
        </p>
        <p>We do use your browser&apos;s local storage — a private store on your own device — to remember your
          flashcards, progress and settings. It is never sent to us unless you sign in and enable sync, and
          clearing your browser data erases it.</p>
        <p>We count page visits using Vercel Analytics, which is cookieless and does not store any identifier
          that could be used to recognise you later or on another site.</p>
      </Section>

      <Section title="Who else receives data">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong style={{ color: 'var(--color-text)' }}>Supabase</strong> — stores your account and synced study data.</li>
          <li><strong style={{ color: 'var(--color-text)' }}>Vercel</strong> — hosts the site and counts page visits.</li>
          <li><strong style={{ color: 'var(--color-text)' }}>OpenRouter / Google</strong> — only for AI features, only with your own key, only the text you submit.</li>
          <li><strong style={{ color: 'var(--color-text)' }}>Google Fonts, Google Translate, Wikidata, Hugging Face, jsDelivr</strong> — loading a font, translating a word, looking one up, or fetching a language model or a script means your device contacts them directly, so they can see your IP address.</li>
        </ul>
        <p>Some of these are outside Malaysia, so your data may be processed abroad.</p>
      </Section>

      <Section title="If you are under 18">
        <p>
          This app is built for IGCSE students, who are usually 14 to 16. You can use everything that runs in
          your own browser without an account or a parent&apos;s involvement. If you want to create an account,
          and you are below the age at which you can agree to this on your own where you live, please ask a
          parent or guardian first.
        </p>
      </Section>

      <Section title="Your rights">
        <p>You can see, correct, export or delete your data at any time. Deleting your account removes your
          profile, flashcards, review history, mistakes, writing, speaking scores and settings. One thing is
          kept: entries in the shared translation cache, because they are just word pairs other learners also
          use and hold nothing personal about you. To ask for a copy or a deletion, email {CONTACT}.</p>
        <p>We keep your data until you delete it. If an account goes unused for a long time, we may remove it
          after telling you first.</p>
      </Section>

      <Section title="Changes">
        <p>If this policy changes in a way that matters, the date at the top changes and we will say so in the
          app. Questions or complaints: {CONTACT}.</p>
      </Section>
    </>
  )
}

function Terms() {
  return (
    <>
      <Meta
        title="Terms of Use | IGCSE Malay Master"
        description="The terms for using IGCSE Malay Master — a free IGCSE revision aid. What it does, what it cannot promise, and what is expected of you."
      />
      <header className="pt-1">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText size={20} style={{ color: 'var(--color-accent)' }} aria-hidden={true} />
          Terms of Use
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-dim)' }}>Last updated {UPDATED}</p>
      </header>

      <Section title="What this is">
        <p>IGCSE Malay Master is a free study aid for IGCSE Malay and English, run by an individual developer
          in Malaysia. Using it means you accept these terms.</p>
      </Section>

      <Section title="It is a study aid, not a guarantee">
        <p>
          Nothing here is an official exam resource and nothing here promises a grade. The AI features in
          particular can be confidently wrong — bands, corrections and explanations are practice feedback, not
          marking. <strong style={{ color: 'var(--color-text)' }}>Always check anything important against your
          official syllabus, past papers and your teacher.</strong>
        </p>
      </Section>

      <Section title="Your account">
        <p>Keep your sign-in details to yourself and do not let someone else use your account. Tell us at{' '}
          {CONTACT} if you think someone else has got into it.</p>
      </Section>

      <Section title="Your own AI keys">
        <p>AI features run on a key you supply. That key, and anything the provider charges you for using it,
          is yours — we never bill you and we cannot refund a provider&apos;s charges. Keep an eye on your own
          usage there.</p>
      </Section>

      <Section title="Fair use">
        <p>Please do not try to break, overload or reverse-engineer the app, do not use it to harass anyone,
          and do not upload material you have no right to share. Upload other people&apos;s texts only where
          copying them for your own private study is allowed.</p>
      </Section>

      <Section title="Who owns what">
        <p>Your flashcards, your writing and your notes stay yours. The app itself, its code and its original
          content stay ours. Giving us your work so the app can give you feedback lets us process it for that
          purpose and nothing else.</p>
      </Section>

      <Section title="Availability">
        <p>This is a personal project offered free and as-is. It may be slow, go offline, lose a feature, or
          stop entirely. Please keep your own backup of anything you would be upset to lose — you can export
          your data at any time.</p>
      </Section>

      <Section title="Liability">
        <p>To the fullest extent the law allows, the app is provided without warranties, and we are not liable
          for losses arising from using it — including exam outcomes. Nothing here removes a right you have
          that cannot legally be removed.</p>
      </Section>

      <Section title="Governing law">
        <p>These terms are governed by the laws of Malaysia. Questions: {CONTACT}.</p>
      </Section>
    </>
  )
}

export default function Legal() {
  const isTerms = useLocation().pathname.startsWith('/terms')
  return (
    <div className="space-y-6 animate-fadeUp pb-8">
      {isTerms ? <Terms /> : <Privacy />}
      <hr style={{ borderColor: 'var(--color-border)' }} />
      <p className="text-sm">
        <Link to={isTerms ? '/privacy' : '/terms'} className="underline" style={{ color: 'var(--color-accent)' }}>
          {isTerms ? 'Read the Privacy Policy' : 'Read the Terms of Use'}
        </Link>
      </p>
    </div>
  )
}
