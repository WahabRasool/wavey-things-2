c = document.querySelector('#c')
c.tabIndex = 0
x_ = c.getContext('2d')
c.width = 1920
c.height = 1080

camMode = 'HDRI'
HDRIwidth = c.width

outputAspectRatio = 16/9
output = document.createElement('canvas')
octx = output.getContext('2d')
output.width = c.width
output.height = output.width / outputAspectRatio
showOutput = false // HDRI view, for recording 
showRender = false   // actual pipe to environment, for render eval etc
showPreview = false // thumbnail in upper right 
// (only visible in default or HDRI output, not render)

if(showRender){
  outputAspectRatio = 2
  showOutput = true
  showPreview = false
  c.style.display = 'none'
}else{
  //showPreview = true
  //showOutput = false
  setTimeout(()=>{
    c.style.display = 'block'
    c.style.borderRadius = showOutput ? '0' : '10px'
    c.style.border = showOutput ? 'none' : '3px solid #fff3'
    c.style.margin = showOutput ? 0 : 10
  }, 0)
}

// tempBuffer, needed for optional preview [P]
tempBuffer = document.createElement('canvas')
tempBuffer.width = c.width
tempBuffer.height = c.height
tbctx = tempBuffer.getContext('2d')

C = Math.cos
S = Math.sin
t = 0
T = Math.tan

rsz = window.onresize = () =>{
  let b = document.body
  let margin = showOutput ? 0 : 10
  let n
  let d = showOutput ? 1/outputAspectRatio : .5625
  c.style.borderRadius = showOutput ? '0' : '10px'
  c.style.border = showOutput ? 'none' : '3px solid #fff3'
  //c.width = 1920 
  c.height = c.width * d
  output.width = c.width
  output.height = output.width * d
  if(b.clientHeight/b.clientWidth > d){
    c.style.width = `${(n=b.clientWidth) - margin*2}px`
    c.style.height = `${n*d - margin*2}px`
  }else{
    c.style.height = `${(n=b.clientHeight) - margin*2}px`
    c.style.width = `${n/d - margin*2}px`
  }
}
rsz()

keyTimer = 0
keyTimerInterval = .25
keys = Array(256).fill(false)
window.onkeyup = e => {
  keyTimer = 0
  keys[e.keyCode] = false
}

window.onkeydown = e => {
  keys[e.keyCode] = true
  if(keyTimer <= t){
    keyTimer = t + keyTimerInterval
    if(e.keyCode == 72) {
      showOutput = !showOutput
      if(showRender){
        if(typeof can != 'undefined') {
          outputAspectRatio = 2
          showOutput = true
          showPreview = false
          can.style.display = 'block'
          c.style.display = 'none'
          rsz2()
        }
      }else{
        showPreview = true
        if(typeof can != 'undefined') can.style.display = 'none'
        c.style.display = 'block'
        rsz()
      }
    }
    if(e.keyCode == 80) {
      showPreview = !showPreview
    }
    if(e.keyCode == 82) {
      showRender = !showRender
      if(showRender){
        outputAspectRatio = 2
        showPreview = false
        showOutput = true
        can.style.display = 'block'
        c.style.display = 'none'
      }else{
        showPreview = true
        can.style.display = 'none'
        c.style.display = 'block'
      }
    }
    if(e.keyCode == 70) {
      if(showRender || outputAspectRatio == 16/9){
        outputAspectRatio = 2
      }else{
        outputAspectRatio = 16/9
      }
      rsz()
    }
  }
}

window.addEventListener('resize', rsz2 = () =>{
  can = document.querySelectorAll('canvas')[0]
  if(typeof can != 'undefined'){

    can.tabindex = 0
    can.focus()

    let b = document.body
    let margin = 10
    let n
    let d = .5625
    can.style.borderRadius = '10px'
    can.style.border = '3px solid #fff3'
    if(b.clientHeight/b.clientWidth > d){
      can.style.width = `${(n=b.clientWidth) - margin*2}px`
      can.style.height = `${n*d - margin*2}px`
    }else{
      can.style.height = `${(n=b.clientHeight) - margin*2}px`
      can.style.width = `${n/d - margin*2}px`
    }
  }
  if(showRender){
    showRender = false
    setTimeout(()=>{
      showRender = true
    }, 0)
  }
})
for(let i=10;i--;) setTimeout(()=>{rsz2(), rsz()}, i*60)

