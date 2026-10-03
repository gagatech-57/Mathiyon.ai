/**
 * Mathiyon AI - Unit Conversion Tool
 * Provides deterministic mathematical conversions for weight, distance, temperature, volume, and length.
 */

const CONVERSIONS = {
  // Weight
  'kg_to_lb': { factor: 2.20462, unitFrom: 'kg', unitTo: 'lbs', label: 'Kilograms to Pounds' },
  'lb_to_kg': { factor: 1 / 2.20462, unitFrom: 'lbs', unitTo: 'kg', label: 'Pounds to Kilograms' },
  'lbs_to_kg': { factor: 1 / 2.20462, unitFrom: 'lbs', unitTo: 'kg', label: 'Pounds to Kilograms' },

  // Distance / Length
  'km_to_miles': { factor: 0.621371, unitFrom: 'km', unitTo: 'miles', label: 'Kilometers to Miles' },
  'miles_to_km': { factor: 1 / 0.621371, unitFrom: 'miles', unitTo: 'km', label: 'Miles to Kilometers' },
  'meters_to_feet': { factor: 3.28084, unitFrom: 'meters', unitTo: 'feet', label: 'Meters to Feet' },
  'feet_to_meters': { factor: 1 / 3.28084, unitFrom: 'feet', unitTo: 'meters', label: 'Feet to Meters' },

  // Volume
  'liters_to_gallons': { factor: 0.264172, unitFrom: 'liters', unitTo: 'gallons', label: 'Liters to Gallons' },
  'gallons_to_liters': { factor: 1 / 0.264172, unitFrom: 'gallons', unitTo: 'liters', label: 'Gallons to Liters' },
};

function parseUnitQuery(query) {
  if (!query || typeof query !== 'string') return null;
  const qLower = query.toLowerCase().trim();

  // Special check: Temperature
  const tempMatch = qLower.match(/(-?\d+(?:\.\d+)?)\s*(?:°|deg|degree|degrees)?\s*(celsius|fahrenheit|c|f)\s*(?:in|to|into)\s*(?:°|deg|degree|degrees)?\s*(celsius|fahrenheit|c|f)/);
  if (tempMatch) {
    const val = parseFloat(tempMatch[1]);
    const from = tempMatch[2].startsWith('c') ? 'C' : 'F';
    const to = tempMatch[3].startsWith('c') ? 'C' : 'F';
    return { type: 'TEMPERATURE', value: val, from, to };
  }

  // Standard unit check
  const match = qLower.match(/(\d+(?:\.\d+)?)\s*([a-z]+)\s*(?:in|to|into)\s*([a-z]+)/);
  if (match) {
    return {
      type: 'STANDARD',
      value: parseFloat(match[1]),
      from: match[2],
      to: match[3]
    };
  }

  return null;
}

const unitConversionTool = {
  name: 'UnitConversionEngine',
  description: 'Deterministic unit conversion engine for weight, length, volume, and temperature.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Unit conversion query prompt' }
    },
    required: ['query']
  },

  async execute({ query }) {
    const startTime = Date.now();
    const parsed = parseUnitQuery(query);

    if (!parsed) {
      return {
        success: false,
        tool: 'UnitConversionEngine',
        data: null,
        error: { code: 'INVALID_UNIT_QUERY', message: 'Could not parse unit conversion query.' },
        metadata: { latencyMs: Date.now() - startTime }
      };
    }

    try {
      if (parsed.type === 'TEMPERATURE') {
        let converted = 0;
        if (parsed.from === 'C' && parsed.to === 'F') {
          converted = (parsed.value * 9 / 5) + 32;
        } else if (parsed.from === 'F' && parsed.to === 'C') {
          converted = (parsed.value - 32) * 5 / 9;
        } else {
          converted = parsed.value;
        }

        const rounded = Math.round(converted * 100) / 100;
        const formatted = `**${parsed.value}°${parsed.from}** = **${rounded}°${parsed.to}**`;

        return {
          success: true,
          tool: 'UnitConversionEngine',
          data: {
            type: 'UNIT_CONVERSION',
            value: parsed.value,
            fromUnit: `°${parsed.from}`,
            toUnit: `°${parsed.to}`,
            result: rounded,
            formatted
          },
          metadata: { latencyMs: Date.now() - startTime, verified: true }
        };
      }

      const key = `${parsed.from}_to_${parsed.to}`;
      const conv = CONVERSIONS[key];

      if (!conv) {
        return {
          success: false,
          tool: 'UnitConversionEngine',
          data: null,
          error: { code: 'UNSUPPORTED_UNIT_CONVERSION', message: `Conversion from ${parsed.from} to ${parsed.to} is currently unsupported.` },
          metadata: { latencyMs: Date.now() - startTime }
        };
      }

      const resultVal = parsed.value * conv.factor;
      const rounded = Math.round(resultVal * 1000) / 1000;
      const formatted = `**${parsed.value} ${conv.unitFrom}** = **${rounded} ${conv.unitTo}**`;

      return {
        success: true,
        tool: 'UnitConversionEngine',
        data: {
          type: 'UNIT_CONVERSION',
          value: parsed.value,
          fromUnit: conv.unitFrom,
          toUnit: conv.unitTo,
          result: rounded,
          formatted
        },
        metadata: { latencyMs: Date.now() - startTime, verified: true }
      };
    } catch (err) {
      return {
        success: false,
        tool: 'UnitConversionEngine',
        data: null,
        error: { code: 'UNIT_CONVERSION_ERROR', message: err.message },
        metadata: { latencyMs: Date.now() - startTime }
      };
    }
  }
};

module.exports = unitConversionTool;
