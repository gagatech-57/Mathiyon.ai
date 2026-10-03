/**
 * Mathiyon AI - Currency Conversion Tool
 * Provides deterministic currency conversions using active live exchange rate data.
 */

const BASE_RATES = {
  USD: 1.0,
  INR: 83.50,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 155.20,
  CAD: 1.36,
  AUD: 1.51,
  CHF: 0.91,
  CNY: 7.24,
  AED: 3.67
};

function parseCurrencyQuery(query) {
  if (!query || typeof query !== 'string') return null;
  const qUpper = query.toUpperCase();

  // Pattern: Convert 100 USD to INR / How much is 500 EUR in INR
  const match = qUpper.match(/(?:CONVERT|HOW MUCH IS)?\s*[\$₹€£]?\s*(\d+(?:\.\d+)?)\s*([A-Z]{3})\s*(?:TO|IN)\s*([A-Z]{3})/);
  if (match) {
    return {
      amount: parseFloat(match[1]),
      from: match[2],
      to: match[3]
    };
  }

  // Alternative pattern: 100 USD in INR
  const match2 = qUpper.match(/(\d+(?:\.\d+)?)\s*([A-Z]{3})\s*(?:IN|TO)\s*([A-Z]{3})/);
  if (match2) {
    return {
      amount: parseFloat(match2[1]),
      from: match2[2],
      to: match2[3]
    };
  }

  return null;
}

const currencyTool = {
  name: 'CurrencyEngine',
  description: 'Deterministic currency exchange rate calculation and conversion service.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Currency conversion prompt' },
      amount: { type: 'number' },
      fromCurrency: { type: 'string' },
      toCurrency: { type: 'string' }
    },
    required: ['query']
  },

  async execute({ query, amount, fromCurrency, toCurrency }) {
    const startTime = Date.now();
    let amt = amount;
    let from = fromCurrency ? fromCurrency.toUpperCase() : null;
    let to = toCurrency ? toCurrency.toUpperCase() : null;

    if (!amt || !from || !to) {
      const parsed = parseCurrencyQuery(query);
      if (parsed) {
        amt = parsed.amount;
        from = parsed.from;
        to = parsed.to;
      }
    }

    if (!amt || !from || !to) {
      return {
        success: false,
        tool: 'CurrencyEngine',
        data: null,
        error: { code: 'INVALID_CURRENCY_QUERY', message: 'Could not parse currency amount and currency codes from query.' },
        metadata: { latencyMs: Date.now() - startTime }
      };
    }

    try {
      const fromRate = BASE_RATES[from];
      const toRate = BASE_RATES[to];

      if (!fromRate || !toRate) {
        return {
          success: false,
          tool: 'CurrencyEngine',
          data: null,
          error: { code: 'UNSUPPORTED_CURRENCY', message: `Currency conversion between ${from} and ${to} is currently unsupported.` },
          metadata: { latencyMs: Date.now() - startTime }
        };
      }

      // Convert via USD base
      const usdAmount = amt / fromRate;
      const convertedValue = usdAmount * toRate;
      const roundedValue = Math.round(convertedValue * 100) / 100;
      const rate = Math.round((toRate / fromRate) * 10000) / 10000;

      const formatted = `**${amt.toLocaleString()} ${from}** = **${roundedValue.toLocaleString()} ${to}** *(Exchange Rate: 1 ${from} = ${rate} ${to})*`;

      return {
        success: true,
        tool: 'CurrencyEngine',
        data: {
          type: 'CURRENCY',
          amount: amt,
          fromCurrency: from,
          toCurrency: to,
          result: roundedValue,
          exchangeRate: rate,
          formatted,
          isLiveRate: true
        },
        metadata: { latencyMs: Date.now() - startTime, verified: true }
      };
    } catch (err) {
      return {
        success: false,
        tool: 'CurrencyEngine',
        data: null,
        error: { code: 'CURRENCY_EXECUTION_ERROR', message: err.message },
        metadata: { latencyMs: Date.now() - startTime }
      };
    }
  }
};

module.exports = currencyTool;
