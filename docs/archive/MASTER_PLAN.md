# IGCSE Malay Master — 18-Month Strategic Master Plan
## "From App to Platform: Building the Gold Standard Malay Study Tool"

**Version:** 1.0  
**Created:** 2026-04-07  
**Target Launch:** Q4 2027  
**Vision:** The #1 research-backed Malay language learning platform for IGCSE & beyond

---

## STRATEGIC VISION (18-Month Roadmap)

This document outlines the transformation from a functional single-app tool into a **comprehensive, AI-powered, community-driven learning ecosystem** that:
- ✅ **Maximizes learning outcomes** via spaced repetition + AI adaptation
- ✅ **Scales to 10K+ users** with social features + competition
- ✅ **Monetizes intelligently** (freemium model, teacher licenses, enterprise)
- ✅ **Sets the industry standard** for language learning pedagogy

---

## CURRENT STATE (April 2026)

### What We Have
- ✅ **React SPA** (igcse-malay-master) with Phase 1 features
- ✅ **506-word dictionary** (Malaysian Malay, manually verified)
- ✅ **7 study modes** (flashcard, quiz, type-answer, listen, cloze, speak, roleplay)
- ✅ **Leitner spaced repetition** (SM-2 algorithm)
- ✅ **Writing analyzers** (band estimation for English P2, Malay P2/P4)
- ✅ **9 roleplay scenarios** (IGCSE Paper 3 practice)
- ✅ **48+ grammar drills** (imbuhan, tense markers)
- ✅ **Keyboard shortcuts**, global search, undo, word-by-word translation
- ✅ **localStorage persistence** (Zustand), PWA-ready manifest

### What's Missing (Roadmap Items)
- ❌ Backend/database (currently all client-side)
- ❌ User accounts & cloud sync
- ❌ Real-time AI feedback (essays, speaking)
- ❌ Mobile app (iOS/Android)
- ❌ Teacher dashboard & classroom features
- ❌ Analytics & learning science insights
- ❌ Social features (leaderboards, study groups)
- ❌ Content beyond IGCSE (A-Levels, university)

---

## 18-MONTH ROADMAP (Detailed)

### PHASE 0: FOUNDATION & CONSOLIDATION (Months 1-2 | April-May 2026)
**Goal:** Merge best of both apps, establish scalable architecture

#### Deliverables
1. **Code Consolidation**
   - ✅ Merge React app + v7 HTML features into one codebase
   - ✅ Keep React version as primary (better for scaling)
   - Add missing v7 features to React: Cikgu chatbot, full export/import
   - Finalize 506-word dictionary + 37 phrases in data files
   - Test all 7 study modes + 9 roleplays end-to-end

2. **Architecture Setup**
   - Set up Git CI/CD pipeline (GitHub Actions for build/lint/test)
   - Deploy frontend to Vercel (auto-deploy on push to main)
   - Create `.env` file structure for API keys (Claude, Google Translate, etc.)
   - Implement error tracking (Sentry or LogRocket)

3. **Design System Finalization**
   - Complete Figma design file (components, colors, typography)
   - Map Figma components → React components (Code Connect)
   - Create component storybook (Storybook or Chromatic)
   - Document design tokens, spacing, motion

4. **Documentation**
   - Write ARCHITECTURE.md (data flow, state management, API contracts)
   - Create CONTRIBUTING.md (dev setup, branching, review process)
   - Set up wiki with feature explanations
   - Record 3-5 min walkthrough video of current app

#### Tools & Services
- **Frontend:** React 19, Vite, Tailwind CSS (current setup)
- **Deployment:** Vercel (free tier → pro as scaling demands)
- **Version Control:** GitHub (already using)
- **Error Tracking:** Sentry free tier
- **Design:** Figma (professional plan if needed)
- **CI/CD:** GitHub Actions
- **Collaboration:** Slack channel + weekly sync

**Effort:** 80 hours (2 sprints of 2 weeks)  
**Cost:** $0-50/month  
**Success Metrics:** 100% code coverage for Study mode, 0 console errors, <2s load time

