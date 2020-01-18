var c = document.getElementById('canvas');
var ctx = c.getContext('2d');

window.addEventListener('resize', resize)
c.addEventListener('click', click)
c.addEventListener('mousemove', mousemove)

mousePrev = {x: 0, y: 0}
mouseCurr = {x: 0, y: 0}

var game = new Game()
var tsPrev = 0
var frames = 0

function Game() {
  this.player = new rect(100, 10, 100, 100)
  this.entities = [] // TODO include player in entities (collision detection ain't working great atm)

  this.spawnBall = function(x, y, inertia={x:0, y:0}) {
    b = new ball(x, y, 10, {x: inertia.x * 0.01, y: inertia.y * 0.01}, randrgb())
    this.entities.push(b)
  }

  this.update = function(ctx, ts) {
    for (let e of this.entities) {
      e.tick(ts)

      hb = e.hitbox()
      if (hb.pos.y + hb.dim.h > game.h) {
        e.collision(0, -1)
      } else if (hb.pos.y < 0) {
        e.collision(0, 1)
      }

      if (hb.pos.x + hb.dim.w > game.w) {
        e.collision(-1, 0)
      } else if (hb.pos.x < 0) {
        e.collision(1, 0)
      }

      e.draw(ctx)
    }

    this.player.tick(ts)
    this.player.draw(ctx)
  }
}

// configure different sensetivity for different keys? (space should be less sensitive than movement...)
var keys = new keymaster({
  ' ': 200
})

// cooldown: how many ms to wait before allowing another key press
// use 0 for raw input (no keys filtered)
// should I always use raw input and control animation through entity velocity etc?
// question of where the logic should reside...
function keymaster(cooldown) {
  this.cooldown = cooldown
  this.pressed = {} // key -> last ts press recorded (and used)

  this.press = function(k) {
    // register the key as pressed, wait for next call of active()
    if (!(k in this.pressed)) {
      this.pressed[k] = {
        activeTs: 0
      }
    }
  }

  this.release = function(k) {
    delete this.pressed[k]
  }

  this.active = function(ts) {
    res = []

    for (let [key, keyData] of Object.entries(this.pressed)) {
      if ((!(key in this.cooldown)) || (ts - keyData.activeTs > this.cooldown[key])) {
        keyData.activeTs = ts // update last time key was "active"/registered/used
        res.push(key)
      }
    }

    return res
  }
}

function resize() {
  ctx.canvas.width = game.w = window.innerWidth;
  ctx.canvas.height = game.h = window.innerHeight;
}

function rand(from, to) {
  return Math.floor(from + Math.random() * (to - from))
}

function rgb(r = 0, g = 0, b = 0) {
  this.r = r % 255
  this.g = g % 255
  this.b = b % 255,
    this.str = function() {
      return `rgb(${this.r}, ${this.g}, ${this.b})`
    }
}

function randrgb() {
  return new rgb(rand(0, 255), rand(0, 255), rand(0, 255))
}

