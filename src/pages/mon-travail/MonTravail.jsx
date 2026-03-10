// ============================================================
// APEX RH — MonTravail.jsx · S134 fix light mode
// Conteneur transparent — chaque onglet a son propre fond
// ============================================================
import { useSearchParams } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { motion }          from 'framer-motion'
import { CheckSquare, FolderKanban, Target } from 'lucide-react'
import Tasks          from '../tasks/Tasks'
import ProjectsPage   from '../projects/Projects'
import ObjectivesPage from '../objectives/Objectives'

const TABS = [
  { id:'taches',    label:'Tâches',  Icon:CheckSquare,  accent:'#6EE7B7', rgb:'16,185,129'  },
  { id:'projets',   label:'Projets', Icon:FolderKanban, accent:'#38BDF8', rgb:'56,189,248'  },
  { id:'objectifs', label:'OKR',     Icon:Target,       accent:'#FDE68A', rgb:'245,158,11'  },
]

export default function MonTravail() {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = TABS.find(t => t.id === searchParams.get('tab'))?.id ?? 'taches'
  const tab = TABS.find(t => t.id === activeTab)

  // Styles adaptatifs light/dark
  const headerBg = isLight
    ? 'rgba(255,255,255,0.95)'
    : 'rgba(3,8,15,.45)'
  const headerBorder = isLight
    ? '1px solid rgba(99,102,241,0.12)'
    : 'none'
  const titleColor  = isLight ? '#1A1F36' : '#ffffff'
  const subtitleColor = isLight ? 'rgba(26,31,54,0.45)' : 'rgba(255,255,255,.35)'
  const tabBorderBottom = isLight
    ? '1px solid rgba(99,102,241,0.15)'
    : '1px solid rgba(255,255,255,.07)'
  const tabInactiveColor = isLight ? 'rgba(26,31,54,0.40)' : 'rgba(255,255,255,.32)'

  return (
    <div className="flex flex-col" style={{ minHeight:'100%', background:'transparent' }}>

      {/* En-tête — glass adaptatif */}
      <div style={{
        padding:'24px 24px 0',
        background: headerBg,
        backdropFilter: isLight ? 'none' : 'blur(40px)',
        borderBottom: headerBorder,
        flexShrink:0,
      }}>
        <h1 className="text-2xl font-bold" style={{ letterSpacing:'-0.5px', color: titleColor }}>
          Mon Travail
        </h1>
        <p className="text-sm mt-1" style={{ color: subtitleColor }}>
          Tâches, projets et objectifs OKR qui me sont assignés.
        </p>

        {/* TabBar */}
        <div className="flex gap-1 mt-4"
          style={{ borderBottom: tabBorderBottom }}>
          {TABS.map(t => {
            const isActive = t.id === activeTab
            return (
              <button key={t.id}
                onClick={() => setSearchParams({ tab:t.id }, { replace:true })}
                style={{
                  position:'relative',
                  display:'flex', alignItems:'center', gap:7,
                  padding:'10px 20px',
                  borderRadius:'10px 10px 0 0',
                  border:'none', cursor:'pointer',
                  fontSize:13, fontWeight:isActive ? 700 : 500,
                  background: isActive ? `rgba(${t.rgb},.12)` : 'transparent',
                  color: isActive ? t.accent : tabInactiveColor,
                  textShadow: isActive && !isLight ? `0 0 14px rgba(${t.rgb},.65)` : 'none',
                  transition:'all .2s',
                }}>
                {isActive && (
                  <motion.div layoutId="tab-line"
                    style={{
                      position:'absolute', bottom:0, left:0, right:0, height:2,
                      borderRadius:'2px 2px 0 0',
                      background:`linear-gradient(90deg,transparent,${t.accent},transparent)`,
                      boxShadow: isLight ? 'none' : `0 0 16px ${t.accent}, 0 0 32px rgba(${t.rgb},.40)`,
                    }}
                    transition={{ type:'spring', stiffness:500, damping:35 }} />
                )}
                <t.Icon size={14}
                  style={isActive ? {
                    color:t.accent,
                    filter: isLight ? 'none' : `drop-shadow(0 0 7px rgba(${t.rgb},.80))`,
                  } : undefined}
                />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenu — transparent, la page child gère son fond */}
      <div style={{ flex:1, position:'relative', background:'transparent' }}>
        {activeTab==='taches'    && <Tasks />}
        {activeTab==='projets'   && <ProjectsPage />}
        {activeTab==='objectifs' && <ObjectivesPage />}
      </div>
    </div>
  )
}