---

### PHASE 1: CORE EXCELLENCE (Months 3-6 | June-September 2026)
**Goal:** Deepen learning science, add backend foundation, increase dictionary

#### Deliverables
1. **Expand Content Library**
   - Add **200+ vocabulary words** (50+ per IGCSE topic)
   - Expand roleplay scenarios: 9 → 18 (Paper 3 covering all contexts)
   - Add **Paper 4 essay templates** (4 types: surat, rencana, cerita, ucapan) ✅ (done in Phase 1 of React)
   - Create **50+ reading comprehension passages** with auto-generated questions
   - Add pronunciation guides (IPA) for top 200 words

2. **Spaced Repetition 2.0**
   - Replace simple SM-2 with **adaptive algorithm** (Anki-like ELO system)
   - Track: review history, difficulty, time-of-day performance
   - Implement **difficulty modulation** (harder words appear more often)
   - Add streak tracking + milestone celebrations (7-day, 30-day, 100-day)
   - Show learning curves & retention graphs

3. **AI Writing Feedback (MVP)**
   - Integrate Claude API for **per-sentence essay feedback**
   - Analyze: grammar, vocabulary, imbuhan usage, discourse markers
   - Provide: specific corrections + "why" explanations
   - Add **model answer bank** (50+ example essays with breakdowns)
   - Support both English (P2) and Malay (P2/P4)

4. **Backend Foundation**
   - Set up **Firebase/Supabase** project
   - Schema: users, cards, progress, sessions, feedbacks
   - Implement **user authentication** (email + Google OAuth)
   - Add **cloud sync** (store progress on server, sync across devices)
   - Create **REST API** (or GraphQL if scaling demands it)
   - Implement **backup/restore** of all user data

5. **User Profiles & Progress**
   - User signup flow (email/Google)
   - Profile dashboard (total cards, retention %, streak, level)
   - Weekly/monthly progress reports (PDF export)
   - Target-setting: "I want 80% retention by exam"
   - Progress visualization (heatmaps, learning curves)

#### Tools & Services
- **Database:** Supabase (PostgreSQL, free tier)
- **Authentication:** Firebase Auth or Supabase Auth
- **Backend:** Node.js + Express (optional, start with serverless)
- **AI API:** Claude API (Anthropic, rate-limited)
- **Analytics:** Posthog (privacy-first, free tier)
- **Email:** SendGrid or Mailgun (transactional emails)
- **CDN:** Cloudflare (caching, DDoS protection)

**Effort:** 200 hours (4 sprints of 2 weeks)  
**Cost:** $50-150/month (Firebase/Supabase, Claude API, CDN)  
**Success Metrics:** 1K words + 50 passages, cloud sync working, <5s essay feedback

---

### PHASE 2: AI & INTELLIGENT FEATURES (Months 7-10 | October-January 2027)
**Goal:** Make app feel "intelligent", personalized learning paths

