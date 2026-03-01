import React from "react";

type HomeViewProps = {
  onSelectAgeGroup: (ageGroup: "kids" | "adults") => void;
};

export default function HomeView({ onSelectAgeGroup }: HomeViewProps) {
  return (
    <section className="home-view">
      <div className="home-hero">
        <span className="home-pill">Home</span>
        <h1>Slopyfy Home</h1>
        <p>Choose a collection to explore.</p>
        <div className="home-actions">
          <button className="primary-button" type="button" onClick={() => onSelectAgeGroup("kids")}>
            Shop Kids
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => onSelectAgeGroup("adults")}
          >
            Shop Adults
          </button>
        </div>
      </div>
      <div className="home-grid">
        <div className="home-card">
          <h2>Kids</h2>
          <p>Play-ready essentials sized for the little ones.</p>
        </div>
        <div className="home-card">
          <h2>Adults</h2>
          <p>Everyday layers and staples for grown-ups.</p>
        </div>
      </div>
    </section>
  );
}
