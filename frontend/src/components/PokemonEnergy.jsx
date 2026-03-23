const ENERGY_TYPES = {
    Fire:      { color: '#FF4422', letter: 'R' },
    Water:     { color: '#4488FF', letter: 'W' },
    Grass:     { color: '#44AA44', letter: 'G' },
    Lightning: { color: '#FFCC00', letter: 'L' },
    Psychic:   { color: '#FF44AA', letter: 'P' },
    Fighting:  { color: '#CC7722', letter: 'F' },
    Darkness:  { color: '#442288', letter: 'D' },
    Metal:     { color: '#AAAAAA', letter: 'M' },
    Fairy:     { color: '#FF88CC', letter: 'Y' },
    Dragon:    { color: '#7766EE', letter: 'N' },
    Colorless: { color: '#888888', letter: 'C' },
  }
  
  export function EnergySymbol({ type, size = 'md' }) {
    const energy = ENERGY_TYPES[type] || { color: '#888888', letter: '?' }
    const sizes = {
      sm: { outer: 18, font: 9 },
      md: { outer: 24, font: 11 },
      lg: { outer: 32, font: 14 },
    }
    const { outer, font } = sizes[size] || sizes.md
  
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: outer,
          height: outer,
          borderRadius: '50%',
          backgroundColor: energy.color,
          color: '#fff',
          fontSize: font,
          fontWeight: 'bold',
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          textShadow: '0 1px 1px rgba(0,0,0,0.5)',
        }}
        title={type}
      >
        {energy.letter}
      </span>
    )
  }
  
  export function EnergyCost({ cost }) {
    if (!cost || cost.length === 0) return null
    return (
      <span className="flex items-center gap-0.5 flex-wrap">
        {cost.map((type, i) => (
          <EnergySymbol key={i} type={type} />
        ))}
      </span>
    )
  }