#### Deliverables
1. **Conversation AI (Cikgu Bot 2.0)** ✅ (partial in current HTML)
   - Upgrade from rule-based to **Claude API**-powered
   - Commands: `/explain [word]`, `/quiz [topic]`, `/write [essay]`, `/speak [sentence]`
   - **Conversation memory** (remember user's mistakes, revisit them)
   - **Socratic method** (ask questions instead of giving answers)
   - Support **image uploads** (screenshot word lists → create deck)

2. **Speaking & Pronunciation (Web Speech API Enhanced)**
   - **Improved speech recognition** (longer sentences, accents)
   - **Phonetic breakdown** (show each syllable, stress pattern)
   - **Comparison mode** (user vs native speaker waveform)
   - Add pronunciation score: 0-100%
   - Record & save speaking attempts for playback

3. **Personalized Learning Paths**
   - **Diagnostic quiz** on signup (assess current level)
   - **Adaptive difficulty** (easy → medium → hard based on performance)
   - **Weak area detection** (focus on worst-performing topics)
   - **Learning goals** (IGCSE A*, B, C target) → auto-adjust pace
   - **Exam countdown** (days until IGCSE, estimated readiness)

4. **Interactive Sentence Builder**
   - **Drag-and-drop word reordering** (practice sentence structure)
   - **Grammar rule hints** (highlight imbuhan, tense markers)
   - **10+ sentence construction drills** (SVO, passive, complex)
   - **Real-time feedback** (✅ correct order, ❌ show error)

5. **Advanced Writing Tools**
   - **In-editor AI suggestions** (as user types essay)
   - **Plagiarism check** (flag suspicious phrases)
   - **Discourse marker insertion** (suggest connectives automatically)
   - **Synonym suggestions** (improve vocabulary diversity)
   - **Band prediction** (live: as you type, see estimated band)

6. **Reading Comprehension & Comprehension Q&A**
   - Import Malay passages (books, news articles)
   - **Auto-generate comprehension questions** (Claude → multiple choice, open-ended)
   - **Hint system** (click word → definition, click phrase → explanation)
   - Track reading speed + comprehension score
   - **Word frequency analysis** (which words in passage are hardest?)

#### Tools & Services
- **AI:** Claude API (Anthropic, higher rate limit)
- **Speech:** Web Speech API (native) + optional Deepgram for fallback
- **Database:** Upgrade Supabase plan (more API calls)
- **Real-time:** Firebase Realtime DB or Supabase Realtime (for live collab)
- **Monitoring:** Datadog or New Relic (app performance)

**Effort:** 250 hours (5 sprints of 2 weeks)  
**Cost:** $200-500/month (Claude API credits, DB, monitoring)  
**Success Metrics:** 95% user satisfaction with AI feedback, <3s API latency, 10K+ speaking attempts

---

### PHASE 3: MOBILE & PWA (Months 11-12 | February-March 2027)
**Goal:** Reach students on phones, work offline

#### Deliverables
1. **Progressive Web App (PWA)**
   - Service Worker for offline functionality
   - App shell caching (instant load on return)
   - Install prompts (add to home screen)
   - Push notifications (daily reminders, streak milestones)
   - **Native app-like experience** (full screen, no browser UI)

2. **Responsive Mobile Design**
   - Optimize **all 7 study modes** for mobile (touch-friendly)
   - Bottom navigation instead of top (thumb-reachable)
   - Vertical stacking (no side-by-side on small screens)
   - **Dark mode by default** (reduce eye strain)
   - Test on iOS + Android (Chrome, Safari, Firefox)

3. **Native Mobile Apps (React Native or Flutter)**
   - **Option A:** React Native (code sharing with web)
   - **Option B:** Flutter (if better performance needed)
   - Features: offline sync, push notifications, mic access, camera (for handwriting recognition)
   - Submit to Apple App Store + Google Play Store
   - Target: iOS 14+, Android 10+

4. **Offline Mode**
   - Study works completely offline
   - Sync when back online (conflict resolution: last-write-wins)
   - Indicate sync status to user (🟢 synced, 🟡 syncing, 🔴 offline)
   - Queue AI requests (send when online)

#### Tools & Services
- **Mobile Framework:** React Native or Flutter
- **App Distribution:** App Store Connect (Apple), Google Play Console
- **Push Notifications:** Firebase Cloud Messaging (FCM)
- **Analytics Mobile:** Amplitude or Mixpanel

**Effort:** 300 hours (6 sprints of 2 weeks)  
**Cost:** $100 (Apple dev account) + $500-1K (signing certs, deployment)  
**Success Metrics:** 50K+ downloads, 4.5+ star rating, <5% uninstall rate

---

### PHASE 4: ANALYTICS & OPTIMIZATION (Months 13-15 | April-June 2027)
**Goal:** Understand learning outcomes, optimize for results

#### Deliverables
1. **Learning Analytics Dashboard**
   - User engagement: daily active users, session duration, feature usage
   - Learning outcomes: retention %, time to mastery, test scores
   - Cohort analysis: which features drive better results?
   - **A/B testing framework** (test different lesson orderings, UI layouts)
   - **Retention funnel** (dropout rates by week, reason analysis)

2. **Teacher Analytics (if launching teacher mode)**
   - Class-level dashboards (student progress, class weak areas)
   - Detailed student profiles (what they struggle with)
   - Assignment builder (create custom decks for class)
   - Grading integration (import test scores, track improvement)

3. **Performance Optimization**
   - Lighthouse audit: 90+ score on performance, accessibility
   - Database query optimization (< 100ms for 99th percentile)
   - Image optimization (lazy load, WebP format)
   - Code splitting (load features on-demand)
   - Monitor API latency (99th percentile < 5 seconds)

4. **User Testing & Feedback**
   - Conduct **10-15 user interviews** (students, teachers)
   - Survey: "What would make this 10x better?"
   - Session recordings (Fullstory or Hotjar) to see how users interact
   - Implement **feedback widget** (in-app survey)
   - Monthly retrospectives on data

5. **Security & Privacy Audit**
   - **GDPR compliance** (data deletion, consent, export)
   - **CCPA compliance** (if US users)
   - Penetration testing (hire security firm or use HackerOne)
   - Data encryption (at rest + in transit)
   - Privacy policy + terms of service

#### Tools & Services
- **Analytics:** Posthog (self-hosted option available)
- **Session Recording:** Fullstory or Hotjar
- **A/B Testing:** LaunchDarkly or Split.io
- **Performance Monitoring:** Datadog or New Relic APM
- **Security:** Snyk (dependency scanning), OWASP ZAP (web scanning)

**Effort:** 150 hours (3 sprints of 2 weeks)  
**Cost:** $300-800/month (analytics, monitoring, security tools)  
**Success Metrics:** 70%+ 1-month retention, 4+ hour avg session/month, 95%+ uptime

---

### PHASE 5: COMMUNITY & MONETIZATION (Months 16-18 | July-September 2027)
**Goal:** Build community, sustainable revenue model

#### Deliverables
1. **Social Features**
   - **Study groups** (invite friends, shared decks)
   - **Leaderboards** (global, weekly, by topic)
   - **Achievements & badges** (milestone unlocks, streak badges)
   - **Study buddy matching** (find peers at same level)
   - **Activity feed** (see friends' progress, celebrate milestones)
   - **Referral system** (earn free premium time by inviting)

2. **Monetization Strategy (Freemium)**
   - **Free tier:** 100 cards max, basic study modes, 5 AI essays/month
   - **Pro ($10/month):** unlimited cards, all features, 100 essays/month
   - **Premium ($25/month):** 1-on-1 tutor chat, priority AI feedback, offline app
   - **Teacher license ($50/month):** class management, bulk student accounts
   - **School license ($500/month):** unlimited students, white-label, SSO

3. **Content Expansion**
   - Add **A-Level Malay** (natural next step after IGCSE)
   - Add **Malay for beginners** (General proficiency path)
   - Partner with **IGCSE curriculum providers** (licensed content)
   - Create **video lessons** (60-90 sec explanations per grammar topic)
   - Build **marketplace for teacher-created decks** (revenue share: 70/30)

4. **Marketing & Growth**
   - Launch **landing page** (pitch, testimonials, pricing)
   - SEO optimization (target: "best IGCSE Malay app", "Malay grammar practice")
   - **YouTube channel** (grammar tips, study hacks, student success stories)
   - **Reddit/TikTok presence** (engage IGCSE student communities)
   - **Press outreach** (EdTech news, language learning blogs)
   - Partnerships with **tuition centers** (bulk licenses, co-branding)

5. **Teacher Platform**
   - **Classroom mode** (teacher creates assignments, assigns to students)
   - **Auto-grading** (multiple choice + AI essay grading)
   - **Parent portal** (view student progress, set goals)
   - **Resource library** (share lesson plans, teaching tips)
   - **PD (Professional Development) courses** (how to use app in classroom)

#### Tools & Services
- **Payment Processing:** Stripe (handles subscriptions, multi-currency)
- **Email Marketing:** Mailchimp or ConvertKit
- **Video Hosting:** YouTube (free tier) or Vimeo Pro
- **SEO Tools:** Ahrefs or SEMrush
- **Social Media:** Hootsuite or Buffer
- **Community Platform:** Discord (free, for study groups)

**Effort:** 200 hours (4 sprints of 2 weeks)  
**Cost:** $500-2K/month (payment processing fees, marketing tools)  
**Revenue Goal:** $20K/month by end of Phase 5 (1K Pro users @ $10, 100 teachers @ $50)

---

## DETAILED TOOL RECOMMENDATIONS

### Frontend Development
| Tool | Purpose | Cost | Notes |
|------|---------|------|-------|
| **React 19** | UI library | Free | Already in use |
| **Vite 8** | Build tool | Free | Already in use |
| **Tailwind CSS 4** | Styling | Free | Already in use |
| **Zustand 5** | State (client) | Free | Already in use |
| **Lucide React** | Icons | Free | Already in use |
| **Framer Motion** | Animations | Free | Add smooth transitions |
| **React Query** | Server state | Free | Cache & sync data |
| **React Hook Form** | Form management | Free | Validation, UX |

### Backend & Database
| Tool | Purpose | Cost | Notes |
|------|---------|------|-------|
| **Supabase** | Database + Auth | Free tier, $25/mo | PostgreSQL, real-time |
| **Node.js + Express** | API server | Free | Optional (serverless first) |
| **Vercel Functions** | Serverless | Free tier | Deploy Claude API calls |
| **Firebase** | Alt to Supabase | Free tier | More integrations |
| **Redis** | Caching | $7-50/mo | Speed up API calls |

### AI Integration
| Tool | Purpose | Cost | Notes |
|------|---------|------|-------|
| **Claude API** | Text generation, feedback | Pay-per-token (~$0.01 per 1K tokens) | Best for educational content |
| **OpenAI GPT-4** | Alt to Claude | $0.03/1K tokens | Consider hybrid |
| **Anthropic SDK** | SDK for Claude | Free | Install in Node.js |
| **LangChain** | LLM orchestration | Free | Chain AI calls, memory |

### Analytics & Monitoring
| Tool | Purpose | Cost | Notes |
|------|---------|------|-------|
| **Posthog** | Product analytics | Free tier, $40/mo | Privacy-first, event tracking |
| **Sentry** | Error tracking | Free tier, $29/mo | Catch bugs in production |
| **Datadog** | APM | $15/month | Monitor API performance |
| **Hotjar** | Session recording | Free tier, $39/mo | See how users interact |
| **Google Analytics 4** | Website analytics | Free | Basic traffic tracking |

### Design & Prototyping
| Tool | Purpose | Cost | Notes |
|------|---------|------|-------|
| **Figma** | Design system | Free tier, $12/mo | Collaborative design |
| **Storybook** | Component library | Free | Document components |
| **Chromatic** | Visual regression | Free tier | Catch UI breaks |

### Testing & Quality
| Tool | Purpose | Cost | Notes |
|------|---------|------|-------|
| **Vitest** | Unit tests | Free | Fast, built-in coverage |
| **Playwright** | E2E tests | Free | Test user flows |
| **Lighthouse CI** | Performance tests | Free | Auto-check Lighthouse score |
| **Snyk** | Dependency scanning | Free tier | Find vulnerabilities |

### Deployment & Infrastructure
| Tool | Purpose | Cost | Notes |
|------|---------|------|-------|
| **Vercel** | Frontend hosting | Free tier, $25/mo pro | Automatic deploys, CDN |
| **Cloudflare** | CDN + DDoS protection | Free tier, $20/mo | Cache, security, speed |
| **GitHub Actions** | CI/CD | Free | Auto-test, auto-deploy |
| **Docker** | Containerization | Free | Consistency across environments |

### Payment & Monetization
| Tool | Purpose | Cost | Notes |
|------|---------|------|-------|
| **Stripe** | Payment processing | 2.9% + $0.30 per transaction | Subscriptions, invoices |
| **Paddle** | Payment processor alt | 5% + $0.50 | Includes VAT handling |

---

## DOCUMENTATION STRATEGY

### Where to Document the Plan
1. **This File:** Master plan (public GitHub README)
2. **GitHub Wiki:** Architecture diagrams, API specs, database schema
3. **Notion:** Weekly progress, sprint planning, team calendar
4. **Code Comments:** Inline architecture decisions (ADR format)
5. **Figma:** Design system documentation + component specs

### Documentation to Create by End of Phase 0
- [ ] **ARCHITECTURE.md** — System design, data flow, API contracts
- [ ] **DATABASE.md** — Schema, relationships, migration strategy
- [ ] **API_DOCS.md** — All endpoints, request/response examples
- [ ] **STYLE_GUIDE.md** — Code conventions, naming, file structure
- [ ] **DEPLOYMENT.md** — How to deploy to prod, rollback procedure
- [ ] **ROADMAP.md** — This master plan in abbreviated form
- [ ] **TESTING_STRATEGY.md** — How to test each feature type
- [ ] **SECURITY.md** — Data protection, privacy, compliance

---

## SUCCESS METRICS & KPIs (By Phase)

### Phase 0 (Foundation)
- ✅ 0 console errors on all routes
- ✅ <2s load time (Lighthouse 90+)
- ✅ 100% code coverage for Study.jsx
- ✅ Figma design system complete (40+ components)

### Phase 1 (Core Excellence)
- 📈 1K registered users
- 📈 70% 1-week retention
- 📈 5K words studied
- 📈 500 essays analyzed via AI

### Phase 2 (AI Features)
- 📈 5K registered users
- 📈 50% of sessions use AI features
- 📈 95% satisfaction with Cikgu Bot
- 📈 10K speaking attempts recorded

### Phase 3 (Mobile)
- 📈 10K app downloads
- 📈 4.5+ star rating (500+ reviews)
- 📈 30% DAU on mobile
- 📈 <5% churn rate

### Phase 4 (Analytics)
- 📈 50K registered users
- 📈 45% 30-day retention
- 📈 $10K MRR (Monthly Recurring Revenue)
- 📈 Lighthouse 95+ score

### Phase 5 (Community)
- 📈 100K+ registered users
- 📈 40% of users on paid tier
- 📈 $50K+ MRR
- 📈 Ranked #1 Malay learning app

---

## RESOURCE ALLOCATION & TEAM

### Phase 0-2 (DIY / Solo)
- **You:** 40 hrs/week (frontend, product decisions)
- **AI Builder (Claude Code):** 20 hrs/week (coding, testing)
- **Tools:** Figma (design), GitHub (version control), Supabase (database)

### Phase 3-4 (Small Team)
- **Hire: 1 Backend Engineer** ($50K/year)
- **Hire: 1 Designer** (contract, $30K/year)
- **You:** Product + frontend (30 hrs/week)
- **Freelance:** QA testing, content creation ($5K/month)

### Phase 5+ (Growth)
- **Hire: 1-2 more engineers** (frontend, mobile)
- **Hire: 1 Product Manager** (if not already you)
- **Hire: 1 Growth/Marketing person**
- **Content creators:** 2-3 teachers (part-time, curriculum)
- **Community manager:** 1 FTE (Discord, Reddit, support)

---

## ESTIMATED BUDGET (18 Months)

| Phase | Frontend | Backend | Tools | Team | AI/APIs | Total |
|-------|----------|---------|-------|------|---------|-------|
| **0-2** (5 mo) | $0 | $2K | $1.5K | $0 | $5K | **$8.5K** |
| **3-4** (6 mo) | $1K | $10K | $3K | $25K | $10K | **$49K** |
| **5** (3 mo) | $1K | $5K | $3K | $15K | $5K | **$29K** |
| **TOTAL** | **$2K** | **$17K** | **$7.5K** | **$40K** | **$20K** | **$86.5K** |

*Note: Team costs are salary, assumes India-based hires. Adjust for your region. SaaS tools scale with growth.*

---

## EXTERNAL COLLABORATORS & THEIR ROLES

### Suggested Partners by Phase

#### Phase 0-1: Design Partner
- **Tool:** Figma expert (contract designer)
- **Cost:** $3-5K for design system
- **Deliverable:** Complete component library, design tokens, Figma → React mapping

#### Phase 2: AI/ML Consultant
- **Role:** Optimize Claude prompts, design spaced repetition algorithm
- **Cost:** $5-10K (consultant, 10-20 hrs)
- **Deliverable:** Prompt engineering guide, personalization rules

#### Phase 3: Mobile Developer
- **Role:** React Native or Flutter app development
- **Cost:** Hire 1 FTE (~$50K/year) or freelance $100/hr
- **Deliverable:** iOS + Android apps in production

#### Phase 4: Growth Marketer
- **Role:** User acquisition, SEO, content marketing
- **Cost:** $3-5K/month or 20% of revenue
- **Deliverable:** 50K+ users by end of phase

#### Phase 5: Community Manager
- **Role:** Discord, Reddit, student testimonials, partnerships
- **Cost:** $2-3K/month (part-time)
- **Deliverable:** 10K+ community members, brand awareness

---

## ALTERNATIVE: OUTSOURCE VISUALS & DESIGN

If you want **beautiful UI without doing it yourself**, here are options:

### Option 1: UI/UX Design Service
- **UI Kit purchase:** Buy pre-built React component kit ($50-200)
  - Examples: **shadcn/ui** (free), **Material-UI** (free), **Chakra UI** (free)
  - Or premium: **NextUI**, **Mantine** ($100-500 one-time)
- **Custom design:** Hire Figma designer ($5K for design system)
- **Implementation:** Use Claude Code to implement designs

### Option 2: Design-to-Code Automation
- **Tools:** Figma → React auto-generators
  - **Locofy.ai** ($29-99/mo) — converts Figma designs to React code
  - **Relume AI** (free tier) — AI design suggestions
- **Workflow:** Design in Figma → Locofy auto-generates → you refine

### Option 3: Hire Design Team
- **Fiverr/Upwork:** Hire 1 designer ($20-50/hr, 20 hrs for Phase 0)
- **Agency:** Design studios ($10-20K for complete system)
- **In-house:** Hire 1 full-time designer ($40K+/year)

### Option 4: Use AI Design Tools
- **v0.dev** (Vercel) — AI code generation from text descriptions (free beta)
- **Galileo AI** — AI generates UI from wireframes
- **UiZard** — Figma-like tool with AI assistance

**My Recommendation:** Start with **shadcn/ui (free) + custom Figma design ($3K)**, then hire designer in Phase 3 when you have budget.

---

## NEXT IMMEDIATE STEPS (THIS WEEK)

### Day 1-2: Plan Approval
- [ ] Read this document thoroughly
- [ ] Decide: Will you follow this roadmap?
- [ ] Adjust timeline/budget if needed
- [ ] Pick ONE tool recommendation per category

### Day 3-5: Set Up Infrastructure
- [ ] Create GitHub Project board (Kanban: To Do / In Progress / Done)
- [ ] Set up Notion workspace (roadmap + sprint planning)
- [ ] Configure GitHub Actions for CI/CD
- [ ] Deploy current React app to Vercel (if not already done)
- [ ] Set up Sentry (error tracking)

### Week 2: Start Phase 0
- [ ] Merge React app + v7 features
- [ ] Write ARCHITECTURE.md
- [ ] Design in Figma (component library)
- [ ] Set up GitHub Wiki

---

## VISION STATEMENT

> By Q4 2027, **IGCSE Malay Master** will be the **#1 research-backed Malay language learning platform**, trusted by 100K+ students and 500+ teachers globally. We'll combine spaced repetition science, AI-powered personalized feedback, and community features to deliver outcomes that surpass traditional tutoring — at 1/10th the cost.

---

## APPENDIX A: PHASE 0 DELIVERABLES (DETAILED CHECKLIST)

### Code Consolidation
- [ ] Audit v7 HTML: list all unique features not in React
- [ ] Add Cikgu chatbot to React (from v7)
- [ ] Add full export/import to React
- [ ] Consolidate all 506 words into `src/data/dictionary.js`
- [ ] Add all 37 phrases to `src/data/phrases.js`
- [ ] Test all 7 study modes end-to-end
- [ ] Write unit tests for SM-2 algorithm
- [ ] Create component tests for Study.jsx

### Architecture Setup
- [ ] Initialize Supabase project
- [ ] Create Firebase project (alternative)
- [ ] Set up GitHub Actions workflow (lint → test → build → deploy)
- [ ] Configure Vercel deployment (auto-deploy main branch)
- [ ] Set up Sentry error tracking
- [ ] Create `.env.example` with all needed API keys

### Design System
- [ ] Create Figma file
- [ ] Document all colors (CSS variables → Figma)
- [ ] Create 40+ component designs
- [ ] Add typography specs (DM Sans sizes)
- [ ] Create animation library (fadeUp, slide, pulse)
- [ ] Map Figma → React components
- [ ] Create Storybook for component showcase

### Documentation
- [ ] Write ARCHITECTURE.md (2K words)
- [ ] Write DATABASE.md (schema, relationships)
- [ ] Create API_DOCS.md (if any backend exists)
- [ ] Write STYLE_GUIDE.md (code conventions)
- [ ] Create CONTRIBUTING.md (dev setup, PRs)
- [ ] Record 5-min walkthrough video
- [ ] Set up GitHub Wiki with nav

---

## APPENDIX B: MONTHLY EXECUTION TEMPLATE

### Each Month (Use Notion or GitHub Projects)
```
Month: [Month Name]
Phase: [Phase #]
Goal: [One-sentence goal]

Sprint 1 (Week 1-2)
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

Sprint 2 (Week 3-4)
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

Metrics
- Users: X
- Retention: X%
- Revenue: $X

Blockers
- [List any blocking issues]

Next Month Planning
- [Notes for next month]
```

---

## FINAL NOTES

This plan is **ambitious but achievable**. Key success factors:
1. **Stay focused on Phase 0 → 1** (don't skip to Phase 3 yet)
2. **Measure everything** (use analytics to validate assumptions)
3. **Talk to real users** (10+ interviews per phase)
4. **Automate everything** (CI/CD, deployments, testing)
5. **Scale incrementally** (1K → 5K → 50K users, don't jump to 100K)

You've already built the foundation. Now it's time to build the empire.

---

**Document Version:** 1.1  
**Last Updated:** 2026-04-11  
**Next Review:** 2026-05-07 (monthly)

---

## CHANGE LOG

### v1.1 — 2026-04-11 (Phase 0 Bug Fixes & Stabilization)
- [x] **Fixed Study page black screen bug** — `getDecks()`/`getFilteredCards()` selectors returned new arrays every render, causing infinite re-render loop that kept the fade-in animation at opacity:0. Fixed by computing derived state locally in component.
- [x] **Fixed useEffect missing dependency array** — Keyboard handler in Study.jsx was being added/removed on every render.
- [x] **Added ErrorBoundary component** — Catches React crashes gracefully with "Try Again" and "Reload" buttons instead of blank screen.
- [x] **Wired up streak milestone confetti** — `checkStreakMilestone()` existed in confetti.js but was never called. Now fires at 7, 14, 30, 50, 100, 365 day milestones.
- [x] **Added topic pack loaded indicators** — Settings page now shows which packs are already loaded with card count badge and green border.
- [x] **Added first-time onboarding flow** — New users see a 3-step welcome guide instead of an empty dashboard.

### Remaining Phase 0 Items
- [ ] Set up Git CI/CD pipeline (GitHub Actions)
- [ ] Deploy to Vercel
- [ ] Create .env file structure for API keys
- [ ] Implement error tracking (Sentry)
- [ ] Write unit tests for SM-2 algorithm
- [ ] Test all 7 study modes + 9 roleplays end-to-end

---

