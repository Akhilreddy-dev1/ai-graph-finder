import React from 'react'

function BrandMark() {
  return (
    <span className="landing-brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  )
}

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>
}

function FeatureIcon({ type }) {
  if (type === 'camera') return <span aria-hidden="true">⌁</span>
  if (type === 'assistant') return <span aria-hidden="true">✦</span>
  return <span aria-hidden="true">◌</span>
}

export default function LandingPage({ onEnter }) {
  return (
    <div className="landing-shell">
      <div className="landing-glow landing-glow-purple" />
      <div className="landing-glow landing-glow-cyan" />
      <header className="landing-nav">
        <div className="landing-brand">
          <BrandMark />
          <span>AI Graph Finder</span>
        </div>
        <div className="landing-nav-actions">
          <span className="landing-nav-note">Visual intelligence for complex systems</span>
          <button type="button" className="landing-nav-button" onClick={onEnter}>Open Studio <ArrowIcon /></button>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="landing-kicker"><span className="landing-kicker-dot" /> GRAPH EXPLORATION, REIMAGINED</p>
            <h1>See the shape of <em>what&apos;s connected.</em></h1>
            <p className="landing-lede">Turn charts, commands, and ideas into a living 3D graph. AI Graph Finder gives every relationship a place to land—and makes the hidden structure easy to explore.</p>
            <div className="landing-actions">
              <button type="button" className="landing-primary" onClick={onEnter}>Enter 3D Node Studio <ArrowIcon /></button>
              <button type="button" className="landing-secondary" onClick={onEnter}>Explore a demo graph</button>
            </div>
            <div className="landing-proof">
              <span><i /> No setup required</span>
              <span><i /> Bring your own Groq key</span>
              <span><i /> Live session streaming</span>
            </div>
          </div>
          <div className="landing-visual" aria-label="Decorative 3D network graph">
            <div className="landing-visual-orbit orbit-one" />
            <div className="landing-visual-orbit orbit-two" />
            <svg className="landing-graph-lines" viewBox="0 0 560 470" aria-hidden="true">
              <path d="M82 282 204 115 342 205 467 91M204 115l73 268 65-178 125 102M82 282l195 101 190-102" />
              <path className="line-accent" d="M204 115 342 205 467 91" />
            </svg>
            <div className="landing-node node-a"><span>01</span></div>
            <div className="landing-node node-b"><span>AI</span></div>
            <div className="landing-node node-c"><span>03</span></div>
            <div className="landing-node node-d"><span>∞</span></div>
            <div className="landing-node node-e"><span>02</span></div>
            <div className="landing-visual-label label-top">LIVE TOPOLOGY <b>●</b></div>
            <div className="landing-visual-label label-bottom">DRAG <span>•</span> ORBIT <span>•</span> DISCOVER</div>
          </div>
        </section>

        <section className="landing-features">
          <div className="landing-section-heading">
            <p className="landing-kicker">ONE WORKSPACE. MANY LENSES.</p>
            <h2>From raw signal to clear insight.</h2>
          </div>
          <div className="landing-feature-grid">
            {[
              ['camera', 'Vision capture', 'Photograph a chart and let a vision model recover its coordinates with precision.'],
              ['assistant', 'Contextual AI', 'Ask focused questions about trends, outliers, and the graph you are exploring.'],
              ['graph', 'Node Studio', 'Orbit a responsive 3D workspace that keeps sessions, artifacts, and links in view.'],
            ].map(([type, title, copy]) => (
              <article className="landing-feature-card" key={title}>
                <div className={`landing-feature-icon feature-${type}`}><FeatureIcon type={type} /></div>
                <h3>{title}</h3>
                <p>{copy}</p>
                <span className="landing-feature-arrow"><ArrowIcon /></span>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <span>AI GRAPH FINDER <b>·</b> NODE STUDIO</span>
        <span>Make the invisible legible.</span>
      </footer>
    </div>
  )
}

