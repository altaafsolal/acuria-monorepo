import { useEffect, useRef } from 'react';

interface TvSymbol {
  name: string;
  displayName: string;
}

function TradingViewMarketQuotes({ title, symbols }: { title: string; symbols: TvSymbol[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    container.innerHTML = '';

    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    container.appendChild(widget);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: '100%',
      height: 500,
      symbolsGroups: [{ name: title, symbols }],
      showSymbolLogo: true,
      isTransparent: true,
      colorTheme: 'light',
      locale: 'fr',
    });
    container.appendChild(script);

    return () => { container.innerHTML = ''; };
  }, []);

  return <div className="tradingview-widget-container" ref={ref} />;
}

function TradingViewAdvancedChart() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    container.innerHTML = '';

    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.height = '100%';
    container.appendChild(widget);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: 'INDEX:CAC40',
      interval: 'D',
      timezone: 'Europe/Paris',
      theme: 'light',
      style: '1',
      locale: 'fr',
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
    });
    container.appendChild(script);

    return () => { container.innerHTML = ''; };
  }, []);

  return (
    <div
      className="tradingview-widget-container"
      ref={ref}
      style={{ height: '100%' }}
    />
  );
}

const WIDGET_ROWS: Array<Array<{ emoji: string; title: string; symbols: TvSymbol[] }>> = [
  [
    {
      emoji: '🌍',
      title: 'Indices',
      symbols: [
        { name: 'INDEX:CAC40', displayName: 'CAC 40' },
        { name: 'SP:SPX', displayName: 'S&P 500' },
        { name: 'NASDAQ:COMP', displayName: 'NASDAQ 100' },
        { name: 'INDEX:SX5E', displayName: 'Eurostoxx 50' },
        { name: 'INDEX:DAX', displayName: 'DAX 40' },
        { name: 'SPREADEX:UK100', displayName: 'FTSE 100' },
        { name: 'TVC:NI225', displayName: 'Nikkei 225' },
        { name: 'DJ:DJI', displayName: 'Dow Jones' },
      ],
    },
    {
      emoji: '💱',
      title: 'Devises',
      symbols: [
        { name: 'FX:EURUSD', displayName: 'EUR/USD' },
        { name: 'FX:EURGBP', displayName: 'EUR/GBP' },
        { name: 'FX:EURCHF', displayName: 'EUR/CHF' },
        { name: 'FX:EURJPY', displayName: 'EUR/JPY' },
        { name: 'FX:USDCHF', displayName: 'USD/CHF' },
        { name: 'FX:GBPUSD', displayName: 'GBP/USD' },
        { name: 'FX:USDJPY', displayName: 'USD/JPY' },
        { name: 'FX:USDCAD', displayName: 'USD/CAD' },
      ],
    },
  ],
  [
    {
      emoji: '🛢',
      title: 'Matières premières & Crypto',
      symbols: [
        { name: 'TVC:GOLD', displayName: 'Or (XAU/USD)' },
        { name: 'TVC:SILVER', displayName: 'Argent (XAG/USD)' },
        { name: 'TVC:USOIL', displayName: 'Pétrole WTI' },
        { name: 'TVC:UKOIL', displayName: 'Pétrole Brent' },
        { name: 'BITSTAMP:BTCUSD', displayName: 'Bitcoin' },
        { name: 'BITSTAMP:ETHUSD', displayName: 'Ethereum' },
        { name: 'COINBASE:SOLUSD', displayName: 'Solana' },
        { name: 'BITSTAMP:XRPUSD', displayName: 'XRP' },
      ],
    },
    {
      emoji: '🏢',
      title: 'Actions françaises',
      symbols: [
        { name: 'EURONEXT:MC', displayName: 'LVMH' },
        { name: 'EURONEXT:OR', displayName: "L'Oréal" },
        { name: 'EURONEXT:AI', displayName: 'Air Liquide' },
        { name: 'EURONEXT:BNP', displayName: 'BNP Paribas' },
        { name: 'EURONEXT:SAN', displayName: 'Sanofi' },
        { name: 'EURONEXT:TTE', displayName: 'TotalEnergies' },
        { name: 'EURONEXT:SU', displayName: 'Schneider Electric' },
        { name: 'EURONEXT:RI', displayName: 'Pernod Ricard' },
      ],
    },
  ],
  [
    {
      emoji: '🇺🇸',
      title: 'Actions US',
      symbols: [
        { name: 'NASDAQ:AAPL', displayName: 'Apple' },
        { name: 'NASDAQ:MSFT', displayName: 'Microsoft' },
        { name: 'NASDAQ:GOOGL', displayName: 'Alphabet' },
        { name: 'NASDAQ:AMZN', displayName: 'Amazon' },
        { name: 'NASDAQ:NVDA', displayName: 'NVIDIA' },
        { name: 'NYSE:BRK.B', displayName: 'Berkshire Hathaway' },
        { name: 'NYSE:JPM', displayName: 'JPMorgan Chase' },
        { name: 'NYSE:V', displayName: 'Visa' },
      ],
    },
    {
      emoji: '📊',
      title: 'Obligations',
      symbols: [
        { name: 'TVC:FR10Y', displayName: 'OAT 10 ans (France)' },
        { name: 'TVC:DE10Y', displayName: 'Bund 10 ans (Allemagne)' },
        { name: 'TVC:US10Y', displayName: 'T-Bond 10 ans (USA)' },
        { name: 'TVC:IT10Y', displayName: 'BTP 10 ans (Italie)' },
        { name: 'TVC:ES10Y', displayName: 'Bono 10 ans (Espagne)' },
        { name: 'TVC:GB10Y', displayName: 'Gilt 10 ans (UK)' },
        { name: 'TVC:JP10Y', displayName: 'JGB 10 ans (Japon)' },
        { name: 'TVC:CH10Y', displayName: 'OBL 10 ans (Suisse)' },
      ],
    },
  ],
];

export default function MarchesPage() {
  return (
    <div className="page-content">
      {WIDGET_ROWS.map((row, rowIndex) => (
        <div
          key={rowIndex}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}
        >
          {row.map((widget) => (
            <div key={widget.title} className="card card--padded">
              <h3
                className="card-title"
                style={{ marginBottom: 14 }}
              >
                {widget.emoji} {widget.title}
              </h3>
              <TradingViewMarketQuotes title={widget.title} symbols={widget.symbols} />
            </div>
          ))}
        </div>
      ))}

      <p className="stats-section-label">Graphique interactif</p>
      <div className="card" style={{ padding: 0, overflow: 'hidden', height: 500 }}>
        <TradingViewAdvancedChart />
      </div>
    </div>
  );
}