async function Draw(){
  if(!t){
    X     = Y     = Z     = 0
    oX    = oY    = oZ    = 0
    Rl    = Pt    = Yw    = 0
    camX  = camY  = camZ  = camD = 0
    camposX  = camposY  = camposZ  = 0
    camRl = camPt = camYw = 0
    Rn = Math.random

    cls = () => {
      Z = camZ = 1E6
      x_['globalAlpha'] = 1
      x_.fillStyle = showOutput && showPreview ? '#0008' : '#000a'
      x_.fillRect(0, 0, 1e5, 1e5, 0, 0, 1e5, 1e5)
      x_.lineJoin = 'roud'
      x_.lineCap = 'roud'
      octx['globalAlpha'] = 1
      octx.fillStyle = '#000a'
      octx.fillRect(0, 0, 1e5, 1e5, 0, 0, 1e5, 1e5)
      octx.lineJoin = 'roud'
      octx.lineCap = 'roud'
      override = false
    }

    hoff = .5       // horizontal offset of HDRI output, note it wraps
    invertY = true
    x = (func, ...vals) => {
      let p=0, q=0, d, ox, oy, oz, ox1, oy1, oz1, X1, Y1, Z1, X2, Y2, Z2, X3, Y3, Z3, X4, Y4, Z4
      let ox2, oy2, oz2, s, s2, split, onscreen1, onscreen2
      switch(func){

          // assignments
        case 'strokeStyle'   :
          if(vals.length){
            x_[func]   = vals[0]
            octx[func] = vals[0]
          }else{
            return x_[func]
          }
          break
        case 'fillText' :
          if(Z>0 && (!showOutput  || showPreview || override))    x_[func](vals[0], vals[1], vals[2])
          if(showOutput || showPreview){
            let text = vals[0]
            ox = camX - camposX
            oy = camY - camposY
            oz = camZ - camposZ
            p = ((Math.atan2(ox, oz) + Math.PI*2) / Math.PI / 2 + hoff)%1
            d = Math.hypot(ox, oy, oz) + .0001
            q = invertY ? 1-Math.acos(oy / d) / Math.PI : Math.acos(oy / d) / Math.PI
            ox1 = p * output.width
            oy1 = q * output.height
            X1 = ox1 + vals[3]
            Y1 = oy1 + vals[4]
            octx[func](text, X1, Y1)
            if(X1 < 0) octx[func](text, X1 + output.width, Y1 )
            if(X1 + X2 > output.width) octx[func](text, X1 - output.width, Y1)
          }
          break
        case 'textAlign' :
          if(vals.length){
            x_[func]   = vals[0]
            octx[func] = vals[0]
          }else{
            return x_[func]
          }
          break
        case 'globalCompositeOperation' :
          if(vals.length){
            x_[func]   = vals[0]
            octx[func] = vals[0]
          }else{
            return x_[func]
          }
          break
        case 'lineWidth'  :
          if(vals.length){
            x_[func]   = vals[0]
            ox = camX - camposX
            oy = camY - camposY
            oz = camZ - camposZ
            p = ((Math.atan2(ox, oz) + Math.PI*2) / Math.PI / 2 + hoff)%1
            d = Math.hypot(ox, oy, oz) + .0001
            q = invertY ? 1-Math.acos(oy / d) / Math.PI : Math.acos(oy / d) / Math.PI
            //modsize = .4+Math.abs(.5 - q)*2
            modsize = .5+((2*Math.abs(.5 - q))*1.5) ** 2 / 1.5
            octx[func] = Math.min(250, vals[1] * modsize)
          }else{
            return [x_[func], octx[func]]
          }
          break
        case 'fillStyle'  :
          if(vals.length){
            x_[func]   = vals[0]
            octx[func] = vals[0]
          }else{
            return x_[func]
          }
          break
        case 'globalAlpha':
          if(vals.length){
            x_[func]   = vals[0]
            octx[func] = vals.length > 1 ? vals[1] : vals[0]
          }else{
            return x_[func]
          }
          break
        case 'font'       :
          if(vals.length){
            x_[func]   = vals[0]
            octx[func] = vals.length > 1 ? vals[1] : vals[0]
          }else{
            return x_[func]
          }
          break
        case 'lineJoin'   :
          if(vals.length){
            x_[func]   = vals[0]
            octx[func] = vals[0]
          }else{
            return x_[func]
          }
          break
        case 'lineCap'    :
          if(vals.length){
            x_[func]   = vals[0]
            octx[func] = vals[0]
          }else{
            return x_[func]
          }
          break

          // function calls
        default:
          if(vals.length){
            switch(func){
              case 'lineTo':
                if(Z>0 && (!showOutput  || showPreview || override))    x_[func](...vals)
                if(showOutput || showPreview){
                  ox = camX - camposX
                  oy = camY - camposY
                  oz = camZ - camposZ
                  p = ((Math.atan2(ox, oz) + Math.PI*2) / Math.PI / 2 + hoff)%1
                  if(op_ != -1){
                    if(op_ > .75 && p<.25) p+=1
                    if(op_ < .25 && p>.75) p-=1
                  }
                  op_ = p
                  d = Math.hypot(ox, oy, oz) + .0001
                  q = invertY ? 1-Math.acos(oy / d) / Math.PI : Math.acos(oy / d) / Math.PI
                  HDRIqueue = [...HDRIqueue, [p * output.width, q * output.height]]
                }
                break
              case 'clearRect':
                if(Z>0 && (!showOutput || showPreview)) x_[func](vals[0], vals[1],  vals[2],  vals[3])

                if(showOutput || showPreview || override){
                  ox = camX - camposX
                  oy = camY - camposY
                  oz = camZ - camposZ
                  p = ((Math.atan2(ox, oz) + Math.PI*2) / Math.PI / 2 + hoff) % 1
                  d = Math.hypot(ox, oy, oz) + .01
                  q = invertY ? 1-Math.acos(oy / d) / Math.PI : Math.acos(oy / d) / Math.PI
                  ox1 = p * output.width
                  oy1 = q * output.height
                  modsize = 1
                  octx[func](ox1-vals[6]*modsize/2, oy1-vals[7]*modsize/2, vals[6]*modsize, vals[7]*modsize)
                }
                break
              case 'fillRect': case 'strokeRect':
                if(Z>0 && (!showOutput || showPreview)) x_[func](vals[0], vals[1],  vals[2],  vals[3])

                if(showOutput || showPreview || override){
                  ox = camX - camposX
                  oy = camY - camposY
                  oz = camZ - camposZ
                  p = ((Math.atan2(ox, oz) + Math.PI*2) / Math.PI / 2 + hoff)%1
                  d = Math.hypot(ox, oy, oz) + .0001
                  q = invertY ? 1-Math.acos(oy / d) / Math.PI : Math.acos(oy / d) / Math.PI
                  ox1 = p * output.width
                  oy1 = q * output.height
                  modsize = 1+((2*Math.abs(.5 - q))*1.28) ** 11
                  X1 = ox1-vals[6]*modsize/4
                  Y1 = oy1-vals[7]/4
                  X2 = vals[6]*modsize/2
                  Y2 = vals[7]/2
                  octx[func](X1, Y1, X2, Y2)
                  if(X1 < 0) octx[func](X1 + output.width, Y1, X2, Y2)
                  if(X1 + X2 > output.width) octx[func](X1 - output.width, Y1, X2, Y2)
                }
                break
              case 'drawImage':
                if(Z>0 && (!showOutput || showPreview || override)) x_[func](vals[0], vals[1],  vals[2],  vals[3], vals[4])
                if(showOutput || showPreview){
                  ox = camX - camposX
                  oy = camY - camposY
                  oz = camZ - camposZ
                  vals[7] /= 1
                  vals[8] /= 1
                  p = ((Math.atan2(ox, oz) + Math.PI*2) / Math.PI / 2 + hoff)%1
                  d = Math.hypot(ox, oy, oz) + .0001
                  q = invertY ? 1-Math.acos(oy / d) / Math.PI : Math.acos(oy / d) / Math.PI
                  ox1 = p * output.width
                  oy1 = q * output.height
                  modsize = 1+((2*Math.abs(.5 - q))*1.28) ** 11
                  X1 = ox1-vals[7]*modsize/4
                  Y1 = oy1-vals[8]/4
                  X2 = vals[7]*modsize/2
                  Y2 = vals[8]/2
                  octx[func](vals[0], X1, Y1, X2, Y2)
                  if(X1 < 0) octx[func](vals[0], X1 + output.width, Y1, X2, Y2)
                  if(X1 + X2 > output.width) octx[func](vals[0], X1 - output.width, Y1, X2, Y2)
                }
                break
              default:
                if(!showOutput || showPreview || override) x_[func](...vals)
                if(showOutput || showPreview || override) octx[func](...vals)
                break
            }
          }else{
            switch(func){
              case 'beginPath':
                if(!showOutput || showPreview || override) x_[func]()
                if(showOutput || showPreview || override){
                  octx[func]()
                  HDRIqueue = []
                  op_ = -1
                }
                break
              case 'stroke':
                if(!showOutput || showPreview || override) x_[func]()
                if(showOutput || showPreview || override){
                  for(let m=3; m--;){
                    let ofx
                    switch(m){
                      case 0: ofx = -output.width; break
                      case 1: ofx = 0; break
                      case 2: ofx = output.width; break
                    }
                    polyOnBorder = false
                    onLeft       = false
                    onRight      = false
                    outsized     = false
                    HDRIqueue.map((v, i) => {
                      if(!outsized){
                        l1 = i
                        l2 = (i+1)%HDRIqueue.length
                        el1 = HDRIqueue[l1]
                        el2 = HDRIqueue[l2]
                        if(Math.hypot((el2[0] + ofx) - (el1[0] + ofx), el2[1] - el1[1]) > output.width/1.1) {
                          outsized = true
                        }else{
                          if((el1[0] + ofx >= 0 && el2[0] + ofx < 0) || (el1[0] + ofx >= output.width && el2[0] + ofx < output.width)) polyOnBorder = true
                        }
                        X = v[0] + ofx
                        Y = v[1]
                        if(X >= output.width) onRight = true
                        if(X < 0) onLeft  = true
                      }
                    })
                    if(!outsized && (polyOnBorder || !(onRight || onLeft))){
                      octx.beginPath()
                      HDRIqueue.map((v, i) => {
                        octx.lineTo(v[0] + ofx, v[1])
                      })
                      octx.stroke()
                    }
                  }
                }
                break
              case 'fill':
                if(!showOutput || showPreview || override) x_[func]()
                if(showOutput || showPreview || override){
                  for(let m=3; m--;){
                    let ofx
                    switch(m){
                      case 0: ofx = -output.width; break
                      case 1: ofx = 0; break
                      case 2: ofx = output.width; break
                    }
                    polyOnBorder = false
                    onLeft       = false
                    onRight      = false
                    outsized     = false
                    HDRIqueue.map((v, i) => {
                      if(!outsized){
                        l1 = i
                        l2 = (i+1)%HDRIqueue.length
                        el1 = HDRIqueue[l1]
                        el2 = HDRIqueue[l2]
                        if(Math.hypot((el2[0] + ofx) - (el1[0] + ofx), el2[1] - el1[1]) > output.width/1.1) {
                          outsized = true
                        }else{
                          if((el1[0] + ofx >= 0 && el2[0] + ofx < 0) || (el1[0] + ofx >= output.width && el2[0] + ofx < output.width)) polyOnBorder = true
                        }
                        X = v[0] + ofx
                        Y = v[1]
                        if(X >= output.width) onRight = true
                        if(X < 0) onLeft  = true
                      }
                    })
                    if(!outsized && (polyOnBorder || !(onRight || onLeft))){
                      octx.beginPath()
                      HDRIqueue.map((v, i) => {
                        octx.lineTo(v[0] + ofx, v[1])
                      })
                      octx.fill()
                    }
                  }
                }
                break
              default:
                if(!showOutput || showPreview) x_[func]()
                if(showOutput || showPreview) octx[func]()
                break
            }
          }
          break
      }
      return [p, q]
    }
    
    R = (Rl,Pt,Yw,m) => {
      M = Math
      A = M.atan2
      H = M.hypot

      let X0_ = X
      let Y0_ = Y
      let Z0_ = Z
      let p, d

      // MAIN
      if(m){
        //X -= oX
        //Y -= oY
        //Z -= oZ
      }
      X = S(p=A(X,Y)+Rl) * (d=H(X,Y))
      Y = C(p) * d
      X = S(p=A(X,Z)+(Yw+.0000)) * (d=H(X,Z))
      Z = C(p)*d
      Y = S(p=A(Y,Z)+Pt) * (d=H(Y,Z))
      Z = C(p)*d
      if(m){
        X += oX
        Y += oY
        Z += oZ
      }
      let X1_ = X
      let Y1_ = Y
      let Z1_ = Z

      // CAM
      X = X0_
      Y = Y0_
      Z = Z0_
      if(m){
        //X -= camposX
        //Y -= camposY
        //Z -= camposZ
      }
      let mod = Rl == 0 && Pt == 0 && Yw == 0 ? 0 : 1
      X = S(p=A(X,Y)+camRl*mod) * (d=H(X,Y))
      Y = C(p) * d
      X = S(p=A(X,Z)+(camYw+.00001)*mod) * (d=H(X,Z))
      Z = C(p)*d
      Y = S(p=A(Y,Z)+camPt*mod) * (d=H(Y,Z))
      Z = C(p)*d
      if(m){
        X += camposX
        Y += camposY
        Z += camposZ
      }
      if(camMode == 'HDRI'){
        camD = H(X, Y, Z)
        X = camposX + X / camD
        Y = camposY + Y / camD
        Z = camposZ + Z / camD
      }
      camX = X
      camY = Y
      camZ = Z
      //camD += Z

      X    = X1_
      Y    = Y1_
      Z    = Z1_
    }

    HSVFromRGB = (R, G, B) => {
      let R_=R/255
      let G_=G/255
      let B_=B/255
      let Cmin = Math.min(R_,G_,B_)
      let Cmax = Math.max(R_,G_,B_)
      let val = Cmax //(Cmax+Cmin) / 2
      let delta = Cmax-Cmin
      let sat = Cmax ? delta / Cmax: 0
      let min=Math.min(R,G,B)
      let max=Math.max(R,G,B)
      let hue = 0
      if(delta){
        if(R>=G && R>=B) hue = (G-B)/(max-min)
        if(G>=R && G>=B) hue = 2+(B-R)/(max-min)
        if(B>=G && B>=R) hue = 4+(R-G)/(max-min)
      }
      hue*=60
      while(hue<0) hue+=360;
      while(hue>=360) hue-=360;
      return [hue, sat, val]
    }

    R3=(Rl,Pt,Yw,m=false)=>{
      M=Math
      A=M.atan2
      H=M.hypot
      if(m){
        X-=oX
        Y-=oY
        Z-=oZ
      }
      X=S(p=A(X,Y)+Rl)*(d=H(X,Y))
      Y=C(p)*d
      Y=S(p=A(Y,Z)+Pt)*(d=H(Y,Z))
      Z=C(p)*d
      X=S(p=A(X,Z)+Yw)*(d=H(X,Z))
      Z=C(p)*d
    }

    Q = () => [c.width/2+X/(Z+.01)*700, c.height/2+Y/(Z+.01)*700,
               output.width/2+camX/(camZ+.01)*700, output.height/2+camY/(camZ+.01)*700]
    Q2 = () => [c.width/2+X * 75, c.height/2+Y*75,
               output.width/2+camX*75, output.height/2+camY*75]

    I=(A,B,M,D,E,F,G,H)=>(K=((G-E)*(B-F)-(H-F)*(A-E))/(J=(H-F)*(M-A)-(G-E)*(D-B)))>=0&&K<=1&&(L=((M-A)*(B-F)-(D-B)*(A-E))/J)>=0&&L<=1?[A+K*(M-A),B+K*(D-B)]:0

    spawnTunnel = (
      tx, ty, tz,
      rw, cl, sp=1, rad=.5,
      theta1=0, theta2=0,
      theta1ModFreq = 0,
      theta1ModMag  = 0,
      theta2ModFreq = 0,
      theta2ModMag  = 0,
      theta1Offset  = 0,
      theta2Offset  = 0,
      radModFreq    = 0,
      radModMag     = 0,
      radModOffset  = 0,
      showLine=false
    ) => {
      let X_ = X = tx
      let Y_ = Y = ty
      let Z_ = Z = tz
      let ret = []
      let p2a, p2, p2a1, ls
      if(showLine) x('beginPath')
      for(let i=cl+1; i--;){
        let p1 = theta1 + C(Math.PI*2/cl*i*theta1ModFreq + theta1Offset) * theta1ModMag
        let p2 = theta2 + C(Math.PI*2/cl*i*theta2ModFreq + theta2Offset) * theta2ModMag
        let p2a1 = theta2 + C(Math.PI*2/cl*(i+1)*theta2ModFreq + theta2Offset) * theta2ModMag
        let lsa  = rad + C(Math.PI*2/cl*i*radModFreq + radModOffset) * rad /2 *radModMag
        let lsb  = rad + C(Math.PI*2/cl*(i+1)*radModFreq + radModOffset) * rad /2 * radModMag
        if(i==cl){
          p2a = p2
          ls = lsa
        }else if(i==0){
          p2a = p2a1
          ls  = lsb
        }else{
          p2a = (p2 + p2a1)/2
          ls = (lsa+lsb)/2
        }
        let a = []
        for(let j=rw+1;j--;){
          p=Math.PI*2/rw*j + Math.PI/rw
          X = S(p) * ls
          Y = 0
          Z = C(p) * ls
          R(-p2a+Math.PI/2,0,0)
          R(0,0,-p1)
          a = [...a, [X+X_, Y+Y_, Z+Z_]]
        }

        ret = [...ret, a]

        if(showLine) {
          X = X_
          Y = Y_
          Z = Z_
          motionPath = [...motionPath, [X,Y,Z]]
          R(Rl,Pt,Yw,1)
          x('lineTo', ...Q())
        }

        vx = C(p1) * C(p2) * sp
        vy = S(p2) * sp
        vz = S(p1) * C(p2) * sp
        X_ += vx
        Y_ += vy
        Z_ += vz
      }
      //if(showLine) stroke('#f00', '', 2, false)
      a = []
      ret.map((v, i) => {
        if(i){
          let s1 = ret[i]
          let s2 = ret[i-1]
          for(let j = rw;j--;){
            b = []
            let l1_ = (j+0)%rw
            let l2_ = (j+1)%rw
            X = s1[l1_][0]
            Y = s1[l1_][1]
            Z = s1[l1_][2]
            b = [...b, [X,Y,Z]]
            X = s1[l2_][0]
            Y = s1[l2_][1]
            Z = s1[l2_][2]
            b = [...b, [X,Y,Z]]
            X = s2[l2_][0]
            Y = s2[l2_][1]
            Z = s2[l2_][2]
            b = [...b, [X,Y,Z]]
            X = s2[l1_][0]
            Y = s2[l1_][1]
            Z = s2[l1_][2]
            b = [...b, [X,Y,Z]]
            a = [...a, b]
          }
        }
      })
      return a
    }


    Normal = (facet, autoFlipNormals=false, X1=0, Y1=0, Z1=0) => {
      let ax = 0, ay = 0, az = 0
      facet.map(q_=>{ ax += q_[0], ay += q_[1], az += q_[2] })
      ax /= facet.length, ay /= facet.length, az /= facet.length
      let b1 = facet[2][0]-facet[1][0], b2 = facet[2][1]-facet[1][1], b3 = facet[2][2]-facet[1][2]
      let c1 = facet[1][0]-facet[0][0], c2 = facet[1][1]-facet[0][1], c3 = facet[1][2]-facet[0][2]
      crs = [b2*c3-b3*c2,b3*c1-b1*c3,b1*c2-b2*c1]
      d = Math.hypot(...crs)+.001
      let nls = 1 //normal line length
      crs = crs.map(q=>q/d*nls)
      let X1_ = ax, Y1_ = ay, Z1_ = az
      let flip = 1
      if(autoFlipNormals){
        let d1_ = Math.hypot(X1_-X1,Y1_-Y1,Z1_-Z1)
        let d2_ = Math.hypot(X1-(ax + crs[0]/99),Y1-(ay + crs[1]/99),Z1-(az + crs[2]/99))
        flip = d2_>d1_?-1:1
      }
      let X2_ = ax + (crs[0]*=flip), Y2_ = ay + (crs[1]*=flip), Z2_ = az + (crs[2]*=flip)
      return [X1_, Y1_, Z1_, X2_, Y2_, Z2_]
    }

    async function loadOBJ(url, scale, tx, ty, tz, rl, pt, yw, recenter=true) {
      let res
      await fetch(url, res => res).then(data=>data.text()).then(data=>{
        a=[]
        data.split("\nv ").map(v=>{
          a=[...a, v.split("\n")[0]]
        })
        a=a.filter((v,i)=>i).map(v=>[...v.split(' ').map(n=>(+n.replace("\n", '')))])
        ax=ay=az=0
        a.map(v=>{
          v[1]*=-1
          if(recenter){
            ax+=v[0]
            ay+=v[1]
            az+=v[2]
          }
        })
        ax/=a.length
        ay/=a.length
        az/=a.length
        a.map(v=>{
          X=(v[0]-ax)*scale
          Y=(v[1]-ay)*scale
          Z=(v[2]-az)*scale
          R2(rl,pt,yw,0)
          v[0]=X
          v[1]=Y * (url.indexOf('bug')!=-1?2:1)
          v[2]=Z
        })
        maxY=-6e6
        a.map(v=>{
          if(v[1]>maxY)maxY=v[1]
        })
        a.map(v=>{
          v[1]-=maxY-oY
          v[0]+=tx
          v[1]+=ty
          v[2]+=tz
        })

        b=[]
        data.split("\nf ").map(v=>{
          b=[...b, v.split("\n")[0]]
        })
        b.shift()
        b=b.map(v=>v.split(' '))
        b=b.map(v=>{
          v=v.map(q=>{
            return +q.split('/')[0]
          })
          v=v.filter(q=>q)
          return v
        })

        res=[]
        b.map(v=>{
          e=[]
          v.map(q=>{
            e=[...e, a[q-1]]
          })
          e = e.filter(q=>q)
          res=[...res, e]
        })
      })
      return res
    }

    reflect = (a, n) => {
      let d1 = Math.hypot(...a)+.0001
      let d2 = Math.hypot(...n)+.0001
      a[0]/=d1
      a[1]/=d1
      a[2]/=d1
      n[0]/=d2
      n[1]/=d2
      n[2]/=d2
      let dot = -a[0]*n[0] + -a[1]*n[1] + -a[2]*n[2]
      let rx = -a[0] - 2 * n[0] * dot
      let ry = -a[1] - 2 * n[1] * dot
      let rz = -a[2] - 2 * n[2] * dot
      return [-rx*d1, -ry*d1, -rz*d1]
    }

    geoSphere = (mx, my, mz, iBc, size) => {
      let collapse=0, mind
      let B=Array(iBc).fill().map(v=>{
        X = Rn()-.5
        Y = Rn()-.5
        Z = Rn()-.5
        return  [X,Y,Z]
      })
      for(let m=32;m--;){
        B.map((v,i)=>{
          X = v[0]
          Y = v[1]
          Z = v[2]
          B.map((q,j)=>{
            if(j!=i){
              X2=q[0]
              Y2=q[1]
              Z2=q[2]
              d=1+(Math.hypot(X-X2,Y-Y2,Z-Z2)*(3+iBc/40)*3)**3
              X+=(X-X2)*9/d
              Y+=(Y-Y2)*9/d
              Z+=(Z-Z2)*9/d
            }
          })
          d=Math.hypot(X,Y,Z)
          v[0]=X/d
          v[1]=Y/d
          v[2]=Z/d
          if(collapse){
            d=25+Math.hypot(X,Y,Z)
            v[0]=(X-X/d)/1.1
            v[1]=(Y-Y/d)/1.1         
            v[2]=(Z-Z/d)/1.1
          }
        })
      }
      mind = 6e6
      B.map((v,i)=>{
        X1 = v[0]
        Y1 = v[1]
        Z1 = v[2]
        B.map((q,j)=>{
          X2 = q[0]
          Y2 = q[1]
          Z2 = q[2]
          if(i!=j){
            d = Math.hypot(a=X1-X2, b=Y1-Y2, e=Z1-Z2)
            if(d<mind) mind = d
          }
        })
      })
      a = []
      B.map((v,i)=>{
        X1 = v[0]
        Y1 = v[1]
        Z1 = v[2]
        B.map((q,j)=>{
          X2 = q[0]
          Y2 = q[1]
          Z2 = q[2]
          if(i!=j){
            d = Math.hypot(X1-X2, Y1-Y2, Z1-Z2)
            if(d<mind*2){
              if(!a.filter(q=>q[0]==X2&&q[1]==Y2&&q[2]==Z2&&q[3]==X1&&q[4]==Y1&&q[5]==Z1).length) a = [...a, [X1*size,Y1*size,Z1*size,X2*size,Y2*size,Z2*size]]
            }
          }
        })
      })
      B.map(v=>{
        v[0]*=size/1.3333
        v[1]*=size/1.3333
        v[2]*=size/1.3333
        v[0]+=mx
        v[1]+=my
        v[2]+=mz
      })
      return [mx, my, mz, size, B, a]
    }

    /*
    burst = new Image()
    url = "https://srmcgann.github.io/temp/burst.png"
    await fetch(url).then(res=>res.blob()).then(data=> burst.src = URL.createObjectURL(data))

    //burst1 = new Image()
    //burst1.src = "https://srmcgann.github.io/temp/burst1.png"
    burst2 = new Image()
    url = "https://srmcgann.github.io/temp/burst2.png"
    await fetch(url).then(res=>res.blob()).then(data=> burst2.src = URL.createObjectURL(data))
    burst3 = new Image()
    url = "https://srmcgann.github.io/temp/burst3.png"
    await fetch(url).then(res=>res.blob()).then(data=> burst3.src = URL.createObjectURL(data))
    burst4 = new Image()
    url = "https://srmcgann.github.io/temp/burst4.png"
    await fetch(url).then(res=>res.blob()).then(data=> burst4.src = URL.createObjectURL(data))
    burstz = [ burst, burst2, burst3, burst4]

    sphere0 = new Image()
    url = 'https://srmcgann.github.io/ultratemp6/sphere_colorful.png'
    await fetch(url).then(res=>res.blob()).then(data=> sphere0.src = URL.createObjectURL(data))

    sphere1 = new Image()
    url = 'https://srmcgann.github.io/temp13/sphere_colorful_1.png'
    await fetch(url).then(res=>res.blob()).then(data=> sphere1.src = URL.createObjectURL(data))
    sphere2 = new Image()
    url = 'https://srmcgann.github.io/temp13/sphere_colorful_2.png'
    await fetch(url).then(res=>res.blob()).then(data=> sphere2.src = URL.createObjectURL(data))
    sphere3 = new Image()
    url = 'https://srmcgann.github.io/temp13/sphere_colorful_3.png'
    await fetch(url).then(res=>res.blob()).then(data=> sphere3.src = URL.createObjectURL(data))
    sphere4 = new Image()
    url = 'https://srmcgann.github.io/temp13/sphere_colorful_4.png'
    await fetch(url).then(res=>res.blob()).then(data=> sphere4.src = URL.createObjectURL(data))
    spherez = [ sphere1, sphere2, sphere3, sphere4 ]
    */


    star1= new Image()
    url = "https://srmcgann.github.io/stars/star1.png"
    await fetch(url).then(res=>res.blob()).then(data=> star1.src = URL.createObjectURL(data))
    
    star2 = new Image()
    url = "https://srmcgann.github.io/stars/star2.png"
    await fetch(url).then(res=>res.blob()).then(data=> star2.src = URL.createObjectURL(data))
    
    star3= new Image()
    url = "https://srmcgann.github.io/stars/star3.png"
    await fetch(url).then(res=>res.blob()).then(data=> star3.src = URL.createObjectURL(data))
    
    star4 = new Image()
    url = "https://srmcgann.github.io/stars/star4.png"
    await fetch(url).then(res=>res.blob()).then(data=> star4.src = URL.createObjectURL(data))

    star5= new Image()
    url = "https://srmcgann.github.io/stars/star5.png"
    await fetch(url).then(res=>res.blob()).then(data=> star5.src = URL.createObjectURL(data))

    star6= new Image()
    url = "https://srmcgann.github.io/stars/star6.png"
    await fetch(url).then(res=>res.blob()).then(data=> star6.src = URL.createObjectURL(data))

    star7= new Image()
    url = "https://srmcgann.github.io/stars/star7.png"
    await fetch(url).then(res=>res.blob()).then(data=> star7.src = URL.createObjectURL(data))

    star8= new Image()
    url = "https://srmcgann.github.io/stars/star8.png"
    await fetch(url).then(res=>res.blob()).then(data=> star8.src = URL.createObjectURL(data))

    star9= new Image()
    url = "https://srmcgann.github.io/stars/star9.png"
    await fetch(url).then(res=>res.blob()).then(data=> star9.src = URL.createObjectURL(data))
    
    starz = [ star1, star2, star3, star4, star5, star6, star7, star8, star9 ]

    /*starsLoaded = false, starImgs = [{loaded: false}]
    starImgs = Array(9).fill().map(async function(v,i){
      let a = {img: new Image(), loaded: false}
      a.img.onload = () => {
        a.loaded = true
        setTimeout(()=>{
          if(starImgs.filter(v=>v.loaded).length == 9) starsLoaded = true
        }, 0)
      }
      url = `https://srmcgann.github.io/stars/star${i+1}.png`
      fetch(url).then(res=>res.blob()).then(data=> a.img.src = URL.createObjectURL(data))
      return a
    })
    */

    lineFaceI = (X1, Y1, Z1, X2, Y2, Z2, facet, autoFlipNormals=false, showNormals=false) => {
      let X_, Y_, Z_, d, m, l_,K,J,L,p
      let I_=(A,B,M,D,E,F,G,H)=>(K=((G-E)*(B-F)-(H-F)*(A-E))/(J=(H-F)*(M-A)-(G-E)*(D-B)))>=0&&K<=1&&(L=((M-A)*(B-F)-(D-B)*(A-E))/J)>=0&&L<=1?[A+K*(M-A),B+K*(D-B)]:0
      let Q_= () => [c.width/2+X_/Z_*700, c.height/2+Y_/Z_*700]
      let R_ = (Rl,Pt,Yw,m)=>{
        let M=Math, A=M.atan2, H=M.hypot
        X_ = S(p=A(X_,Y_)+Rl) * (d=H(X_,Y_))
        Y_ = C(p) * d
        X_ = S(p=A(X_,Z_)+Yw) * (d=H(X_,Z_))
        Z_ = C(p)*d
        Y_ = S(p=A(Y_,Z_)+Pt) * (d=H(Y_,Z_))
        Z_ = C(p)*d
        if(m){ X_+=oX,Y_+=oY,Z_+=oZ }
      }
      let rotSwitch = m =>{
        switch(m){
          case 0: R_(0,0,Math.PI/2); break
          case 1: R_(0,Math.PI/2,0); break
          case 2: R_(Math.PI/2,0,Math.PI/2); break
        }        
      }
      let ax = 0, ay = 0, az = 0
      facet.map(q_=>{ ax += q_[0], ay += q_[1], az += q_[2] })
      ax /= facet.length, ay /= facet.length, az /= facet.length
      let b1 = facet[2][0]-facet[1][0], b2 = facet[2][1]-facet[1][1], b3 = facet[2][2]-facet[1][2]
      let c1 = facet[1][0]-facet[0][0], c2 = facet[1][1]-facet[0][1], c3 = facet[1][2]-facet[0][2]
      let crs = [b2*c3-b3*c2,b3*c1-b1*c3,b1*c2-b2*c1]
      d = Math.hypot(...crs)+.001
      let nls = 1 //normal line length
      crs = crs.map(q=>q/d*nls)
      let X1_ = ax, Y1_ = ay, Z1_ = az
      let flip = 1
      if(autoFlipNormals){
        let d1_ = Math.hypot(X1_-X1,Y1_-Y1,Z1_-Z1)
        let d2_ = Math.hypot(X1-(ax + crs[0]/99),Y1-(ay + crs[1]/99),Z1-(az + crs[2]/99))
        flip = d2_>d1_?-1:1
      }
      let X2_ = ax + (crs[0]*=flip), Y2_ = ay + (crs[1]*=flip), Z2_ = az + (crs[2]*=flip)
      if(showNormals){
        x_.beginPath()
        X_ = X1_, Y_ = Y1_, Z_ = Z1_
        R_(Rl,Pt,Yw,1)
        if(Z_>0) x_.lineTo(...Q_())
        X_ = X2_, Y_ = Y2_, Z_ = Z2_
        R_(Rl,Pt,Yw,1)
        if(Z_>0) x_.lineTo(...Q_())
        x_.lineWidth = 5
        x_.strokeStyle='#f004'
        x_.stroke()
      }

      let p1_ = Math.atan2(X2_-X1_,Z2_-Z1_)
      let p2_ = -(Math.acos((Y2_-Y1_)/(Math.hypot(X2_-X1_,Y2_-Y1_,Z2_-Z1_)+.001))+Math.PI/2)
      let isc = false, iscs = [false,false,false]
      X_ = X1, Y_ = Y1, Z_ = Z1
      R_(0,-p2_,-p1_)
      let rx_ = X_, ry_ = Y_, rz_ = Z_
      for(let m=3;m--;){
        if(isc === false){
          X_ = rx_, Y_ = ry_, Z_ = rz_
          rotSwitch(m)
          X1_ = X_, Y1_ = Y_, Z1_ = Z_ = 5, X_ = X2, Y_ = Y2, Z_ = Z2
          R_(0,-p2_,-p1_)
          rotSwitch(m)
          X2_ = X_, Y2_ = Y_, Z2_ = Z_
          facet.map((q_,j_)=>{
            if(isc === false){
              let l = j_
              X_ = facet[l][0], Y_ = facet[l][1], Z_ = facet[l][2]
              R_(0,-p2_,-p1_)
              rotSwitch(m)
              let X3_=X_, Y3_=Y_, Z3_=Z_
              l = (j_+1)%facet.length
              X_ = facet[l][0], Y_ = facet[l][1], Z_ = facet[l][2]
              R_(0,-p2_,-p1_)
              rotSwitch(m)
              let X4_ = X_, Y4_ = Y_, Z4_ = Z_
              if(l_=I_(X1_,Y1_,X2_,Y2_,X3_,Y3_,X4_,Y4_)) iscs[m] = l_
            }
          })
        }
      }
      if(iscs.filter(v=>v!==false).length==3){
        let iscx = iscs[1][0], iscy = iscs[0][1], iscz = iscs[0][0]
        let pointInPoly = true
        ax=0, ay=0, az=0
        facet.map((q_, j_)=>{ ax+=q_[0], ay+=q_[1], az+=q_[2] })
        ax/=facet.length, ay/=facet.length, az/=facet.length
        X_ = ax, Y_ = ay, Z_ = az
        R_(0,-p2_,-p1_)
        X1_ = X_, Y1_ = Y_, Z1_ = Z_
        X2_ = iscx, Y2_ = iscy, Z2_ = iscz
        facet.map((q_,j_)=>{
          if(pointInPoly){
            let l = j_
            X_ = facet[l][0], Y_ = facet[l][1], Z_ = facet[l][2]
            R_(0,-p2_,-p1_)
            let X3_ = X_, Y3_ = Y_, Z3_ = Z_
            l = (j_+1)%facet.length
            X_ = facet[l][0], Y_ = facet[l][1], Z_ = facet[l][2]
            R_(0,-p2_,-p1_)
            let X4_ = X_, Y4_ = Y_, Z4_ = Z_
            if(I_(X1_,Y1_,X2_,Y2_,X3_,Y3_,X4_,Y4_)) pointInPoly = false
          }
        })
        if(pointInPoly){
          X_ = iscx, Y_ = iscy, Z_ = iscz
          R_(0,p2_,0)
          R_(0,0,p1_)
          isc = [[X_,Y_,Z_], [crs[0],crs[1],crs[2]]]
        }
      }
      return isc
    }

    TruncatedOctahedron = ls => {
      let shp = [], a = []
      let mind = 6e6
      for(let i=6;i--;){
        X = S(p=Math.PI*2/6*i+Math.PI/6)*ls
        Y = C(p)*ls
        Z = 0
        if(Y<mind) mind = Y
        a = [...a, [X, Y, Z]]
      }
      let theta = .6154797086703867
      a.map(v=>{
        X = v[0]
        Y = v[1] - mind
        Z = v[2]
        R(0,theta,0)
        v[0] = X
        v[1] = Y
        v[2] = Z+1.5
      })
      b = JSON.parse(JSON.stringify(a)).map(v=>{
        v[1] *= -1
        return v
      })
      shp = [...shp, a, b]
      e = JSON.parse(JSON.stringify(shp)).map(v=>{
        v.map(q=>{
          X = q[0]
          Y = q[1]
          Z = q[2]
          R(0,0,Math.PI)
          q[0] = X
          q[1] = Y
          q[2] = Z
        })
        return v
      })
      shp = [...shp, ...e]
      e = JSON.parse(JSON.stringify(shp)).map(v=>{
        v.map(q=>{
          X = q[0]
          Y = q[1]
          Z = q[2]
          R(0,0,Math.PI/2)
          q[0] = X
          q[1] = Y
          q[2] = Z
        })
        return v
      })
      shp = [...shp, ...e]

      coords = [
        [[3,1],[4,3],[4,4],[3,2]],
        [[3,4],[3,3],[2,4],[6,2]],
        [[1,4],[0,3],[0,4],[4,2]],
        [[1,1],[1,2],[6,4],[7,3]],
        [[3,5],[7,5],[1,5],[3,0]],
        [[2,5],[6,5],[0,5],[4,5]]
      ]
      a = []
      coords.map(v=>{
        b = []
        v.map(q=>{
          X = shp[q[0]][q[1]][0]
          Y = shp[q[0]][q[1]][1]
          Z = shp[q[0]][q[1]][2]
          b = [...b, [X,Y,Z]]
        })
        a = [...a, b]
      })
      shp = [...shp, ...a]
      return shp.map(v=>{
        v.map(q=>{
          q[0]/=3
          q[1]/=3
          q[2]/=3
          q[0]*=ls
          q[1]*=ls
          q[2]*=ls
        })
        return v
      })
    }

    Torus = (rw, cl, ls1, ls2, parts=1, twists=0, part_spacing=1.5) => {
      t_ = C(t)*8
      let ret = [], tx=0, ty=0, tz=0, prl1 = 0, p2a = 0, prl2=0, p2b = 0
      tx1=ty1=tz1=tx2=ty2=tz2=0
      for(let m=parts;m--;){
        avgs = Array(rw).fill().map(v=>[0,0,0])
        for(j=rw;j--;)for(let i = cl;i--;){
          if(parts>1){
            ls3 = ls1*part_spacing
            X = S(p=Math.PI*2/parts*m) * ls3
            Y = C(p) * ls3
            Z = 0
            R(prl1 = Math.PI*2/rw*(j-1)*twists+t_,0,0)
            tx1 = X
            ty1 = Y 
            tz1 = Z
            R(0, 0, Math.PI*2/rw*(j-1))
            ax1 = X
            ay1 = Y
            az1 = Z
            X = S(p=Math.PI*2/parts*m) * ls3
            Y = C(p) * ls3
            Z = 0
            R(prl2 = Math.PI*2/rw*(j)*twists+t_,0,0)
            tx2 = X
            ty2 = Y
            tz2 = Z
            R(0, 0, Math.PI*2/rw*j)
            ax2 = X
            ay2 = Y
            az2 = Z
            p1a = Math.atan2(ax2-ax1,az2-az1)
            p2a = Math.PI/2+Math.acos((ay2-ay1)/(Math.hypot(ax2-ax1,ay2-ay1,az2-az1)+.001))

            X = S(p=Math.PI*2/parts*m) * ls3
            Y = C(p) * ls3
            Z = 0
            R(Math.PI*2/rw*(j)*twists+t_,0,0)
            tx1b = X
            ty1b = Y
            tz1b = Z
            R(0, 0, Math.PI*2/rw*j)
            ax1b = X
            ay1b = Y
            az1b = Z
            X = S(p=Math.PI*2/parts*m) * ls3
            Y = C(p) * ls3
            Z = 0
            R(Math.PI*2/rw*(j+1)*twists+t_,0,0)
            tx2b = X
            ty2b = Y
            tz2b = Z
            R(0, 0, Math.PI*2/rw*(j+1))
            ax2b = X
            ay2b = Y
            az2b = Z
            p1b = Math.atan2(ax2b-ax1b,az2b-az1b)
            p2b = Math.PI/2+Math.acos((ay2b-ay1b)/(Math.hypot(ax2b-ax1b,ay2b-ay1b,az2b-az1b)+.001))
          }
          a = []
          X = S(p=Math.PI*2/cl*i) * ls1
          Y = C(p) * ls1
          Z = 0
          //R(0,0,-p1a)
          R(prl1,p2a,0)
          X += ls2 + tx1, Y += ty1, Z += tz1
          R(0, 0, Math.PI*2/rw*j)
          a = [...a, [X,Y,Z]]
          X = S(p=Math.PI*2/cl*(i+1)) * ls1
          Y = C(p) * ls1
          Z = 0
          //R(0,0,-p1a)
          R(prl1,p2a,0)
          X += ls2 + tx1, Y += ty1, Z += tz1
          R(0, 0, Math.PI*2/rw*j)
          a = [...a, [X,Y,Z]]
          X = S(p=Math.PI*2/cl*(i+1)) * ls1
          Y = C(p) * ls1
          Z = 0
          //R(0,0,-p1b)
          R(prl2,p2b,0)
          X += ls2 + tx2, Y += ty2, Z += tz2
          R(0, 0, Math.PI*2/rw*(j+1))
          a = [...a, [X,Y,Z]]
          X = S(p=Math.PI*2/cl*i) * ls1
          Y = C(p) * ls1
          Z = 0
          //R(0,0,-p1b)
          R(prl2,p2b,0)
          X += ls2 + tx2, Y += ty2, Z += tz2
          R(0, 0, Math.PI*2/rw*(j+1))
          a = [...a, [X,Y,Z]]
          ret = [...ret, a]
        }
      }
      return ret
    }

    Cylinder = (rw, cl, ls1, ls2, caps=false) => {
      let a = []
      for(let i=rw;i--;){
        let b = []
        for(let j=cl;j--;){
          X = S(p=Math.PI*2/cl*j) * ls1
          Y = (1/rw*i-.5)*ls2
          Z = C(p) * ls1
          b = [...b, [X,Y,Z]]
        }
        if(caps) a = [...a, b]
        for(let j=cl;j--;){
          b = []
          X = S(p=Math.PI*2/cl*j) * ls1
          Y = (1/rw*i-.5)*ls2
          Z = C(p) * ls1
          b = [...b, [X,Y,Z]]
          X = S(p=Math.PI*2/cl*(j+1)) * ls1
          Y = (1/rw*i-.5)*ls2
          Z = C(p) * ls1
          b = [...b, [X,Y,Z]]
          X = S(p=Math.PI*2/cl*(j+1)) * ls1
          Y = (1/rw*(i+1)-.5)*ls2
          Z = C(p) * ls1
          b = [...b, [X,Y,Z]]
          X = S(p=Math.PI*2/cl*j) * ls1
          Y = (1/rw*(i+1)-.5)*ls2
          Z = C(p) * ls1
          b = [...b, [X,Y,Z]]
          a = [...a, b]
        }
      }
      b = []
      for(let j=cl;j--;){
        X = S(p=Math.PI*2/cl*j) * ls1
        Y = ls2/2
        Z = C(p) * ls1
        //b = [...b, [X,Y,Z]]
      }
      if(caps) a = [...a, b]
      return a
    }

    Tetrahedron = size => {
      ret = []
      a = []
      let h = size/1.4142/1.25
      for(i=3;i--;){
        X = S(p=Math.PI*2/3*i) * size/1.25
        Y = C(p) * size/1.25
        Z = h
        a = [...a, [X,Y,Z]]
      }
      ret = [...ret, a]
      for(j=3;j--;){
        a = []
        X = 0
        Y = 0
        Z = -h
        a = [...a, [X,Y,Z]]
        X = S(p=Math.PI*2/3*j) * size/1.25
        Y = C(p) * size/1.25
        Z = h
        a = [...a, [X,Y,Z]]
        X = S(p=Math.PI*2/3*(j+1)) * size/1.25
        Y = C(p) * size/1.25
        Z = h
        a = [...a, [X,Y,Z]]
        ret = [...ret, a]
      }
      ax=ay=az=ct=0
      ret.map(v=>{
        v.map(q=>{
          ax+=q[0]
          ay+=q[1]
          az+=q[2]
          ct++
        })
      })
      ax/=ct
      ay/=ct
      az/=ct
      ret.map(v=>{
        v.map(q=>{
          q[0]-=ax
          q[1]-=ay
          q[2]-=az
        })
      })
      return ret
    }

    Cube = size => {
      let j, b, a, l
      for(CB=[],j=6;j--;CB=[...CB,b])for(b=[],i=4;i--;)b=[...b,[(a=[S(p=Math.PI*2/4*i+Math.PI/4),C(p),2**.5/2])[j%3]*(l=j<3?size/2**.5:-size/2**.5),a[(j+1)%3]*l,a[(j+2)%3]*l]]
      return CB
    }

    Octahedron = size => {
      ret = []
      let h = size/1.25
      for(j=8;j--;){
        a = []
        X = 0
        Y = 0
        Z = h * (j<4?-1:1)
        a = [...a, [X,Y,Z]]
        X = S(p=Math.PI*2/4*j) * size/1.25
        Y = C(p) * size/1.25
        Z = 0
        a = [...a, [X,Y,Z]]
        X = S(p=Math.PI*2/4*(j+1)) * size/1.25
        Y = C(p) * size/1.25
        Z = 0
        a = [...a, [X,Y,Z]]
        ret = [...ret, a]
      }
      return ret      
    }

    Dodecahedron = size => {
      ret = []
      a = []
      let mind = -6e6
      for(i=5;i--;){
        X=S(p=Math.PI*2/5*i + Math.PI/5)
        Y=C(p)
        Z=0
        if(Y>mind) mind=Y
        a = [...a, [X,Y,Z]]
      }
      a.map(v=>{
        X = v[0]
        Y = v[1]-=mind
        Z = v[2]
        R(0, .553573, 0)
        v[0] = X
        v[1] = Y
        v[2] = Z
      })
      b = JSON.parse(JSON.stringify(a))
      b.map(v=>{
        v[1] *= -1
      })
      ret = [...ret, a, b]
      mind = -6e6
      ret.map(v=>{
        v.map(q=>{
          X = q[0]
          Y = q[1]
          Z = q[2]
          if(Z>mind)mind = Z
        })
      })
      d1=Math.hypot(ret[0][0][0]-ret[0][1][0],ret[0][0][1]-ret[0][1][1],ret[0][0][2]-ret[0][1][2])
      ret.map(v=>{
        v.map(q=>{
          q[2]-=mind+d1/2
        })
      })
      b = JSON.parse(JSON.stringify(ret))
      b.map(v=>{
        v.map(q=>{
          q[2]*=-1
        })
      })
      ret = [...ret, ...b]
      b = JSON.parse(JSON.stringify(ret))
      b.map(v=>{
        v.map(q=>{
          X = q[0]
          Y = q[1]
          Z = q[2]
          R(0,0,Math.PI/2)
          R(0,Math.PI/2,0)
          q[0] = X
          q[1] = Y
          q[2] = Z
        })
      })
      e = JSON.parse(JSON.stringify(ret))
      e.map(v=>{
        v.map(q=>{
          X = q[0]
          Y = q[1]
          Z = q[2]
          R(0,0,Math.PI/2)
          R(Math.PI/2,0,0)
          q[0] = X
          q[1] = Y
          q[2] = Z
        })
      })
      ret = [...ret, ...b, ...e]
      ret.map(v=>{
        v.map(q=>{
          q[0] *= size/2
          q[1] *= size/2
          q[2] *= size/2
        })
      })
      return ret
    }

    Icosahedron = size => {
      ret = []
      let B = [
        [[0,3],[1,0],[2,2]],
        [[0,3],[1,0],[1,3]],
        [[0,3],[2,3],[1,3]],
        [[0,2],[2,1],[1,0]],
        [[0,2],[1,3],[1,0]],
        [[0,2],[1,3],[2,0]],
        [[0,3],[2,2],[0,0]],
        [[1,0],[2,2],[2,1]],
        [[1,1],[2,2],[2,1]],
        [[1,1],[2,2],[0,0]],
        [[1,1],[2,1],[0,1]],
        [[0,2],[2,1],[0,1]],
        [[2,0],[1,2],[2,3]],
        [[0,0],[0,3],[2,3]],
        [[1,3],[2,0],[2,3]],
        [[2,3],[0,0],[1,2]],
        [[1,2],[2,0],[0,1]],
        [[0,0],[1,2],[1,1]],
        [[0,1],[1,2],[1,1]],
        [[0,2],[2,0],[0,1]],
      ]
      for(p=[1,1],i=38;i--;)p=[...p,p[l=p.length-1]+p[l-1]]
      phi = p[l]/p[l-1]
      a = [
        [-phi,-1,0],
        [phi,-1,0],
        [phi,1,0],
        [-phi,1,0],
      ]
      for(j=3;j--;ret=[...ret, b])for(b=[],i=4;i--;) b = [...b, [a[i][j],a[i][(j+1)%3],a[i][(j+2)%3]]]
      ret.map(v=>{
        v.map(q=>{
          q[0]*=size/2.25
          q[1]*=size/2.25
          q[2]*=size/2.25
        })
      })
      cp = JSON.parse(JSON.stringify(ret))
      out=[]
      a = []
      B.map(v=>{
        idx1a = v[0][0]
        idx2a = v[1][0]
        idx3a = v[2][0]
        idx1b = v[0][1]
        idx2b = v[1][1]
        idx3b = v[2][1]
        a = [...a, [cp[idx1a][idx1b],cp[idx2a][idx2b],cp[idx3a][idx3b]]]
      })
      out = [...out, ...a]
      return out
    }

    subbed = (subs, size, sphereize, shape) => {
      for(let m=subs; m--;){
        base = shape
        shape = []
        base.map(v=>{
          l = 0
          X1 = v[l][0]
          Y1 = v[l][1]
          Z1 = v[l][2]
          l = 1
          X2 = v[l][0]
          Y2 = v[l][1]
          Z2 = v[l][2]
          l = 2
          X3 = v[l][0]
          Y3 = v[l][1]
          Z3 = v[l][2]
          if(v.length > 3){
            l = 3
            X4 = v[l][0]
            Y4 = v[l][1]
            Z4 = v[l][2]
            if(v.length > 4){
              l = 4
              X5 = v[l][0]
              Y5 = v[l][1]
              Z5 = v[l][2]
            }
          }
          mx1 = (X1+X2)/2
          my1 = (Y1+Y2)/2
          mz1 = (Z1+Z2)/2
          mx2 = (X2+X3)/2
          my2 = (Y2+Y3)/2
          mz2 = (Z2+Z3)/2
          a = []
          switch(v.length){
            case 3:
              mx3 = (X3+X1)/2
              my3 = (Y3+Y1)/2
              mz3 = (Z3+Z1)/2
              X = X1, Y = Y1, Z = Z1, a = [...a, [X,Y,Z]]
              X = mx1, Y = my1, Z = mz1, a = [...a, [X,Y,Z]]
              X = mx3, Y = my3, Z = mz3, a = [...a, [X,Y,Z]]
              shape = [...shape, a]
              a = []
              X = mx1, Y = my1, Z = mz1, a = [...a, [X,Y,Z]]
              X = X2, Y = Y2, Z = Z2, a = [...a, [X,Y,Z]]
              X = mx2, Y = my2, Z = mz2, a = [...a, [X,Y,Z]]
              shape = [...shape, a]
              a = []
              X = mx3, Y = my3, Z = mz3, a = [...a, [X,Y,Z]]
              X = mx2, Y = my2, Z = mz2, a = [...a, [X,Y,Z]]
              X = X3, Y = Y3, Z = Z3, a = [...a, [X,Y,Z]]
              shape = [...shape, a]
              a = []
              X = mx1, Y = my1, Z = mz1, a = [...a, [X,Y,Z]]
              X = mx2, Y = my2, Z = mz2, a = [...a, [X,Y,Z]]
              X = mx3, Y = my3, Z = mz3, a = [...a, [X,Y,Z]]
              shape = [...shape, a]
              break
            case 4:
              mx3 = (X3+X4)/2
              my3 = (Y3+Y4)/2
              mz3 = (Z3+Z4)/2
              mx4 = (X4+X1)/2
              my4 = (Y4+Y1)/2
              mz4 = (Z4+Z1)/2
              cx = (X1+X2+X3+X4)/4
              cy = (Y1+Y2+Y3+Y4)/4
              cz = (Z1+Z2+Z3+Z4)/4
              X = X1, Y = Y1, Z = Z1, a = [...a, [X,Y,Z]]
              X = mx1, Y = my1, Z = mz1, a = [...a, [X,Y,Z]]
              X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
              X = mx4, Y = my4, Z = mz4, a = [...a, [X,Y,Z]]
              shape = [...shape, a]
              a = []
              X = mx1, Y = my1, Z = mz1, a = [...a, [X,Y,Z]]
              X = X2, Y = Y2, Z = Z2, a = [...a, [X,Y,Z]]
              X = mx2, Y = my2, Z = mz2, a = [...a, [X,Y,Z]]
              X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
              shape = [...shape, a]
              a = []
              X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
              X = mx2, Y = my2, Z = mz2, a = [...a, [X,Y,Z]]
              X = X3, Y = Y3, Z = Z3, a = [...a, [X,Y,Z]]
              X = mx3, Y = my3, Z = mz3, a = [...a, [X,Y,Z]]
              shape = [...shape, a]
              a = []
              X = mx4, Y = my4, Z = mz4, a = [...a, [X,Y,Z]]
              X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
              X = mx3, Y = my3, Z = mz3, a = [...a, [X,Y,Z]]
              X = X4, Y = Y4, Z = Z4, a = [...a, [X,Y,Z]]
              shape = [...shape, a]
              break
            case 5:
              cx = (X1+X2+X3+X4+X5)/5
              cy = (Y1+Y2+Y3+Y4+Y5)/5
              cz = (Z1+Z2+Z3+Z4+Z5)/5
              mx3 = (X3+X4)/2
              my3 = (Y3+Y4)/2
              mz3 = (Z3+Z4)/2
              mx4 = (X4+X5)/2
              my4 = (Y4+Y5)/2
              mz4 = (Z4+Z5)/2
              mx5 = (X5+X1)/2
              my5 = (Y5+Y1)/2
              mz5 = (Z5+Z1)/2
              X = X1, Y = Y1, Z = Z1, a = [...a, [X,Y,Z]]
              X = X2, Y = Y2, Z = Z2, a = [...a, [X,Y,Z]]
              X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
              shape = [...shape, a]
              a = []
              X = X2, Y = Y2, Z = Z2, a = [...a, [X,Y,Z]]
              X = X3, Y = Y3, Z = Z3, a = [...a, [X,Y,Z]]
              X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
              shape = [...shape, a]
              a = []
              X = X3, Y = Y3, Z = Z3, a = [...a, [X,Y,Z]]
              X = X4, Y = Y4, Z = Z4, a = [...a, [X,Y,Z]]
              X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
              shape = [...shape, a]
              a = []
              X = X4, Y = Y4, Z = Z4, a = [...a, [X,Y,Z]]
              X = X5, Y = Y5, Z = Z5, a = [...a, [X,Y,Z]]
              X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
              shape = [...shape, a]
              a = []
              X = X5, Y = Y5, Z = Z5, a = [...a, [X,Y,Z]]
              X = X1, Y = Y1, Z = Z1, a = [...a, [X,Y,Z]]
              X = cx, Y = cy, Z = cz, a = [...a, [X,Y,Z]]
              shape = [...shape, a]
              a = []
              break
          }
        })
      }
      if(sphereize){
        ip1 = sphereize
        ip2 = 1-sphereize
        shape = shape.map(v=>{
          v = v.map(q=>{
            X = q[0]
            Y = q[1]
            Z = q[2]
            d = Math.hypot(X,Y,Z)
            X /= d
            Y /= d
            Z /= d
            X *= size/2*ip1 + d*ip2
            Y *= size/2*ip1 + d*ip2
            Z *= size/2*ip1 + d*ip2
            return [X,Y,Z]
          })
          return v
        })
      }
      return shape
    }

    subDividedIcosahedron  = (size, subs, sphereize = 0) => subbed(subs, size, sphereize, Icosahedron(size))
    subDividedTetrahedron  = (size, subs, sphereize = 0) => subbed(subs, size, sphereize, Tetrahedron(size))
    subDividedOctahedron   = (size, subs, sphereize = 0) => subbed(subs, size, sphereize, Octahedron(size))
    subDividedCube         = (size, subs, sphereize = 0) => subbed(subs, size, sphereize, Cube(size))
    subDividedDodecahedron = (size, subs, sphereize = 0) => subbed(subs, size, sphereize, Dodecahedron(size))

    ofz = 0
    subV = (v, subres = 1) => {
      if(!showOutput && !showPreview) subres = 1
      x('beginPath')
      v.map((q, j) => {
        l1 = j
        l2 = (j+1) % v.length

        X = v[l1][0]
        Y = v[l1][1]
        Z = v[l1][2]
        R(Rl,Pt,Yw,1)
        Z += ofz
        l  = Q()
        X1a = l[0]
        Y1a = l[1]

        camX1 = camX
        camY1 = camY
        camZ1 = camZ
        camD1 = camD
        camposX1 = camposX
        camposY1 = camposY
        camposZ1 = camposZ

        X1b = l[2]
        Y1b = l[3]

        X = v[l2][0]
        Y = v[l2][1]
        Z = v[l2][2]
        R(Rl,Pt,Yw,1)
        Z += ofz
        l  = Q()
        X2a = l[0]
        Y2a = l[1]

        camX2 = camX
        camY2 = camY
        camZ2 = camZ
        camD2 = camD
        camposX2 = camposX
        camposY2 = camposY
        camposZ2 = camposZ

        X2b = l[2]
        Y2b = l[3]

        let sd_ = Math.min(20, ((l=Math.hypot(X2b-X1b, Y2b-Y1b)/5/output.height+10)/10|0)*subres)
        Xa = X1a + (X2a-X1a)
        Ya = Y1a + (Y2a-Y1a)
        Z_ = Z
        for(let m=0; m<sd_+1; m++){
          Xb = X1b + (X2b-X1b) / sd_ * m
          Yb = Y1b + (Y2b-Y1b) / sd_ * m

          camX = camX1 + (camX2 - camX1) / sd_ * m
          camY = camY1 + (camY2 - camY1) / sd_ * m
          camZ = camZ1 + (camZ2 - camZ1) / sd_ * m
          camposX = camposX1 + (camposX2 - camposX1) / sd_ * m
          camposY = camposY1 + (camposY2 - camposY1) / sd_ * m
          camposZ = camposZ1 + (camposZ2 - camposZ1) / sd_ * m
          camD = camD1 + (camD2 - camD1) / sd_ * m
          Z = m ? -1 : Z_  // only apply subsegmenting to HDRI (neg Z bypasses in x func)
          x('lineTo', Xa, Ya, Xb, Yb)
        }
        Z = Z_
      })
    }

    stroke = (scol, fcol, lw, dl, oga=1, ocp=true) => {
      if(scol){
        x('strokeStyle', scol)
        if(ocp) x('closePath')
        x('lineWidth', 1+Math.min(250, 50/(2+Z)*lw), 1+Math.min(250, 50/camD*lw))
        nlw = x('lineWidth')
        nlw1 = Math.min(250, 50/(2+Z)*lw)
        nlw2 = Math.min(250, 50/camD*lw)
        if(dl){
          x('globalAlpha', .33 * oga)
          x('stroke')
          x('lineWidth', 1+nlw1/4, 1+nlw2/4)
        }
        x('globalAlpha', 1*oga)
        x('stroke')
      }
      if(fcol){
        x('globalAlpha', 1*oga)
        x('fillStyle', fcol)
        x('fill')
      }
      x('globalAlpha', 1)
    }
    
    

    /*bg = document.createElement('video')
    bg.loop = true
    bg.muted = true
    bg.defaultPlaybackRate = bg.playbackRate = .1
    bg.oncanplay = () => bg.play()
    //url = 'https://srmcgann.github.io/skyboxes5/videos/cluds.mp4'
    url = 'https://srmcgann.github.io/skyboxes5/videos/3suns.mp4'
    //url = 'https://srmcgann.github.io/skyboxes2/videos/tracks.mp4'
    //url = 'https://srmcgann.github.io/skyboxes2/videos/pulse_darker.mp4'
    */

    bg = new Image()
    //url = 'https://srmcgann.github.io/skyboxes3/HDRI/ultracloudsbase.jpg'
    //url = 'https://srmcgann.github.io/skyboxes3/HDRI/pinkCluds.jpg'
    //url = 'https://srmcgann.github.io/skyboxes3/HDRI/ultraclouds4.jpg'
    //url = 'https://srmcgann.github.io/skyboxes4/HDRI/brutalism2.jpg'
    //url = 'https://srmcgann.github.io/skyboxes3/HDRI/brutalism1.jpg'
    //url = 'https://srmcgann.github.io/skyboxes2/HDRI/stars.jpg'
    //url = 'https://srmcgann.github.io/skyboxes2/HDRI/nebula.jpg'
    //url = 'https://srmcgann.github.io/skyboxes2/HDRI/nebula.jpg'
    //url = 'https://srmcgann.github.io/skyboxes3/HDRI/ultraclouds4.jpg'
    //url = 'https://srmcgann.github.io/skyboxes3/HDRI/treehouses.jpg'
    url = 'https://srmcgann.github.io/skyboxes3/HDRI/redCluds.jpg'
    //url = 'https://srmcgann.github.io/skyboxes3/HDRI/fantasy1.jpg'
    //url = 'https://cdn1.epicgames.com/ue/product/Screenshot/Untitled-10-1920x1080-86381bc8f4b33263d58c8b12f72c2bcf.jpg'
    
    bg2 = new Image()
    url2 = 'https://srmcgann.github.io/skyboxes3/HDRI/maze_light.png'
    //url2 = 'https://srmcgann.github.io/skyboxes3/HDRI/maze_bold_dark.png'
    
    showBG = true
    showBG2 = false
    if(showBG) {
      await fetch(url).then(res=>res.blob()).then(data=>bg.src = URL.createObjectURL(data))
    }
    if(showBG2) {
      await fetch(url2).then(res=>res.blob()).then(data=>bg2.src = URL.createObjectURL(data))
    }
    
    loadBaseShape = () => {
      phase = Math.min(1, Math.max(0, (0+C(t))*3))
      base_shp = subDividedCube(1.5+phase/4, 1,phase).map(v=>{
        v.map(q=>{
          //q[2] *= .25
        })
        return [v, []]
      })
    }
    loadBaseShape()
    
    iBc = 3
    ls = 16
    
    B = []
    template = subDividedCube(ls*1,0,1).map(v=>{
      ax = ay = az = ct = 0
      v.map(q=>{
        ax += q[0]
        ay += q[1]
        az += q[2]
        ct ++
      })
      ax /= ct
      ay /= ct
      az /= ct
      X = ax
      Y = ay
      Z = az
      B = [...B, [X,Y,Z, structuredClone(base_shp)]]
    })
  }

  cls()
  
  loadBaseShape()
  
  if(showBG){
    if(Yw > Math.PI*2) Yw -= Math.PI*4
    if(Yw < -Math.PI*2) Yw += Math.PI*4
    bgofx1 = c.width * (Yw/Math.PI/2)
    while(bgofx1 < -c.width) bgofx1++
    while(bgofx1 > c.width) bgofx1--
    x('globalAlpha', 1)
    if(bgofx1 > 0) x_.drawImage(bg,bgofx1-c.width,0,c.width,c.height)
    x_.drawImage(bg,bgofx1,0,c.width,c.height)
    if(bgofx1 < 0) x_.drawImage(bg,bgofx1+c.width,0,c.width,c.height)
    if(bgofx1 > 0) octx.drawImage(bg,bgofx1-output.width,0,output.width,output.height)
    octx.drawImage(bg,bgofx1,0,output.width,output.height)
    if(bgofx1 < 0) octx.drawImage(bg,bgofx1+output.width,0,output.width,output.height)
    
    //x('fillStyle', `hsla(${t*200},99%,0%,.5)`)
    x('fillStyle', `#000d`)
    x_.fillRect(0,0,c.width,c.height)
    octx.fillRect(0,0,output.width,output.height)
  }
  if(showBG2){
    if(Yw > Math.PI*2) Yw -= Math.PI*4
    if(Yw < -Math.PI*2) Yw += Math.PI*4
    bgofx1 = c.width * (Yw/Math.PI/2)
    while(bgofx1 < -c.width) bgofx1++
    while(bgofx1 > c.width) bgofx1--
    x('globalAlpha', 1)
    if(bgofx1 > 0) x_.drawImage(bg2,bgofx1-c.width,0,c.width,c.height)
    x_.drawImage(bg2,bgofx1,0,c.width,c.height)
    if(bgofx1 < 0) x_.drawImage(bg2,bgofx1+c.width,0,c.width,c.height)
    //if(bgofx1 > 0) octx.drawImage(bg2,bgofx1-output.width,0,output.width,output.height)
    //octx.drawImage(bg2,bgofx1,0,output.width,output.height)
    //if(bgofx1 < 0) octx.drawImage(bg2,bgofx1+output.width,0,output.width,output.height)
    
    //x('fillStyle', `hsla(${t*200},99%,0%,.5)`)
    x('fillStyle', `#000e`)
    x_.fillRect(0,0,c.width,c.height)
    octx.fillRect(0,0,output.width,output.height)
  }
  
  oX  = 0
  oY  = 0
  oZ  = Math.min(12, Math.max(1, (.3+C(t/4))*40))
  Rl  = 0
  Pt  = -t/16-.3
  Yw  = t/4//Math.min(Math.PI*1.5, Math.max(0, (.5-C(t/2))*Math.PI*1.25))

  lockViews = true

  if(lockViews){
    camposX = oX
    camposY = oY
    camposZ = oZ
    camRl = Rl
    camPt = Pt
    camYw = Yw
  }else{
    camposX = 0
    camposY = 0
    camposZ = 0
    camRl = 0
    camPt = -.01
    camYw = -.01
  }
  
  rl = 0
  pt = .01 * S(t*20)
  yw = .01 * C(t*20)
  vel = .04
  drag = 1//1.000000001
  
  homing = 10
  
  B.map((v, idx) => {
    tx = v[0]
    ty = v[1]
    tz = v[2]
    
    //v[3] = v[3].map(q=>{
    base_shp.map((q, j) => {
      a_ = []
      q[0].map(n => {
        X = n[0]
        Y = n[1]
        Z = n[2]
        //R(0,0,t)
        R(rl,pt,yw)
        X = tx + X//(n[0] = X)
        Y = ty + Y//(n[1] = Y)
        Z = tz + Z//(n[2] = Z)
        a_ = [...a_, [X,Y,Z]]
      })
      
      n = Normal(a_, autoFlipNormals=true, X1=tx, Y1=ty, Z1=tz)
      X1 = n[0]
      Y1 = n[1]
      Z1 = n[2]
      
      vx = n[0]-n[3] //X1 - tx
      vy = n[1]-n[4] //Y1 - ty
      vz = n[2]-n[5] //Z1 - tz
      d = Math.hypot(vx,vy,vz)
      vx /= d
      vy /= d
      vz /= d
      vx *= vel
      vy *= vel
      vz *= vel
      v[3][j][1] = [...v[3][j][1], [X1,Y1,Z1,vx,vy,vz,1,idx]]
      
      v[3][j][1] = v[3][j][1].filter(n => n[6]>.19)
      v[3][j][1].map(n => {
        
        Xa = n[0]
        Ya = n[1]
        Za = n[2]
        B.map((k,l) => {
          if(l!=n[7]){
            tx2 = k[0]
            ty2 = k[1]
            tz2 = k[2]
            d = 1+(1+Math.hypot(a=Xa-tx2, b=Ya-ty2, e=Za-tz2))**5/3
            n[3] -= a / d
            n[4] -= b / d
            n[5] -= e / d
          }
        })
        
        
        d = Math.hypot(n[3],n[4],n[5])
        n[3] /= d
        n[4] /= d
        n[5] /= d
        n[3] *= vel
        n[4] *= vel
        n[5] *= vel
        
        X = n[0] += n[3] /= drag
        Y = n[1] += n[4] /= drag
        Z = n[2] += n[5] /= drag
        R(Rl,Pt,Yw,1)
        l=Q()
        s = Math.min(1e3, 500/Z * n[6]**1)
        s2 = Math.min(1e3, 500/camD * n[6]**1)
        x('fillStyle', '#4400ff03')
        x('fillRect', l[0]-s/2,l[1]-s/2,s,s, l[2]-s2/2,l[3]-s2/2,s2,s2)
        s/=3
        s2/=3
        x('fillStyle', '#00ff8808')
        x('fillRect', l[0]-s/2,l[1]-s/2,s,s, l[2]-s2/2,l[3]-s2/2,s2,s2)
        s/=4
        s2/=4
        x('fillStyle', '#fff8')
        x('fillRect', l[0]-s/2,l[1]-s/2,s,s, l[2]-s2/2,l[3]-s2/2,s2,s2)
        n[6] -= .01
      })
      
      if(showNormals=true){
        X2 = X1-(n[3]-X1)/2
        Y2 = Y1-(n[4]-Y1)/2
        Z2 = Z1-(n[5]-Z1)/2
        b = [[X1,Y1,Z1],[X2,Y2,Z2]]
        subV(b)
        col1 = '#f008'
        col2 = ''
        stroke(col1, col2, 1, false)
      }
  
      subV(a_)
      col1 = '#0f41'
      col2 = '#0f41'
      stroke(col1, col2, .25, false)
      return q
    })
  })

  if(showOutput) {
    if(showPreview) {24
      tbctx.drawImage(c,0,0,tempBuffer.width,tempBuffer.height)
    }
    x_.drawImage(output, 0, 0, c.width, c.height)
    if(showPreview){
      prevScale = 1
      x_.strokeStyle = '#0f8'
      x_.lineWidth = 6*prevScale
      x_.strokeRect(c.width - 410*prevScale, 10*prevScale, 400*prevScale, 400/outputAspectRatio*prevScale | 0)
      x_.drawImage(tempBuffer, c.width - 410*prevScale, 10*prevScale, 400*prevScale, 400/outputAspectRatio*prevScale | 0)
    }
  }else{
    if(showPreview){
      prevScale = 1
      x_.strokeStyle = '#0f8'
      x_.lineWidth = 6*prevScale
      x_.strokeRect(c.width - 410*prevScale, 10*prevScale, 400*prevScale, 400/outputAspectRatio*prevScale | 0)
      x_.drawImage(output, c.width - 410*prevScale, 10*prevScale, 400*prevScale, 400/outputAspectRatio*prevScale | 0)
    }
  }
  if(showPreview){
    x_.font = (fs=26*prevScale) + 'px monospace'
    x_.fillStyle = '#fffa'
    x_.strokeStyle = '#000a'
    x_.textAlign = 'left'
    x_.strokeText('[h] to toggle default/HDRI', c.width - 400*prevScale, 400/outputAspectRatio*prevScale + fs * 2 + 40*prevScale)
    x_.fillText('[h] to toggle default/HDRI', c.width - 400*prevScale, 400/outputAspectRatio*prevScale + fs * 2 + 40*prevScale)
    x_.strokeText('[f] toggle force-correct AR', c.width - 400*prevScale, 400/outputAspectRatio*prevScale + 40*prevScale )
    x_.fillText('[f] toggle force-correct AR', c.width - 400*prevScale, 400/outputAspectRatio*prevScale + 40*prevScale )
    x_.strokeText('[r] to toggle render-view', c.width - 400*prevScale, 400/outputAspectRatio*prevScale + fs * 1+ 40*prevScale)
    x_.fillText('[r] to toggle render-view', c.width - 400*prevScale, 400/outputAspectRatio*prevScale + fs * 1 + 40*prevScale)
  }
  
  t+=1/60
  requestAnimationFrame(Draw)
}
Draw()