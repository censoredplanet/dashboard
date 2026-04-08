---
title: CenAlert — An Early-Warning System for Internet Censorship
---

<link rel="stylesheet" href="./styles/blogpost.css">
<div class="blog-container">
<div class="post-hero card">
  <div class="post-hero-title">CenAlert: An early-warning system for internet censorship, powered by search trends</div>
  <div class="post-hero-subtitle">When a government blocks social media or VPNs, people search for workarounds — fast. CenAlert watches those searches in real time to surface potential censorship events before they make the news.</div>
  <div class="post-hero-byline">From the Censored Planet research team · Research paper available at <a href="https://github.com/censoredplanet/cenalert-paper">GitHub</a>.</div>
  <div class="post-hero-body">
    <p>When Iran blocked Instagram in September 2022, or when Türkiye pulled the plug on Twitter ahead of elections, something predictable happened: millions of people suddenly started searching for VPNs. That spike in search activity is a signal — and CenAlert is built to catch it.</p>
    <p>Developed by researchers at Censored Planet, CenAlert is an open-source alerting system that monitors Google Trends data across 76 countries to detect unusual spikes in searches for censorship circumvention tools, primarily VPNs. When a spike is detected, the system flags it for investigation by journalists, academics, and digital rights organizations.</p>
    <p>In an evaluation covering 2011–2024, the vast majority of CenAlert's highest-impact alerts were explainable — 76 of the top 100 coincided directly with documented censorship events. The system typically detects spikes the same day they begin.</p>
  </div>
</div>

<div class="grid grid-cols-3 stats-grid">
  <div class="card stat-card">
    <div class="stat-number">76</div>
    <div class="stat-label">countries monitored for censorship-related search spikes</div>
  </div>
  <div class="card stat-card">
    <div class="stat-number">&lt;100</div>
    <div class="stat-label">alerts per year on average — a manageable volume for human review</div>
  </div>
  <div class="card stat-card">
    <div class="stat-number">91%</div>
    <div class="stat-label">of cumulative impact in highly restrictive countries is explainable as censorship</div>
  </div>
</div>

<div class="post-section card">
  <div class="section-heading">Why VPN searches?</div>
  <div class="section-body">
    <p>When access to websites or apps is suddenly restricted, users who want to get around those restrictions reach for circumvention tools — and the most common first step is searching online. VPNs (Virtual Private Networks) are by far the most searched-for circumvention tool globally, making VPN search volume a reliable proxy for censorship demand.</p>
    <p>The researchers tested alternative signals — Tor, Psiphon, proxy servers — but found VPN searches offered the widest geographic coverage and most consistent data quality. They also tested control topics unrelated to censorship and found no significant correlation with known censorship events, validating the approach.</p>
  </div>
</div>

<div class="post-section card">
  <div class="section-heading">How it works</div>
  <div class="section-body">
    <div class="step-list">
      <div class="step-item">
        <div class="step-number">1</div>
        <div class="step-content"><span class="step-label">Data collection.</span> Google Trends data for VPN searches is collected daily for each country. Because Google only provides relative, sampled data, CenAlert downloads 45 overlapping time windows per country and stitches them together to reconstruct a consistent 14-year daily time series with negligible error.</div>
      </div>
      <div class="step-item">
        <div class="step-number">2</div>
        <div class="step-content"><span class="step-label">Spike detection.</span> An anomaly detection algorithm (Z-Score with a sliding window) continuously watches for days where search volume is statistically unusual compared to recent history. It works online — meaning it only uses past data — so alerts can be issued the moment a spike begins.</div>
      </div>
      <div class="step-item">
        <div class="step-number">3</div>
        <div class="step-content"><span class="step-label">Anomaly sizing.</span> Once a spike starts, CenAlert tracks when it ends using an "efficiency ratio" — a measure of whether the time series is trending in a direction or settling back to normal. This allows the system to measure not just that something happened, but how large and sustained it was.</div>
      </div>
      <div class="step-item">
        <div class="step-number">4</div>
        <div class="step-content"><span class="step-label">Impact scoring.</span> Each anomaly receives an impact factor — the total area above the detection threshold over the duration of the spike. Higher impact means a bigger, longer, or more intense surge in circumvention searches. This score helps prioritize which alerts most warrant investigation.</div>
      </div>
      <div class="step-item">
        <div class="step-number">5</div>
        <div class="step-content"><span class="step-label">Alert delivery.</span> Detected spikes are surfaced through a public dashboard, an API, and a Slack webhook — giving organizations multiple ways to integrate CenAlert into their monitoring workflows.</div>
      </div>
    </div>
  </div>
</div>

