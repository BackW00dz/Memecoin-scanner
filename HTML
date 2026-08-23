<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CYBERLEEK Scanner — Solana Memecoin Dashboard</title>
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#2563eb">
  <meta name="description" content="Real-time Solana memecoin detection with momentum scoring">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f1419; color: #e0e6ed; }
    .container { max-width: 1200px; margin: 0 auto; padding: 16px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #1e2636; padding-bottom: 16px; }
    .header h1 { font-size: 24px; font-weight: 600; }
    .header-right { display: flex; gap: 16px; align-items: center; }
    button { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; }
    button:hover { background: #1d4ed8; }
    .status { font-size: 12px; color: #7f8998; }
    .controls { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    input, select { background: #1a1f2e; border: 1px solid #2d3748; color: #e0e6ed; padding: 8px 12px; border-radius: 6px; font-size: 14px; }
    .alerts { margin-bottom: 20px; }
    .alert { background: #7c2d12; border-left: 4px solid #ea580c; padding: 12px; border-radius: 4px; }
    .alert strong { color: #fda29b; }
    .alert span { display: block; font-size: 12px; color: #dbeafe; margin-top: 4px; }
    #tokenList { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .token-card { background: #1a1f2e; border: 1px solid #2d3748; border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s; }
    .token-card:hover { border-color: #2563eb; background: #1e2636; }
    .token-head { display: flex; gap: 12px; margin-bottom: 12px; }
    .token-icon { width: 48px; height: 48px; border-radius: 50%; background: #2d3748; flex-shrink: 0; }
    .token-name { flex: 1; }
    .token-name strong { font-size: 14px; display: block; }
    .token-name small { font-size: 12px; color: #7f8998; }
    .score { font-size: 18px; font-weight: 600; padding: 4px 8px; border-radius: 4px; background: #1e2636; width: 50px; text-align: center; }
    .score.watch { background: #7c2d12; color: #fda29b; }
    .score.low { background: #1e3a1f; color: #6ee7b7; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; font-size: 12px; }
    .stat label { color: #7f8998; display: block; margin-bottom: 2px; }
    .stat b { display: block; font-size: 14px; }
    .positive { color: #6ee7b7; }
    .negative { color: #fca5a5; }
    .risk-row { display: flex; justify-content: space-between; font-size: 12px; }
    .risk { padding: 2px 6px; border-radius: 3px; font-weight: 600; }
    .risk.good { background: #1e3a1f; color: #6ee7b7; }
    .risk.warn { background: #7c2d12; color: #fda29b; }
    .risk.bad { background: #7c2d12; color: #fca5a5; }
    .loading, .empty { text-align: center; color: #7f8998; padding: 40px; }
    #modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 1000; }
    #modal.hidden { display: none; }
    #modal:not(.hidden) { display: flex; align-items: center; justify-content: center; }
    #modalBackdrop { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
    .modal-content { background: #1a1f2e; border-radius: 8px; padding: 24px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; position: relative; z-index: 1001; }
    .detail-title { display: flex; gap: 16px; margin-bottom: 20px; }
    .detail-title img, .detail-title .token-icon { width: 64px; height: 64px; border-radius: 50%; }
    .detail-title h2 { font-size: 18px; margin-bottom: 4px; }
    .detail-title p { font-size: 12px; color: #7f8998; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .detail-box { background: #0f1419; padding: 12px; border-radius: 6px; }
    .detail-box small { display: block; color: #7f8998; font-size: 11px; margin-bottom: 4px; }
    .detail-box strong { display: block; font-size: 16px; }
    .action-row { display: flex; gap: 8px; margin-bottom: 16px; }
    .action-row a { flex: 1; text-align: center; padding: 8px; border-radius: 6px; text-decoration: none; font-size: 13px; }
    .action-row a.primary { background: #2563eb; color: white; }
    .action-row a { background: #2d3748; color: #e0e6ed; }
    .disclaimer { font-size: 11px; color: #7f8998; line-height: 1.5; }
    #closeModal { position: absolute; top: 16px; right: 16px; background: none; border: none; color: #e0e6ed; font-size: 24px; cursor: pointer; padding: 0; width: 32px; height: 32px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>🔍 CYBERLEEK Scanner</h1>
        <div class="status"><span id="statusText">Initializing…</span> · <span id="updatedText">Never</span></div>
      </div>
      <div class="header-right">
        <button id="refreshBtn">🔄 Scan Now</button>
      </div>
    </div>

    <div class="controls">
      <input id="searchInput" type="text" placeholder="Search token name or symbol…">
      <select id="sortSelect">
        <option value="score">Sort by Score</option>
        <option value="volume">Sort by Volume</option>
        <option value="change">Sort by 24h Change</option>
        <option value="liquidity">Sort by Liquidity</option>
        <option value="marketCap">Sort by Market Cap</option>
      </select>
      <span id="countText" style="align-self: center; font-size: 12px; color: #7f8998;">0 candidates</span>
    </div>

    <div id="alerts" class="alerts"></div>
    <div id="tokenList" class="loading">Initializing scanner…</div>
  </div>

  <div id="modal" class="hidden">
    <div id="modalBackdrop"></div>
    <div class="modal-content">
      <button id="closeModal">✕</button>
      <div id="detailContent"></div>
    </div>
  </div>

  <script src="scanner.js"></script>
</body>
</html>
