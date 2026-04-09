import Image from "next/image";

const workflow = [
  {
    step: "01",
    title: "Drop thoughts into Apple Notes",
    copy:
      "Write exactly how you already think. No commands, no templates, no forced structure.",
  },
  {
    step: "02",
    title: "Tap once from your home screen",
    copy:
      "A Shortcut sends the latest note from your Spark Inbox and kicks off the agent flow behind the scenes.",
  },
  {
    step: "03",
    title: "Spark routes the outcome",
    copy:
      "Calendar events, reminders, and saved notes land in the right place without any extra sorting.",
  },
];

const useCases = [
  {
    label: "Calendar event",
    note: "thursday 4pm coffee with sam, ask about the design sprint",
  },
  {
    label: "Reminder",
    note: "follow up with the landlord and send the insurance form",
  },
  {
    label: "Structured note",
    note: "idea: bundle all recurring saturday planning into one weekly review",
  },
];

const outcomes = [
  "Apple Notes first",
  "Google Calendar connected",
  "Email reminders ready",
  "Private dashboard",
];

const faqs = [
  {
    question: "Do I need to change how I take notes?",
    answer:
      "No. Write however you naturally think — messy, partial sentences, no structure needed. Spark figures out the intent.",
  },
  {
    question: "What gets created automatically?",
    answer:
      "Calendar events for anything date-based, reminders for follow-ups, and saved notes for ideas or references. All visible in your dashboard.",
  },
  {
    question: "Is my data private?",
    answer:
      "Yes. Your notes are processed and stored under your account only. Row-level security means no one else can see your data.",
  },
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <div className="page-grid" />

      <header className="site-header ui-fade-in">
        <a className="brand" href="#top" aria-label="Spark home">
          <Image
            src="/spark_mark_dark.png"
            alt="Spark logo"
            width={44}
            height={44}
            priority
          />
          <span>Spark</span>
        </a>

        <nav className="site-nav" aria-label="Primary">
          <a href="#how-it-works">How it works</a>
          <a href="#why-spark">Why Spark</a>
          <a href="#preview">Preview</a>
          <a href="#faq">FAQ</a>
        </nav>

        <a className="header-cta" href="/login">
          Get started
        </a>
      </header>

      <section className="hero ui-fade-in ui-fade-in--2" id="top">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            One thought, everything follows
          </div>

          <h1>
            Your notes
            <br />
            become action
            <br />
            without the busywork.
          </h1>

          <p className="hero-text">
            Spark turns messy Apple Notes into routed outcomes. Write naturally,
            tap once, and let the system decide what becomes a calendar event,
            a reminder, or a saved note.
          </p>

          <div className="hero-actions">
            <a className="primary-button" href="/login">
              Get started
            </a>
            <a className="secondary-button" href="#how-it-works">
              See how it works
            </a>
          </div>

          <div className="hero-metadata">
            {outcomes.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div className="hero-panel ui-fade-in ui-fade-in--3">
          <div className="panel-header">
            <div className="panel-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <span>Live routing preview</span>
          </div>

          <div className="signal-card">
            <div className="signal-card__label">Latest Spark Inbox note</div>
            <p>
              tomorrow morning remind me to send the deck, then block saturday
              afternoon for leetcode and save the podcast idea about personal
              context memory
            </p>
          </div>

          <div className="agent-flow">
            <div className="agent-node agent-node--active">
              <span>Parse</span>
              <strong>Extract date, intent, people, urgency</strong>
            </div>
            <div className="agent-node">
              <span>Classify</span>
              <strong>Route each item to the correct outcome</strong>
            </div>
            <div className="agent-results">
              <div>
                <em>Calendar</em>
                <strong>Saturday afternoon: Leetcode</strong>
              </div>
              <div>
                <em>Reminder</em>
                <strong>Send the deck tomorrow morning</strong>
              </div>
              <div>
                <em>Note</em>
                <strong>Podcast idea saved to dashboard</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip ui-fade-in ui-fade-in--3" aria-label="Product highlights">
        <p>Built for the way real notes look before they are organized.</p>
        <div>
          <span>Apple Notes</span>
          <span>LangGraph</span>
          <span>Google Calendar</span>
          <span>Supabase</span>
        </div>
      </section>

      <section className="section ui-fade-in ui-fade-in--4" id="how-it-works">
        <div className="section-heading">
          <span className="section-kicker">Flow</span>
          <h2>Keep the habit. Remove the sorting.</h2>
          <p>
            Spark is designed around the input method people already use:
            writing fast, vaguely, and out of order.
          </p>
        </div>

        <div className="workflow-grid">
          {workflow.map((item) => (
            <article className="workflow-card" key={item.step}>
              <span className="workflow-step">{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section split-section ui-fade-in ui-fade-in--4" id="why-spark">
        <div className="section-heading section-heading--compact">
          <span className="section-kicker">Intent</span>
          <h2>Messy in. Structured out.</h2>
          <p>
            Write the way you actually think. Spark handles the classification
            so nothing gets lost in a pile of unprocessed notes.
          </p>
        </div>

        <div className="notes-grid">
          {useCases.map((item) => (
            <article className="note-card" key={item.label}>
              <span>{item.label}</span>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section ui-fade-in ui-fade-in--4" id="preview">
        <div className="dashboard-card">
          <div className="dashboard-card__copy">
            <span className="section-kicker">Dashboard</span>
            <h2>Every routed note, visible in one place.</h2>
            <p>
              After each Shortcut run, your dashboard updates with what Spark
              created — calendar events, reminders, and saved notes all in one
              feed.
            </p>
          </div>

          <div className="dashboard-mock">
            <div className="dashboard-topbar">
              <div className="dashboard-brand">
                <Image
                  src="/spark_mark_light.png"
                  alt="Spark logo"
                  width={28}
                  height={28}
                />
                <span>Spark Console</span>
              </div>
              <span className="dashboard-status">AI routing active</span>
            </div>

            <div className="dashboard-columns">
              <div className="dashboard-column">
                <h3>Incoming note</h3>
                <div className="dashboard-note">
                  call dentist next tuesday, renew passport soon, save the
                  article about memory systems
                </div>
              </div>
              <div className="dashboard-column">
                <h3>Detected outputs</h3>
                <ul>
                  <li>calendar event</li>
                  <li>reminder</li>
                  <li>knowledge note</li>
                </ul>
              </div>
              <div className="dashboard-column">
                <h3>Agent status</h3>
                <div className="status-stack">
                  <span>parse complete</span>
                  <span>intent classified</span>
                  <span>ready to dispatch</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section faq-section" id="faq">
        <div className="section-heading section-heading--compact">
          <span className="section-kicker">FAQ</span>
          <h2>Common questions.</h2>
        </div>

        <div className="faq-grid">
          {faqs.map((item) => (
            <article key={item.question}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-banner">
        <div>
          <span className="section-kicker">Get started</span>
          <h2>Stop sorting. Start doing.</h2>
        </div>
        <a className="primary-button" href="/login">
          Create your account
        </a>
      </section>
    </main>
  );
}