<div class="post-section card">
  <div class="section-heading">What CenAlert has found</div>
  <div class="section-body">
    <p>Across the top 100 highest-impact spikes in the evaluation dataset, CenAlert identified events across 58 countries. Here are a few illustrative examples:</p>
    <div class="event-list">
      <div class="event-item">
        <div class="event-flag">🇮🇳</div>
        <div class="event-content">
          <div class="event-title">India, January 2020</div>
          <div class="event-desc">After a six-month total internet shutdown in Jammu and Kashmir, authorities restored access to only 301 approved websites — triggering a surge in VPN searches as residents sought to reach the broader internet.</div>
          <div class="event-tag tag-censorship">Verified censorship</div>
        </div>
      </div>
      <div class="event-item">
        <div class="event-flag">🇹🇷</div>
        <div class="event-content">
          <div class="event-title">Türkiye, August 2024</div>
          <div class="event-desc">Instagram was blocked after the platform removed condolence messages for a recently assassinated Hamas leader. Officials cited Turkish law violations.</div>
          <div class="event-tag tag-censorship">Verified censorship</div>
        </div>
      </div>
      <div class="event-item">
        <div class="event-flag">🇪🇹</div>
        <div class="event-content">
          <div class="event-title">Ethiopia, February 2023</div>
          <div class="event-desc">Social media was blocked to suppress coverage of unrest following accusations of ethnic discrimination within the Orthodox Church.</div>
          <div class="event-tag tag-censorship">Verified censorship</div>
        </div>
      </div>
      <div class="event-item">
        <div class="event-flag">🇺🇸</div>
        <div class="event-content">
          <div class="event-title">United States, 2017</div>
          <div class="event-desc">The highest-impact U.S. spike coincided with a congressional vote to allow ISPs to sell user browsing data to advertisers without consent.</div>
          <div class="event-tag tag-privacy">Privacy legislation</div>
        </div>
      </div>
    </div>
    <p>The system has also detected censorship of circumvention tools themselves — including Russia's blocking of VPNs not registered with the government, Iran's restrictions on the PPTP protocol and unregistered VPNs, and repeated crackdowns in both countries on specific VPN services.</p>
  </div>
</div>

<div class="post-section card">
  <div class="section-heading">Known limitations</div>
  <div class="section-body">
    <p>CenAlert is candid about what it cannot reliably detect:</p>
    <div class="limitation-list">
      <div class="limitation-item">
        <div class="limitation-label">Subnational blocking</div>
        <div class="limitation-desc">When censorship is limited to a region, state, or city — common in India — it may not affect national-level search volumes enough to trigger an alert. About 70% of community-reported regional blocking events went undetected.</div>
      </div>
      <div class="limitation-item">
        <div class="limitation-label">Short-lived blocks</div>
        <div class="limitation-desc">Blocks lasting less than a day — like Venezuela's repeated short-term blackouts during opposition broadcasts — are largely missed. About 84% of sub-24-hour events went undetected.</div>
      </div>
      <div class="limitation-item">
        <div class="limitation-label">Marginalized communities</div>
        <div class="limitation-desc">Blocking that disproportionately affects minority groups, LGBT communities, or specific political dissidents may not drive enough aggregate search activity to register as a spike.</div>
      </div>
      <div class="limitation-item">
        <div class="limitation-label">Platforms with easy alternatives</div>
        <div class="limitation-desc">When a blocked platform has a widely-used domestic substitute — like Signal in Iran, where Telegram dominates — users may not search for VPNs, muting the signal even when a real block has occurred.</div>
      </div>
    </div>
  </div>
</div>

<div class="post-section card">
  <div class="section-heading">For reporters and activists</div>
  <div class="section-body">
    <p>CenAlert is designed to complement — not replace — on-the-ground reporting and active network measurement. Its value is in speed and scale: it can surface a potential censorship event in a country that might not have any international monitoring presence, often on the same day restrictions begin.</p>
    <p>The alert volume is deliberately kept low. From 2020 to 2024, CenAlert generated fewer than 100 global alerts per year — comparable to what Access Now and Pulse report as human-documented censorship events annually. Organizations in any given region would see only a handful of alerts per month.</p>
    <p>The researchers also note that CenAlert catches events that simply don't receive international press attention — particularly in countries like Egypt, Turkmenistan, and Uzbekistan, where independent journalism faces severe restrictions.</p>
  </div>
</div>

<div class="post-section card post-access-card">
  <div class="section-heading">Access CenAlert</div>
  <div class="section-body">
    <p>CenAlert is free and open to use. Access the dashboard, API, or source code:</p>
    <div class="access-links">
      <a class="access-link" href="https://dashboard.censoredplanet.org/cenalert.html">Live dashboard</a>
      <a class="access-link" href="https://github.com/censoredplanet/cenalert">GitHub (dashboard)</a>
      <a class="access-link" href="https://github.com/censoredplanet/cenalert-paper">GitHub (research)</a>
    </div>
  </div>
</div>
</div>