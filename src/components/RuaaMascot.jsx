import { useEffect, useRef } from 'react'

export default function RuaaMascot({ mode = 'calm', visible = true }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.classList.remove('ruaa-anim')
    void el.offsetWidth
    el.classList.add('ruaa-anim')
  }, [mode])

  if (!visible) return null

  return (
    <div ref={ref} className={`ruaa-mascot ruaa-${mode} ruaa-anim`} aria-label="Ruaa mascot">
      <span className="ruaa-full-sprite" aria-hidden="true" />
      <span className="ruaa-name">Hi, I&apos;m Ruaa</span>
    </div>
  )
}