function ball(x, y, r, v={x: 0.05, y:0.05}, rgb_ = new rgb()) {
  this.pos = {
    x: x,
    y: y
  }

  this.hitbox = function() {
    return {
      pos: {
        x: this.pos.x - this.r,
        y: this.pos.y - this.r
      },
      dim: {
        w: 2 * this.r,
        h: 2 * this.r
      }
    }
  }

  this.r = r
  this.rgb = rgb_

  this.velocity = v
  // emulate gravity
  this.accel = {
    x: 0,
    y: 0.0001
  }
  this.lastTick = 0

  this.tick = function(ts) {
    if (this.lastTick == 0) {
      // dunno, feels wrong to use lastTick == 0 for first time calculation
      this.lastTick = ts
    }

    this.pos.x += this.velocity.x * (ts - this.lastTick)
    this.pos.y += this.velocity.y * (ts - this.lastTick)

    this.velocity.x += this.accel.x * (ts - this.lastTick)
    this.velocity.y += this.accel.y * (ts - this.lastTick)

    this.lastTick = ts
  }

  this.collision = function(x, y) {
    if (x != 0) {
      this.velocity.x = -this.velocity.x
    }
    if (y != 0) {
      this.velocity.y = -this.velocity.y
    }

    this.velocity.x *= 0.7
    this.velocity.y *= 0.7
  }

  this.draw = function(ctx) {
    ctx.save()
    ctx.fillStyle = this.rgb.str()
    ctx.beginPath()
    ctx.arc(this.pos.x, this.pos.y, this.r, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.fill()
    ctx.restore()
  }
}

function rect(w, h, x, y, rgb_ = new rgb()) {
  this.dim = {
    w: w,
    h: h
  }
  this.pos = {
    x: x,
    y: y
  }
  this.rgb = rgb_
  this.prevUpdate = 0
  this.angle = 0

  // these fields determine "behavior" of the object
  this.mutRate = 0 // "breath" every x ms
  this.mvUnit = 5 // movement multiplier

  this.tick = function(ts) {
    if (this.mutRate == 0 || (ts - this.prevUpdate < this.mutRate)) {
      return false
    }

    this.prevUpdate = ts
    this.rgb = randrgb()
    return true
  }

  this.collision = function(x, y) {}

  this.draw = function(ctx) {
    ctx.save()
    ctx.fillStyle = this.rgb.str()

    ctx.translate(this.pos.x + this.dim.w / 2, this.pos.y + this.dim.h / 2)
    ctx.rotate(this.angle * Math.PI / 180)
    this.angle++

      //    ctx.fillRect(this.pos.x, this.pos.y, this.dim.w, this.dim.h)
      ctx.fillRect(-this.dim.w / 2, -this.dim.h / 2, this.dim.w, this.dim.h)

    ctx.restore()
  }

  this.move = function(delta) {
    this.pos.x += delta.x * this.mvUnit
    this.pos.y += delta.y * this.mvUnit
  }

  this.flip = function(deg = 90) {
    this.pos = {
      x: this.pos.x + this.dim.w / 2 - this.dim.h / 2,
      y: this.pos.y + this.dim.h / 2 - this.dim.w / 2
    }
    this.dim = {
      w: this.dim.h,
      h: this.dim.w
    }
  }
}

function calcMvDelta(activeKeys) {
  res = {
    x: 0,
    y: 0
  }

  for (let k of activeKeys) {
    switch (k) {
      case 'w':
        res.y -= 1
        break;
      case 'a':
        res.x -= 1
        break
      case 's':
        res.y += 1
        break

      case 'd':
        res.x += 1
        break
    }
  }

  return res
}

function loop(ts) {
  ctx.clearRect(0, 0, game.w, game.h);

  ctx.font = '12px Consolas';
  ctx.fillText(`fps=${Math.round(1000 / (ts - tsPrev))}`, 10, 10)

  activeKeys = keys.active(ts)

  // update entities according to input (activeKeys)
  game.player.move(calcMvDelta(activeKeys))
  if (activeKeys.includes(' ')) {
    game.player.flip()
  }

  game.update(ctx, ts)

  // book keeping
  frames++
  tsPrev = ts

  window.requestAnimationFrame(loop)
}

function keypress(e) {
  //  console.log("press " + e.key)
}

function onkeydown(e) {
  keys.press(e.key)
}

function onkeyup(e) {
  keys.release(e.key)
}

function click(e) {
  md = mousedirection()
  game.spawnBall(e.clientX, e.clientY, md)
}

function mousemove(e) {
  mousePrev = mouseCurr
  mouseCurr = {x: e.clientX, y: e.clientY}
}

function mousedirection() {
  return {x: mouseCurr.x - mousePrev.x, y: mouseCurr.y - mousePrev.y}
}

function init() {
  //  document.addEventListener('keypress', keypress)
  document.onkeydown = onkeydown
  document.onkeyup = onkeyup

  resize()
  loop(performance.now())
}