/**
 * Lightweight confetti effect — no dependencies
 */
export function fireConfetti(duration = 3000) {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')

  const colors = ['#ff4d6d', '#7c3aed', '#00e676', '#448aff', '#ff9100', '#00e5ff', '#b388ff', '#ffd600']
  const particles = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height * -0.5,
    w: 4 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    vx: (Math.random() - 0.5) * 6,
    vy: 2 + Math.random() * 4,
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 12,
    color: colors[Math.floor(Math.random() * colors.length)],
    opacity: 1,
  }))

  const start = Date.now()

  function draw() {
    const elapsed = Date.now() - start
    if (elapsed > duration) {
      canvas.remove()
      return
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const fade = elapsed > duration * 0.7 ? 1 - (elapsed - duration * 0.7) / (duration * 0.3) : 1

    particles.forEach(p => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.08
      p.rotation += p.rotSpeed

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation * Math.PI) / 180)
      ctx.globalAlpha = fade
      ctx.fillStyle = p.color
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    })

    requestAnimationFrame(draw)
  }

  draw()
}

export function checkStreakMilestone(streak) {
  const milestones = [7, 14, 30, 50, 100, 365]
  return milestones.includes(streak)
}
