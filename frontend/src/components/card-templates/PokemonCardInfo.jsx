import { EnergySymbol, EnergyCost } from '../PokemonEnergy'
import { TYPE_COLORS } from '../../theme'

function PokemonStats({ attrs }) {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-4">
      {attrs.hp && (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide" style={{ color: '#8892a4' }}>HP</span>
          <span className="text-2xl font-bold" style={{ color: '#FF2E63' }}>{attrs.hp}</span>
        </div>
      )}
      {attrs.types && attrs.types.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide" style={{ color: '#8892a4' }}>Type</span>
          <div className="flex gap-1">
            {attrs.types.map(type => (
              <EnergySymbol key={type} type={type} size="md" />
            ))}
          </div>
        </div>
      )}
      {attrs.evolvesFrom && (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide" style={{ color: '#8892a4' }}>Evolves from</span>
          <span className="text-sm font-medium" style={{ color: '#EAEAEA' }}>{attrs.evolvesFrom}</span>
        </div>
      )}
    </div>
  )
}

function PokemonAbility({ ability }) {
  return (
    <div className="mb-3 p-3 rounded-lg border" style={{ backgroundColor: '#2d3243', borderColor: '#FF2E63' }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold uppercase px-2 py-0.5 rounded"
          style={{ backgroundColor: '#FF2E63', color: '#fff' }}>
          {ability.type}
        </span>
        <span className="font-bold" style={{ color: '#EAEAEA' }}>{ability.name}</span>
      </div>
      <p className="text-sm" style={{ color: '#8892a4' }}>{ability.text}</p>
    </div>
  )
}

function PokemonAttack({ attack }) {
  return (
    <div className="mb-3 p-3 rounded-lg border" style={{ backgroundColor: '#2d3243', borderColor: '#363d52' }}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <EnergyCost cost={attack.cost} />
          <span className="font-bold" style={{ color: '#EAEAEA' }}>{attack.name}</span>
        </div>
        {attack.damage && (
          <span className="font-bold text-lg" style={{ color: '#08D9D6' }}>{attack.damage}</span>
        )}
      </div>
      {attack.text && (
        <p className="text-sm mt-1" style={{ color: '#8892a4' }}>{attack.text}</p>
      )}
    </div>
  )
}

function PokemonFooter({ attrs }) {
  if (!attrs.weaknesses && !attrs.retreatCost) return null
  return (
    <div className="flex flex-wrap gap-6 mt-4 pt-4" style={{ borderTop: '1px solid #363d52' }}>
      {attrs.weaknesses && attrs.weaknesses.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#8892a4' }}>Weakness</p>
          <div className="flex items-center gap-1">
            {attrs.weaknesses.map((w, i) => (
              <div key={i} className="flex items-center gap-1">
                <EnergySymbol type={w.type} size="sm" />
                <span className="text-sm font-medium" style={{ color: '#FF2E63' }}>{w.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {attrs.retreatCost && attrs.retreatCost.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#8892a4' }}>Retreat Cost</p>
          <div className="flex gap-1">
            {attrs.retreatCost.map((type, i) => (
              <EnergySymbol key={i} type={type} size="sm" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PokemonCardInfo({ attrs, rulesText, cardType }) {
  const isPokemon = cardType === 'Pokémon'
  const isTrainer = ['Item', 'Supporter', 'Stadium', 'Pokémon Tool'].some(
    t => attrs.subtypes?.includes(t)
  )

  return (
    <div>
      {/* Pokemon specific stats */}
      {isPokemon && <PokemonStats attrs={attrs} />}

      {/* Trainer/Item rules text */}
      {isTrainer && rulesText && (
        <div className="rounded-xl p-4 mb-4 border"
          style={{ backgroundColor: '#2d3243', borderColor: '#363d52' }}>
          <p className="whitespace-pre-line leading-relaxed" style={{ color: '#EAEAEA' }}>
            {rulesText}
          </p>
        </div>
      )}

      {/* Abilities */}
      {attrs.abilities && attrs.abilities.length > 0 && (
        <div className="mb-4">
          {attrs.abilities.map((ability, i) => (
            <PokemonAbility key={i} ability={ability} />
          ))}
        </div>
      )}

      {/* Attacks */}
      {attrs.attacks && attrs.attacks.length > 0 && (
        <div className="mb-4">
          <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#8892a4' }}>Attacks</p>
          {attrs.attacks.map((attack, i) => (
            <PokemonAttack key={i} attack={attack} />
          ))}
        </div>
      )}

      {/* Weakness and retreat */}
      {isPokemon && <PokemonFooter attrs={attrs} />}
    </div>
  )
}