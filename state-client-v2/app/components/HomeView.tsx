import React from "react";

type HomeViewProps = {
  onOpenShop: () => void;
};

export default function HomeView({ onOpenShop }: HomeViewProps) {
  return (
    <section className="home-view">
      <div className="home-hero">
        <div className="home-hero-copy">
          <span className="home-pill">Assistant</span>
          <h1>Your Personal Agent</h1>
          <p>
            A single conversation can branch into different tools and surfaces. The home screen
            should feel like a command center, not a product page.
          </p>
          <div className="home-actions">
            <button className="primary-button home-primary-button" type="button" onClick={onOpenShop}>
              Start Session
            </button>
            <button className="secondary-button home-secondary-button" type="button">
              Review Briefing
            </button>
          </div>
          <div className="home-prompt-band">
            <span className="home-prompt-chip">&ldquo;What matters today?&rdquo;</span>
            <span className="home-prompt-chip">&ldquo;Summarize my priorities&rdquo;</span>
            <span className="home-prompt-chip">&ldquo;Open the right tool for this task&rdquo;</span>
          </div>
        </div>
        <div className="home-hero-panel">
          <div className="home-panel-label">Today</div>
          <div className="home-panel-time">9:41 AM</div>
          <div className="home-panel-summary">4 active threads, 2 follow-ups, 1 live shopping task</div>
          <div className="home-panel-list">
            <div className="home-panel-item">
              <span>Morning briefing</span>
              <strong>Ready</strong>
            </div>
            <div className="home-panel-item">
              <span>Travel research</span>
              <strong>Pending</strong>
            </div>
            <div className="home-panel-item">
              <span>Gift shortlist</span>
              <strong>Open</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="home-dashboard-grid">
        <div className="home-widget home-widget-weather">
          <div className="home-widget-kicker">Weather</div>
          <div className="home-widget-row">
            <div>
              <h2>San Francisco</h2>
              <p>62F, light wind, clear through the afternoon.</p>
            </div>
            <div className="home-widget-metric">62</div>
          </div>
        </div>

        <div className="home-widget home-widget-markets">
          <div className="home-widget-kicker">Markets</div>
          <div className="home-market-list">
            <div className="home-market-item">
              <span>NASDAQ</span>
              <strong>+0.8%</strong>
            </div>
            <div className="home-market-item">
              <span>S&P 500</span>
              <strong>+0.4%</strong>
            </div>
            <div className="home-market-item">
              <span>BTC</span>
              <strong>-1.2%</strong>
            </div>
          </div>
        </div>

        <div className="home-widget home-widget-sports">
          <div className="home-widget-kicker">Sports</div>
          <h2>Tonight&rsquo;s Watchlist</h2>
          <p>Warriors at Lakers, Knicks at Celtics, and late Premier League highlights.</p>
        </div>

        <div className="home-widget home-widget-agenda">
          <div className="home-widget-kicker">Focus Queue</div>
          <ul className="home-agenda-list">
            <li>Review afternoon schedule</li>
            <li>Compare travel options for next week</li>
            <li>Finish the active Slopyfy shopping thread</li>
          </ul>
        </div>
      </div>

      <div className="home-grid">
        <div className="home-card">
          <h2>General Entry Point</h2>
          <p>Use the same chat to launch research, planning, comparison, and domain-specific tools.</p>
        </div>
        <div className="home-card">
          <h2>Adaptive Interface</h2>
          <p>The first request can shift the layout into the right working mode without extra clicks.</p>
        </div>
        <div className="home-card home-card-accent">
          <h2>Demo Narrative</h2>
          <p>For this demo, one path opens Slopyfy. The home still reads like a broader personal agent.</p>
        </div>
      </div>
    </section>
  );
}
