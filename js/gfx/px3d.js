'use strict';
// Пиксельный 3D-мир от первого лица — как живописный пиксель-арт: мир рисуется в маленьком
// разрешении и растягивается без сглаживания. Земля и стены — пиксельные текстуры 32×32,
// деревья, люди, звери и вещи — спрайты из объёмных моделей (Gfx.PX).
// Свет написан «по-художнички»: солнце отбрасывает тени (карта теней), освещённое — тёплое,
// тень — холодная, даль тонет в голубой дымке, а у солнца дымка золотится. Небо — с облаками,
// подсвеченными солнцем, закатами, звёздами и луной. Дождь и снег — тихие.
// Мир состоит из кусков (чанков): у каждого свой буфер и смещение; вершины хранятся
// относительно начала куска, а кадр строится относительно точки рядом с камерой — так даже
// на краю огромного мира точности хватает.
// Модуль ничего не знает об игре: на входе — сетки, описание кадра и камера (js/ui/view3d.js).
(function (E) {
  const Gfx = E.Gfx;
  const P3 = Gfx.P3 = {};
  let cv = null, gl = null, ok = false;
  const S = {};

  // ============================================================
  // Шейдеры
  // ============================================================
  const PREC = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;
  // вершина мира: pos(3) loc(2) tile(2) n(3) sky(1) kind(1) tint(3) = 15 float
  // kind: 0 земля и стены, 1 вода, 2…9 мягкий край соседней земли, 20 дальняя земля
  const VS_WORLD = `
attribute vec3 aPos; attribute vec2 aLoc; attribute vec2 aTile; attribute vec3 aN; attribute float aSky; attribute float aKind; attribute vec3 aTint;
uniform mat4 uVP; uniform vec3 uOff; uniform vec4 uNear; uniform mat4 uSM; uniform vec4 uHide; uniform float uThird; uniform float uWT;
varying vec2 vLoc; varying vec2 vTile; varying vec3 vN; varying vec3 vW; varying float vSky; varying float vKind; varying vec3 vTint; varying vec4 vLS;
void main(){
  vec3 p = aPos + uOff;
  // дальняя земля уходит вниз там, где лежат подробные куски
  if (aKind > 19.5 && p.x > uNear.x && p.x < uNear.z && p.z > uNear.y && p.z < uNear.w) p.y -= aKind > 21.5 ? 200.0 : 8.0;
  // дом, где ты: крыши нет, потолок есть; в других домах — наоборот
  bool inH = p.x > uHide.x && p.x < uHide.z && p.z > uHide.y && p.z < uHide.w;
  if ((aKind > 9.5 && aKind < 10.5 && inH) || (aKind > 10.5 && aKind < 11.5 && (!inH || uThird > 0.5)) || (aKind > 11.5 && aKind < 12.5 && uThird > 0.5)) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  // травинки качает ветер (верх сильнее низа)
  if (aKind > 13.5 && aKind < 14.5) { float k = aLoc.y*aLoc.y; p.x += sin(uWT*1.7 + p.x*0.9 + p.z*0.6)*0.07*k; p.z += cos(uWT*1.3 + p.x*0.5 - p.z*0.8)*0.05*k; }
  vLoc=aLoc; vTile=aTile; vN=aN; vW=p; vSky=aSky; vKind=aKind; vTint=aTint;
  vLS = uSM * vec4(p + aN*0.05, 1.0);
  gl_Position = uVP*vec4(p,1.0);
}`;
  const LIGHT_FN = `
uniform vec3 uSunDir; uniform vec3 uSunSky; uniform vec3 uSun; uniform vec3 uAmb; uniform vec3 uFog; uniform vec3 uFogSun; uniform vec3 uCam; uniform float uFogD; uniform float uTime; uniform float uNight;
uniform vec3 uZen; uniform vec3 uHor;
uniform vec4 uLP[__NL__]; uniform vec4 uLC[__NL__]; uniform int uNL; uniform float uQL; uniform float uDith;
uniform sampler2D uShadow; uniform float uShOn; uniform float uShTex; uniform vec4 uCut;
// вырез: что стоит между камерой и героем (крыши, стены, деревья), становится сквозным в мелкую точку
float cutK(vec3 w){
  if (uCut.w <= 0.0) return 0.0;
  vec3 ab = uCut.xyz - uCam;
  float t = clamp(dot(w - uCam, ab)/dot(ab, ab), 0.0, 1.0);
  if (t > 0.9) return 0.0;
  float d = length(w - (uCam + ab*t));
  return 1.0 - smoothstep(uCut.w*0.55, uCut.w, d);
}
float unpackD(vec4 c){ return dot(c, vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/16581375.0)); }
float shadowAt(vec4 ls, float bias){
  if (uShOn < 0.5) return 1.0;
  vec3 p = ls.xyz / ls.w * 0.5 + 0.5;
  if (p.x <= 0.0 || p.x >= 1.0 || p.y <= 0.0 || p.y >= 1.0 || p.z >= 1.0) return 1.0;
  float px = 1.0/uShTex, s = 0.0;
  s += step(p.z - bias, unpackD(texture2D(uShadow, p.xy + vec2(-0.5,-0.5)*px)));
  s += step(p.z - bias, unpackD(texture2D(uShadow, p.xy + vec2( 0.5,-0.5)*px)));
  s += step(p.z - bias, unpackD(texture2D(uShadow, p.xy + vec2(-0.5, 0.5)*px)));
  s += step(p.z - bias, unpackD(texture2D(uShadow, p.xy + vec2( 0.5, 0.5)*px)));
  float edge = smoothstep(0.0, 0.1, min(min(p.x, 1.0-p.x), min(p.y, 1.0-p.y)));
  return mix(1.0, s*0.25, edge*uShOn);
}
vec3 lightAt(vec3 w, vec3 n, float sky, float fl, float sh){
  float sunL = mix(max(dot(n, uSunDir), 0.0), 0.5 + 0.5*max(uSunDir.y,0.0), fl) * sh;
  vec3 L = uAmb*(0.6 + 0.4*mix(n.y,1.0,fl))*sky + uSun*sunL*sky + vec3(0.03,0.028,0.04);
  for (int i=0;i<__NL__;i++){
    if (i>=uNL) break;
    vec3 d = uLP[i].xyz - w; float dist = length(d);
    float att = clamp(1.0 - dist/uLP[i].w, 0.0, 1.0); att *= att;
    float nd = mix(0.35 + 0.65*max(dot(n, d/max(dist,0.001)), 0.0), 1.0, fl);
    L += uLC[i].rgb*uLC[i].a*att*nd;
  }
  return L;
}
// мрачный живописный свет: тени — холодные, серо-зелёные; свет — тусклое золото; краски приглушены, контраст глубже
vec3 grade(vec3 c, vec3 L){
  float lum = dot(L, vec3(0.3,0.55,0.15));
  vec3 tint = mix(vec3(0.58,0.68,0.74), vec3(1.05,0.97,0.84), smoothstep(0.12, 0.95, lum));
  vec3 o = c*L*tint;
  float g = dot(o, vec3(0.3,0.55,0.15));
  o = max(mix(vec3(g), o, 0.8), 0.0);
  vec3 s = clamp(o, 0.0, 1.0);
  return mix(o, s*s*(3.0 - 2.0*s), 0.32);
}
// воздушная перспектива: даль голубеет, у солнца — золотится; низины туманнее
vec3 fogIt(vec3 c, vec3 w){
  vec3 d = w - uCam; float fd = length(d);
  float hk = exp(-max(w.y + 2.0, 0.0)*0.03);
  float f = 1.0 - exp(-pow(fd*uFogD, 1.15)*(0.5 + 0.5*hk));
  float sd = max(dot(d/max(fd,0.001), uSunSky), 0.0);
  vec3 fc = mix(uFog, uFogSun, pow(sd, 5.0));
  return mix(c, fc, clamp(f, 0.0, 1.0));
}
vec3 skyCol(vec3 d){ return mix(uHor, uZen, smoothstep(-0.02, 0.6, d.y)); }
float bayer(vec2 p){ vec2 q = mod(floor(p), 4.0); float a = q.x + q.y*4.0;
  return (a==0.0?0.0:a==1.0?8.0:a==2.0?2.0:a==3.0?10.0:a==4.0?12.0:a==5.0?4.0:a==6.0?14.0:a==7.0?6.0:a==8.0?3.0:a==9.0?11.0:a==10.0?1.0:a==11.0?9.0:a==12.0?15.0:a==13.0?7.0:a==14.0?13.0:5.0)/16.0; }
vec3 quant(vec3 c){ if (uQL < 1.5) return c; float b = (bayer(gl_FragCoord.xy) - 0.5)*uDith; return floor(c*uQL + 0.5 + b)/uQL; }`;
  const FS_WORLD = PREC + `
uniform sampler2D uTex; uniform float uTS; uniform vec2 uFarTile;
varying vec2 vLoc; varying vec2 vTile; varying vec3 vN; varying vec3 vW; varying float vSky; varying float vKind; varying vec3 vTint; varying vec4 vLS;
${LIGHT_FN}
void main(){
  vec2 l = vLoc;
  bool water = (vKind > 0.5 && vKind < 1.5) || (vKind > 20.5 && vKind < 21.5);
  if (vKind > 1.5 && vKind < 9.5) { // край соседней земли: растворяется точками к середине клетки
    vec2 q = fract(vLoc); vec2 tp = floor(vLoc*16.0);
    float d = vKind < 2.5 ? q.y : vKind < 3.5 ? 1.0-q.x : vKind < 4.5 ? 1.0-q.y : vKind < 5.5 ? q.x
      : vKind < 6.5 ? length(vec2(1.0-q.x, q.y)) : vKind < 7.5 ? length(vec2(1.0-q.x, 1.0-q.y)) : vKind < 8.5 ? length(vec2(q.x, 1.0-q.y)) : length(q);
    float nz = fract(sin(dot(floor(vLoc*8.0), vec2(12.9898,78.233)))*43758.5453);
    if (1.0 - d/0.36 + (nz-0.5)*0.55 < bayer(tp)) discard;
  }
  if (water) l += vec2(uTime*0.03 + sin(uTime*0.6 + vW.z*0.9)*0.05, uTime*0.012);
  vec3 n = normalize(vN);
  if (vW.y > uCut.y - 0.9 && !water && vKind < 13.5 && (vKind > 9.5 || n.y < 0.6 || vKind < 0.5)) { float ck = cutK(vW); if (ck > 0.0 && bayer(gl_FragCoord.xy) < ck*0.88) discard; }
  vec4 t;
  vec3 base;
  if (vKind > 19.5 && vKind < 20.5) {
    // дальняя земля: крупный и мелкий шум; на кручах снег не держится — там камень пластами
    t = texture2D(uTex, uFarTile + fract(vLoc)*uTS);
    float t2 = texture2D(uTex, uFarTile + fract(vLoc*3.7)*uTS).r;
    base = vTint*(0.78 + t.r*0.3 + t2*0.16);
    float steep = 1.0 - smoothstep(0.55, 0.85, n.y);
    float snowy = smoothstep(0.82, 0.95, vTint.b);
    vec3 rock = vec3(0.42, 0.39, 0.36)*(0.75 + t2*0.45 + 0.12*sin(vW.y*2.3 + t.r*3.0));
    base = mix(base, rock, steep*max(snowy, 0.6));
    t.a = 1.0;
  }
  else if (vKind > 13.5 && vKind < 15.5) { t = vec4(1.0); base = vTint; }
  else { t = texture2D(uTex, vTile + fract(l)*uTS); base = t.rgb*vTint; }
  float sh = shadowAt(vLS, 0.0018);
  vec3 L = lightAt(vW, n, vSky, 0.0, sh);
  vec3 c = grade(base, L);
  if (water) {
    vec3 v = normalize(vW - uCam);
    vec3 r = reflect(v, n);
    float fr = 0.25 + 0.6*pow(1.0 - max(dot(-v, n), 0.0), 3.0);
    c = mix(c, skyCol(r)*(0.55 + 0.45*vSky), fr*vSky);
    float g = pow(max(dot(r, uSunSky), 0.0), 40.0);
    c += uSun*g*1.2*vSky*sh;
  }
  if (t.a < 0.6) { float em = t.a > 0.4 ? 1.0 : uNight; c = mix(c, t.rgb*1.3, em); }
  // белые точки в траве светятся сами; травинки ночью чуть видны и без огня
  if (vKind > 14.5 && vKind < 15.5) c = max(c, vTint*(0.55 + 0.45*uNight));
  if (vKind > 13.5 && vKind < 14.5) c = max(c, vTint*0.5*uNight*vLoc.y);
  // в альфе — что это (для отражений и ASCII): вода, стены и крыши, земля
  float solid = (vKind > 9.5 && vKind < 10.5) || (vKind > 12.5 && vKind < 13.5) || vKind > 21.5 || n.y < 0.6 ? 0.9 : 1.0;
  gl_FragColor = vec4(quant(fogIt(c, vW)), water ? 0.5 : solid);
}`;
  // спрайты-«щиты»: всегда лицом к камере, стоят на земле
  // вершина: center(3) off(2) uv(2) sky(1) = 8 float
  const VS_BB = `
attribute vec3 aC; attribute vec2 aO; attribute vec2 aUV; attribute float aSky;
uniform mat4 uVP; uniform vec3 uOff; uniform vec3 uRight; uniform mat4 uSM; uniform vec3 uSunDir;
varying vec2 vUV; varying vec3 vW; varying vec4 vLS; varying float vSky; varying float vH;
void main(){
  vec3 c = aC + uOff;
  vec3 p = c + uRight*aO.x + vec3(0.0, aO.y, 0.0);
  vUV = aUV; vW = p; vSky = aSky; vH = aO.y;
  vLS = uSM * vec4(p + uSunDir*0.9 + vec3(0.0,0.15,0.0), 1.0);
  gl_Position = uVP*vec4(p,1.0);
}`;
  const FS_BB = PREC + `
uniform sampler2D uSpr; uniform vec3 uTintAll;
varying vec2 vUV; varying vec3 vW; varying vec4 vLS; varying float vSky; varying float vH;
${LIGHT_FN}
void main(){
  vec4 t = texture2D(uSpr, vUV);
  // всё сплошное: точка либо есть, либо её нет
  if (t.a < 0.5) discard;
  if (vW.y > uCut.y - 1.1) { float ck = cutK(vW); if (ck > 0.0 && bayer(gl_FragCoord.xy) < ck*0.8) discard; }
  vec3 toCam = normalize(vec3(uCam.x - vW.x, 0.0, uCam.z - vW.z) + vec3(0.0,0.001,0.0));
  vec3 n = normalize(vec3(0.0, 0.55, 0.0) + toCam*0.6 + uSunDir*0.25);
  float sh = shadowAt(vLS, 0.004);
  vec3 L = lightAt(vW, n, vSky, 0.65, sh);
  vec3 c = t.a > 0.96 && t.a < 0.99 ? t.rgb*1.15 : grade(t.rgb*uTintAll, L);
  gl_FragColor = vec4(quant(fogIt(c, vW)), 0.8);
}`;
  // тени: глубина от солнца, упакованная в цвет
  const PACK = `vec4 packD(float d){ vec4 e = fract(d * vec4(1.0, 255.0, 65025.0, 16581375.0)); e -= e.yzww * vec4(1.0/255.0, 1.0/255.0, 1.0/255.0, 0.0); return e; }`;
  const VS_SH_WORLD = `
attribute vec3 aPos; attribute float aKind;
uniform mat4 uLVP; uniform vec3 uOff;
void main(){ if (aKind > 0.5 && (aKind < 9.5 || aKind > 19.5 || (aKind > 13.5 && aKind < 15.5))) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; } gl_Position = uLVP*vec4(aPos + uOff, 1.0); }`;
  const FS_SH = PREC + `${PACK}
void main(){ gl_FragColor = packD(gl_FragCoord.z); }`;
  const VS_SH_BB = `
attribute vec3 aC; attribute vec2 aO; attribute vec2 aUV;
uniform mat4 uLVP; uniform vec3 uOff; uniform vec3 uLRight;
varying vec2 vUV;
void main(){ vec3 p = aC + uOff + uLRight*aO.x + vec3(0.0, aO.y, 0.0); vUV = aUV; gl_Position = uLVP*vec4(p, 1.0); }`;
  const FS_SH_BB = PREC + `${PACK}
uniform sampler2D uSpr; varying vec2 vUV;
void main(){ vec4 t = texture2D(uSpr, vUV); if (t.a < 0.5) discard; gl_FragColor = packD(gl_FragCoord.z); }`;
  // небо: градиент, сияние у солнца, облака, подсвеченные солнцем, звёзды, Млечный путь, луна
  const VS_SKY = `attribute vec2 aP; varying vec2 vP; void main(){ vP=aP; gl_Position=vec4(aP,0.999,1.0); }`;
  const FS_SKY = PREC + `
varying vec2 vP;
uniform vec3 uF; uniform vec3 uR; uniform vec3 uU; uniform float uTan; uniform float uAsp;
uniform vec3 uZen; uniform vec3 uHor; uniform vec3 uSunDir; uniform vec3 uSunC; uniform vec3 uGlow; uniform vec3 uMoonDir; uniform float uStars; uniform float uTime;
uniform float uCloud; uniform vec3 uCloudLit; uniform vec3 uCloudSh; uniform float uIn; uniform float uSeed; uniform float uQL; uniform float uDith;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float f=0.0, a=0.5; for (int i=0;i<5;i++){ f += a*n2(p); p = p*2.02 + vec2(3.1, 7.7); a *= 0.5; } return f; }
// кучевые облака: клубы — шум, поднятый к краям
float cloudDen(vec2 p){ float f = fbm(p); float g = fbm(p*0.35 + 11.0); return f*0.7 + g*0.45; }
float bayer(vec2 p){ vec2 q = mod(floor(p), 4.0); float a = q.x + q.y*4.0;
  return (a==0.0?0.0:a==1.0?8.0:a==2.0?2.0:a==3.0?10.0:a==4.0?12.0:a==5.0?4.0:a==6.0?14.0:a==7.0?6.0:a==8.0?3.0:a==9.0?11.0:a==10.0?1.0:a==11.0?9.0:a==12.0?15.0:a==13.0?7.0:a==14.0?13.0:5.0)/16.0; }
vec3 quant(vec3 c){ if (uQL < 1.5) return c; float b = (bayer(gl_FragCoord.xy) - 0.5)*uDith; float q = uQL*0.82; return floor(c*q + 0.5 + b)/q; }
void main(){
  if (uIn > 0.5) { gl_FragColor = vec4(uHor, 0.95); return; }
  vec3 d = normalize(uF + uR*vP.x*uTan*uAsp + uU*vP.y*uTan);
  float y = d.y;
  vec3 c = mix(uHor, uZen, pow(smoothstep(-0.03, 0.62, y), 0.75));
  float sd = max(dot(d, uSunDir), 0.0);
  // сияние у солнца
  c += uGlow*(pow(sd, 5.0)*0.32 + pow(sd, 40.0)*0.55)*(1.0 - 0.5*smoothstep(0.0, 0.7, y));
  // звёзды и Млечный путь
  if (y > 0.0 && uStars > 0.01) {
    vec2 sp = d.xz/(y + 0.35);
    float band = exp(-pow((d.x*0.6 + d.z*0.8 + y*0.35 - 0.1)*3.2, 2.0));
    float mw = fbm(sp*3.0 + 5.0)*band;
    c += vec3(0.32, 0.3, 0.45)*mw*uStars*0.7;
    vec2 cell = floor(sp*95.0); float s = h2(cell);
    float tw = 0.65 + 0.35*sin(uTime*2.3 + s*60.0);
    float big = step(0.9975, s);
    c += mix(vec3(0.75,0.8,1.0), vec3(1.0,0.85,0.7), h2(cell+3.0))*(step(0.992 - band*0.01, s)*0.7 + big*0.6)*uStars*tw*smoothstep(0.0, 0.18, y);
  }
  // луна с пятнами
  float md = dot(d, uMoonDir);
  if (md > 0.9985) { float k = smoothstep(0.9985, 0.9991, md); vec2 mp = (d.xz - uMoonDir.xz)*900.0; c = mix(c, vec3(0.86,0.88,0.94)*(0.85 + 0.15*n2(mp*0.5)), k*uStars); }
  c += vec3(0.5,0.55,0.7)*pow(max(md,0.0), 200.0)*0.25*uStars;
  // солнечный диск
  c += uSunC*smoothstep(0.9978, 0.9986, sd)*1.4;
  // облака: плоскость над головой; ближе к горизонту — гуще и выше (кучевые башни)
  if (y > -0.02) {
    float yy = max(y, 0.0);
    vec2 p = d.xz/(yy + 0.07)*0.75 + vec2(uTime*0.010, uTime*0.004) + uSeed;
    float den = cloudDen(p);
    vec2 toSun = normalize(uSunDir.xz + vec2(1e-4))*0.11;
    float den2 = cloudDen(p + toSun);
    float lit = clamp(0.55 + (den - den2)*4.5, 0.0, 1.0);
    float cov = 0.86 - uCloud*0.42 - (1.0 - smoothstep(0.0, 0.35, yy))*0.1;
    float a = smoothstep(cov, cov + 0.14, den);
    vec3 cc = mix(uCloudSh, uCloudLit, lit);
    // серебряный край со стороны солнца
    cc += uGlow*pow(sd, 6.0)*(1.0 - smoothstep(cov, cov + 0.3, den))*0.9;
    a *= smoothstep(-0.02, 0.06, y);
    c = mix(c, cc, a);
  }
  gl_FragColor = vec4(quant(c), 0.95);
}`;
  const FS_WX = PREC + `
varying vec2 vP; uniform float uTime; uniform float uKind; uniform vec2 uRes; uniform vec3 uCol; uniform float uDens;
float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
void main(){
  vec2 px = (vP*0.5+0.5)*uRes;
  float a = 0.0;
  if (uKind < 1.5) { // дождь: тонкие косые штрихи
    vec2 q = vec2(px.x + px.y*0.25, px.y + uTime*220.0);
    vec2 cell = floor(q/vec2(3.0, 14.0)); float r = h2(cell);
    float yy = fract(q.y/14.0);
    a = step(1.0-uDens, r)*step(yy, 0.45)*0.25;
  } else { // снег и пепел: мягкие хлопья
    vec2 q = vec2(px.x + sin(uTime*0.8 + px.y*0.05)*6.0, px.y + uTime*28.0);
    vec2 cell = floor(q/5.0); float r = h2(cell);
    vec2 f = fract(q/5.0) - 0.5;
    a = step(1.0-uDens, r)*step(length(f), 0.28)*0.75;
  }
  if (a <= 0.0) discard;
  gl_FragColor = vec4(uCol, a);
}`;

  // ---------- постобработка: всё, что крутится в «Настройках 3D» ----------
  // кадр рисуется в текстуру, а потом проходит через этот шейдер: цвет, палитра, свечение,
  // контур, резкость, зерно, строки старого экрана, виньетка, изгиб кинескопа
  const FS_POST = PREC + `
varying vec2 vP;
uniform sampler2D uScene; uniform sampler2D uDepth; uniform float uHasD; uniform vec2 uRes; uniform float uTime; uniform vec2 uNF;
uniform vec4 uGrade; uniform vec3 uTintC; uniform float uTemp; uniform float uPal; uniform float uQL; uniform float uDith;
uniform vec2 uBloom; uniform float uOut; uniform float uSharp; uniform float uVig; uniform float uGrain; uniform float uScan; uniform float uCA; uniform float uCurve;
float bayer(vec2 p){ vec2 q = mod(floor(p), 4.0); float a = q.x + q.y*4.0;
  return (a==0.0?0.0:a==1.0?8.0:a==2.0?2.0:a==3.0?10.0:a==4.0?12.0:a==5.0?4.0:a==6.0?14.0:a==7.0?6.0:a==8.0?3.0:a==9.0?11.0:a==10.0?1.0:a==11.0?9.0:a==12.0?15.0:a==13.0?7.0:a==14.0?13.0:5.0)/16.0; }
float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
float lum(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
vec3 T(vec2 uv){ return texture2D(uScene, uv).rgb; }
float LD(vec2 uv){ float d = texture2D(uDepth, uv).r; float z = d*2.0 - 1.0; return 2.0*uNF.x*uNF.y/(uNF.y + uNF.x - z*(uNF.y - uNF.x)); }
vec3 pal4(float l, vec3 a, vec3 b, vec3 c, vec3 d){ return l < 0.25 ? a : l < 0.5 ? b : l < 0.75 ? c : d; }
void main(){
  vec2 uv = vP*0.5 + 0.5;
  vec2 px = 1.0/uRes;
  if (uCurve > 0.001) { vec2 c = uv*2.0 - 1.0; c *= 1.0 + uCurve*0.18*dot(c.yx, c.yx); uv = c*0.5 + 0.5; if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0,0.0,0.0,1.0); return; } }
  vec3 col;
  if (uCA > 0.001) { vec2 d = (uv - 0.5)*px*uCA*6.0; col = vec3(T(uv + d).r, T(uv).g, T(uv - d).b); }
  else col = T(uv);
  // резкость
  if (uSharp > 0.001) { vec3 nb = (T(uv + vec2(px.x,0.0)) + T(uv - vec2(px.x,0.0)) + T(uv + vec2(0.0,px.y)) + T(uv - vec2(0.0,px.y)))*0.25; col += (col - nb)*uSharp*1.5; }
  // контур: по глубине (если есть) и по яркости
  if (uOut > 0.001) {
    float l0 = lum(col);
    float e = max(max(abs(l0 - lum(T(uv + vec2(px.x,0.0)))), abs(l0 - lum(T(uv + vec2(0.0,px.y))))), max(abs(l0 - lum(T(uv - vec2(px.x,0.0)))), abs(l0 - lum(T(uv - vec2(0.0,px.y))))));
    float k = smoothstep(0.1, 0.32, e)*0.6;
    if (uHasD > 0.5) {
      float d0 = LD(uv);
      float dd = max(max(LD(uv + vec2(px.x,0.0)), LD(uv + vec2(0.0,px.y))), max(LD(uv - vec2(px.x,0.0)), LD(uv - vec2(0.0,px.y)))) - d0;
      k = max(k, smoothstep(0.06, 0.2, dd/max(d0, 0.5)));
    }
    col *= 1.0 - k*uOut*0.85;
  }
  // свечение ярких мест: огонь, окна, солнце в облаках
  if (uBloom.x > 0.001) {
    vec3 b = vec3(0.0);
    for (int i = 0; i < 12; i++) {
      float a = float(i)*0.5236; float r = i < 6 ? 1.6 : 3.4;
      vec3 sc = T(uv + vec2(cos(a), sin(a))*px*r*(1.0 + float(i/6)*0.8));
      b += max(sc - uBloom.y, 0.0)*(i < 6 ? 1.0 : 0.6);
    }
    col += b*(uBloom.x/7.0);
  }
  // яркость, контраст, насыщенность, гамма, тёплый или холодный свет, оттенок
  col *= uGrade.x;
  col = (col - 0.5)*uGrade.y + 0.5;
  float L = lum(col);
  col = mix(vec3(L), col, uGrade.z);
  col = pow(max(col, 0.0), vec3(1.0/uGrade.w));
  col *= vec3(1.0 + 0.14*uTemp, 1.0 + 0.02*uTemp, 1.0 - 0.16*uTemp)*uTintC;
  col = clamp(col, 0.0, 1.0);
  // палитры
  float bd = bayer(gl_FragCoord.xy) - 0.5;
  L = lum(col);
  if (uPal > 0.5 && uPal < 1.5) col = clamp(vec3(L*1.07 + 0.05, L*0.88 + 0.02, L*0.62), 0.0, 1.0);                  // сепия
  else if (uPal > 1.5 && uPal < 2.5) col = vec3(L);                                                                   // ч/б
  else if (uPal > 2.5 && uPal < 3.5) { float q = clamp(L + bd*0.25*uDith, 0.0, 0.999);                             // «карманная консоль»: 4 зелёных
    col = pal4(q, vec3(0.06,0.22,0.06), vec3(0.19,0.38,0.19), vec3(0.55,0.67,0.06), vec3(0.61,0.74,0.06)); }
  else if (uPal > 3.5 && uPal < 4.5) col = vec3(1.0, 0.68, 0.18)*floor((L + bd*0.12*uDith)*6.0 + 0.5)/6.0*1.1;      // янтарный монитор
  else if (uPal > 4.5 && uPal < 5.5) col = vec3(0.25, 1.0, 0.35)*(L*1.4 + (h2(gl_FragCoord.xy + uTime*60.0) - 0.5)*0.12); // ночное зрение
  else if (uPal > 5.5 && uPal < 6.5) col = floor(col*3.0 + 0.5 + bd*0.9*uDith)/3.0;                                // 16 цветов, как в старых играх
  else if (uPal > 6.5 && uPal < 7.5) col = (L*1.35 - 0.06 + bd*0.55*uDith > 0.42) ? vec3(0.9, 0.86, 0.76) : vec3(0.12, 0.1, 0.12); // гравюра: чернила по бумаге
  else if (uPal > 7.5 && uPal < 8.5) { vec3 o = mix(2.0*col*L, 1.0 - 2.0*(1.0 - col)*(1.0 - L), step(0.5, L)); col = mix(col, o, 0.6)*0.95; } // выжженные краски
  else if (uPal > 8.5 && uPal < 9.5) col = vec3(L*1.25, L*0.45, L*0.4) + vec3(0.04, 0.0, 0.02);                    // кровавая луна
  else if (uPal > 9.5 && uPal < 10.5) col = mix(vec3(0.16, 0.14, 0.3), vec3(1.0, 0.86, 0.6), L) + (col - L)*0.4;    // закатная
  // ступени цвета и точечное сглаживание
  if (uQL > 1.5 && (uPal < 2.5 || uPal > 7.5)) col = floor(col*uQL + 0.5 + bd*uDith)/uQL;
  // строки старого экрана, зерно, виньетка
  if (uScan > 0.001) col *= 1.0 - uScan*0.4*step(0.5, fract(gl_FragCoord.y*0.5));
  if (uGrain > 0.001) col += (h2(gl_FragCoord.xy + fract(uTime)*97.0) - 0.5)*uGrain*0.16;
  if (uVig > 0.001) { vec2 q = uv - 0.5; col *= 1.0 - uVig*smoothstep(0.3, 0.85, length(q*vec2(1.0, 0.9))*1.35); }
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  // ---------- отражения в воде: зеркало по первой «сухой» точке выше по экрану, с рябью ----------
  const FS_REFL = PREC + `
varying vec2 vP;
uniform sampler2D uScene; uniform vec2 uRes; uniform float uTime; uniform float uRefl; uniform float uFoam;
float hh(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
float isL(float a){ return (a > 0.85 && a < 0.925) || a > 0.975 ? 1.0 : 0.0; }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f); return mix(mix(hh(i), hh(i + vec2(1.0,0.0)), f.x), mix(hh(i + vec2(0.0,1.0)), hh(i + vec2(1.0,1.0)), f.x), f.y); }
void main(){
  vec2 uv = vP*0.5 + 0.5, px = 1.0/uRes;
  vec4 c = texture2D(uScene, uv);
  if (c.a > 0.75) { gl_FragColor = c; return; }
  vec3 col = c.rgb;
  if (uRefl > 0.01) {
    float y0 = -1.0;
    for (int i = 1; i < 72; i++) { vec2 q = uv + vec2(0.0, float(i)*px.y); if (q.y > 1.0) break; if (texture2D(uScene, q).a > 0.75) { y0 = q.y; break; } }
    if (y0 > 0.0) {
      float d = y0 - uv.y;
      vec2 r = vec2(uv.x + sin(uv.y*uRes.y*0.35 + uTime*2.2)*px.x*1.5, y0 + d + px.y);
      if (r.y <= 1.0) { vec4 rc = texture2D(uScene, r); if (rc.a > 0.75) col = mix(col, rc.rgb*vec3(0.72, 0.8, 0.95) + vec3(0.0, 0.01, 0.03), uRefl*(1.0 - smoothstep(0.0, 72.0*px.y, d)*0.55)); }
    }
  }
  if (uFoam > 0.01) {
    // пена у берега: как близко суша (земля или камень, не фигуры)
    float kd = 99.0;
    for (int k = 1; k <= 7; k++) {
      float fk = float(k);
      float a1 = texture2D(uScene, uv + vec2(fk*px.x, 0.0)).a, a2 = texture2D(uScene, uv - vec2(fk*px.x, 0.0)).a;
      float a3 = texture2D(uScene, uv + vec2(0.0, fk*px.y)).a, a4 = texture2D(uScene, uv - vec2(0.0, fk*px.y)).a;
      if (isL(a1) + isL(a2) + isL(a3) + isL(a4) > 0.5) { kd = fk; break; }
    }
    vec2 sp = uv*uRes;
    float n = vn(sp*vec2(0.09, 0.22) + vec2(uTime*0.4, uTime*0.9));
    float shore = (1.0 - smoothstep(1.0, 7.0, kd))*smoothstep(0.25, 0.6, n + 0.35*sin(kd*1.9 - uTime*2.6));
    // гребни волн в открытой воде — тонкие белые чёрточки
    float cr = smoothstep(0.8, 0.93, vn(sp*vec2(0.035, 0.16) + vec2(uTime*0.12, uTime*0.55)))*smoothstep(0.4, 0.8, vn(sp*0.02 + uTime*0.05));
    float f = clamp(shore + cr*0.55, 0.0, 1.0)*uFoam;
    col = mix(col, vec3(0.86, 0.9, 0.95), f);
  }
  gl_FragColor = vec4(col, 0.5);
}`;
  // ---------- ASCII: клетка → знак. Сначала на каждую клетку — её цвет и какой знак ей подходит ----------
  // знаки атласа: 0 « » 1 «.» 2 «,» 3 «:» 4 «;» 5 «-» 6 «=» 7 «+» 8 «o» 9 «a» 10 «d» 11 «Q» 12 «B» 13 «0» 14 «$» 15 «@»
  //               16 «/» 17 «\» 18 «|» 19 «_» 20 «~» 21 «'» 22 «#» 23 «*» 24 «%» 25 «&» 26 «q» 27 «8»
  P3.GLYPHS = ' .,:;-=+oadQB0$@/\\|_~\'#*%&q8HMWN';
  // классы по альфе сцены: вода 0.5, фигуры-«щиты» (деревья, люди, вещи) 0.8, стены и крыши 0.9, небо 0.95, земля 1.0
  const FS_CELL = PREC + `
varying vec2 vP;
uniform sampler2D uScene; uniform vec2 uCells; uniform vec2 uSS; uniform float uTime; uniform vec4 uGrade; uniform float uTemp; uniform float uSet;
float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
float lum(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
void main(){
  vec2 cell = floor(gl_FragCoord.xy);
  vec2 tex = 1.0/(uCells*uSS);
  vec3 s0 = vec3(0.0), s1 = vec3(0.0), s2 = vec3(0.0), s3 = vec3(0.0), s4 = vec3(0.0);
  float n0 = 0.0, n1 = 0.0, n2 = 0.0, n3 = 0.0, n4 = 0.0;
  vec2 g = vec2(0.0); float lmin = 9.0, lmax = 0.0;
  for (int j = 0; j < 5; j++) for (int i = 0; i < 3; i++) {
    vec4 c = texture2D(uScene, (cell*uSS + vec2(float(i), float(j)) + 0.5)*tex);
    float a = c.a;
    if (a < 0.7) { s0 += c.rgb; n0 += 1.0; }
    else if (a < 0.85) { s1 += c.rgb; n1 += 1.0; }
    else if (a < 0.925) { s2 += c.rgb; n2 += 1.0; }
    else if (a < 0.975) { s3 += c.rgb; n3 += 1.0; }
    else { s4 += c.rgb; n4 += 1.0; }
    float l = lum(c.rgb);
    g += vec2(float(i) - 1.0, float(j) - 2.0)*l; lmin = min(lmin, l); lmax = max(lmax, l);
  }
  // кто в клетке главный: фигуры и стены «весят» больше — так их очертания читаются
  float w0 = n0*1.1, w1 = n1*1.7, w2 = n2*1.3, w3 = n3*0.7, w4 = n4;
  float cls = 4.0; float wb = w4; vec3 avg = s4/max(n4, 1.0);
  if (w3 > wb) { cls = 3.0; wb = w3; avg = s3/n3; }
  if (w2 > wb) { cls = 2.0; wb = w2; avg = s2/n2; }
  if (w0 > wb) { cls = 0.0; wb = w0; avg = s0/n0; }
  if (w1 > wb) { cls = 1.0; wb = w1; avg = s1/n1; }
  // краски, как в настройках
  avg = max((avg*uGrade.x - 0.5)*uGrade.y + 0.5, 0.0);
  float L0 = lum(avg); avg = mix(vec3(L0), avg, uGrade.z); avg = pow(avg, vec3(1.0/uGrade.w));
  avg *= vec3(1.0 + 0.14*uTemp, 1.0 + 0.02*uTemp, 1.0 - 0.16*uTemp);
  float L = lum(avg);
  float hs = h2(cell + vec2(17.0, 3.0)), hs2 = h2(cell.yx + vec2(5.0, 41.0));
  float d = clamp(pow(L*1.55, 0.78) + (hs - 0.5)*0.08, 0.0, 0.999);
  float idx = 0.0; float white = 0.0;
  if (uSet > 1.5) {
    // простые знаки
    idx = d < 0.07 ? 0.0 : d < 0.16 ? 1.0 : d < 0.26 ? 3.0 : d < 0.36 ? 5.0 : d < 0.46 ? 6.0 : d < 0.56 ? 7.0 : d < 0.66 ? 23.0 : d < 0.78 ? 22.0 : d < 0.9 ? 24.0 : 15.0;
    if (cls < 0.5 && d >= 0.07) idx = d < 0.4 ? 5.0 : 6.0;
  } else if (cls < 0.5) {
    // вода: чёрточки; рябь бежит; отражения ярче — «=»
    float rp = h2(vec2(floor(cell.x/3.0 + uTime*1.7 + hs2*3.0), cell.y));
    idx = d < 0.05 ? (hs < 0.75 ? 0.0 : 1.0) : d > 0.42 ? (rp < 0.7 ? 6.0 : 5.0) : rp < 0.55 ? 5.0 : rp < 0.78 ? 19.0 : rp < 0.92 ? 6.0 : 20.0;
  } else if (cls < 1.5) {
    // деревья, люди, звери, вещи — плотные буквы
    idx = d < 0.05 ? 0.0 : d < 0.11 ? 1.0 : d < 0.18 ? 8.0 : d < 0.27 ? 9.0 : d < 0.36 ? (hs < 0.5 ? 10.0 : 26.0) : d < 0.46 ? 11.0 : d < 0.56 ? 12.0 : d < 0.66 ? (hs < 0.5 ? 13.0 : 27.0) : d < 0.77 ? (hs < 0.5 ? 25.0 : 24.0) : d < 0.88 ? 15.0 : 14.0;
  } else if (cls < 2.5) {
    // стены и крыши — тяжёлые буквы
    idx = d < 0.05 ? 0.0 : d < 0.12 ? 1.0 : d < 0.2 ? 3.0 : d < 0.3 ? 7.0 : d < 0.4 ? 22.0 : d < 0.5 ? 28.0 : d < 0.6 ? 31.0 : d < 0.72 ? 29.0 : d < 0.86 ? 30.0 : 15.0;
  } else if (cls < 3.5) {
    // небо — редкие точки
    idx = d < 0.35 ? 0.0 : d < 0.55 ? (hs < 0.6 ? 0.0 : 1.0) : d < 0.75 ? 1.0 : 3.0;
  } else {
    bool veg = avg.g > avg.r*1.04 && avg.g > avg.b*1.02;
    if (veg) {
      // трава — косые штрихи, кое-где белые точки
      float r = hs2;
      idx = d < 0.07 ? (r < 0.75 ? 0.0 : 2.0) : r < 0.3 ? 16.0 : r < 0.58 ? 17.0 : r < 0.8 ? 18.0 : r < 0.9 ? 21.0 : 2.0;
      if (hs > 0.965 && d > 0.12) { idx = 1.0; white = 0.75; }
    } else {
      // голая земля, дороги, полы — мелкие знаки
      idx = d < 0.06 ? 0.0 : d < 0.14 ? 1.0 : d < 0.24 ? (hs < 0.5 ? 2.0 : 3.0) : d < 0.36 ? (hs < 0.5 ? 4.0 : 5.0) : d < 0.5 ? (hs < 0.6 ? 3.0 : 6.0) : d < 0.66 ? (hs < 0.5 ? 6.0 : 21.0) : (hs < 0.5 ? 7.0 : 23.0);
    }
  }
  // контуры (набор «с контурами»): на резком переходе — штрих вдоль края
  if (uSet > 0.5 && uSet < 1.5 && cls > 0.5 && cls != 3.0) {
    float e = length(g)/(0.06 + L*1.5) + (lmax - lmin)*0.6;
    if (e > 1.6 && L > 0.04) {
      float a = atan(g.y, g.x);
      float k = mod(floor((a + 3.14159*1.125)/(3.14159/4.0)), 4.0);
      idx = k < 0.5 ? 18.0 : k < 1.5 ? 17.0 : k < 2.5 ? 5.0 : 16.0;
    }
  }
  // цвет знака: тон клетки, ярче и чище
  float m = max(max(avg.r, avg.g), avg.b);
  vec3 col = avg/max(m, 0.05)*clamp(m*1.9 + 0.08, 0.12, 1.0);
  col = mix(col, vec3(0.95, 0.96, 0.9), white);
  gl_FragColor = vec4(col, (idx + 0.5)/32.0);
}`;
  // ...а потом каждый пиксель берёт знак из атласа
  const FS_ASCII = PREC + `
varying vec2 vP;
uniform sampler2D uCell; uniform sampler2D uAtlas; uniform vec2 uCells; uniform vec2 uGlyph; uniform float uBg; uniform float uMono; uniform float uVig; uniform vec2 uRes; uniform float uScan; uniform float uGain;
float lum(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
void main(){
  vec2 cf = gl_FragCoord.xy/uGlyph, cell = floor(cf), lp = fract(cf);
  vec4 cd = texture2D(uCell, (cell + 0.5)/uCells);
  float idx = floor(cd.a*32.0);
  vec2 tile = vec2(mod(idx, 8.0), floor(idx/8.0));
  vec2 ap = (tile*uGlyph + vec2(floor(lp.x*uGlyph.x), floor((1.0 - lp.y)*uGlyph.y)) + 0.5)/(uGlyph*vec2(8.0, 4.0));
  float m = texture2D(uAtlas, ap).r;
  vec3 c = cd.rgb*uGain;
  if (uMono > 0.5) { float l = lum(c)*1.25; c = uMono < 1.5 ? vec3(0.25, 1.0, 0.4)*l : uMono < 2.5 ? vec3(1.0, 0.68, 0.2)*l : uMono < 3.5 ? vec3(l) : vec3(0.55, 0.85, 1.0)*l; }
  vec3 bg = cd.rgb*uBg + vec3(0.008, 0.01, 0.018);
  vec3 col = mix(bg, c, m);
  if (uScan > 0.001) col *= 1.0 - uScan*0.35*step(0.5, fract(gl_FragCoord.y*0.5));
  if (uVig > 0.001) { vec2 q = gl_FragCoord.xy/uRes - 0.5; col *= 1.0 - uVig*smoothstep(0.3, 0.85, length(q*vec2(1.0, 0.9))*1.35); }
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  function compile(vs, fs) {
    vs = vs.replace(/__NL__/g, String(P3.NL)); fs = fs.replace(/__NL__/g, String(P3.NL));
    const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.slice(0, 300)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const loc = { p, a: {}, u: {} };
    const na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < na; i++) { const a = gl.getActiveAttrib(p, i); loc.a[a.name] = gl.getAttribLocation(p, a.name); }
    const nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < nu; i++) { const u = gl.getActiveUniform(p, i); const n = u.name.replace(/\[0\]$/, ''); loc.u[n] = gl.getUniformLocation(p, u.name); }
    return loc;
  }
  const SHN = 2048; // карта теней
  function init() {
    if (cv) return ok;
    cv = document.createElement('canvas');
    cv.width = 320; cv.height = 200;
    try {
      gl = cv.getContext('webgl', { antialias: false, alpha: false, depth: true, preserveDrawingBuffer: true, premultipliedAlpha: false }) || cv.getContext('experimental-webgl');
    } catch (e) { gl = null; }
    if (!gl) return (ok = false);
    // сколько огней разом: столько, сколько выдержит видеокарта
    const mfu = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) || 64;
    P3.NL = mfu >= 200 ? 32 : mfu >= 128 ? 24 : mfu >= 96 ? 16 : 8;
    try {
      S.world = compile(VS_WORLD, FS_WORLD);
      S.bb = compile(VS_BB, FS_BB);
      S.sky = compile(VS_SKY, FS_SKY);
      S.wx = compile(VS_SKY, FS_WX);
      S.shW = compile(VS_SH_WORLD, FS_SH);
      S.shB = compile(VS_SH_BB, FS_SH_BB);
    } catch (e) { console.warn('px3d shaders', e); gl = null; return (ok = false); }
    try { S.post = compile(VS_SKY, FS_POST); } catch (e) { console.warn('px3d post', e); S.post = null; }
    try { S.refl = compile(VS_SKY, FS_REFL); S.cell = compile(VS_SKY, FS_CELL); S.ascii = compile(VS_SKY, FS_ASCII); } catch (e) { console.warn('px3d ascii', e); S.refl = S.cell = S.ascii = null; }
    S.depthExt = gl.getExtension('WEBGL_depth_texture');
    S.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, S.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    S.dynBuf = gl.createBuffer();
    // карта теней: глубина упакована в цвет (работает везде, где есть WebGL)
    try {
      S.shTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, S.shTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SHN, SHN, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      S.shDepth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, S.shDepth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, SHN, SHN);
      S.shFB = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, S.shFB);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, S.shTex, 0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, S.shDepth);
      S.shOk = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    } catch (e) { S.shOk = false; }
    initAtlas(); initSprAtlas();
    ok = true;
    return ok;
  }
  // кадр — в текстуру (для постобработки); глубина — в текстуру, если видеокарта умеет
  function sceneFB(w, h) {
    const sc = S.sc || (S.sc = {});
    if (sc.w === w && sc.h === h && sc.fb) return sc.ok;
    sc.w = w; sc.h = h;
    try {
      if (!sc.tex) sc.tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, sc.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      if (!sc.fb) sc.fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, sc.fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sc.tex, 0);
      sc.hasD = false;
      if (S.depthExt) {
        if (!sc.dtex) sc.dtex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, sc.dtex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
        for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, sc.dtex, 0);
        sc.hasD = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      }
      if (!sc.hasD) {
        if (!sc.rb) sc.rb = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, sc.rb);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, sc.rb);
      }
      sc.ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    } catch (e) { sc.ok = false; }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return sc.ok;
  }
  // простая цель для прохода: текстура нужного размера
  function colorFB(o, w, h) {
    if (o.w === w && o.h === h && o.fb) return o.ok;
    o.w = w; o.h = h;
    try {
      if (!o.tex) o.tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, o.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      if (!o.fb) o.fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, o.fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, o.tex, 0);
      o.ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    } catch (e) { o.ok = false; }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return o.ok;
  }
  // атлас знаков ровно того размера, каким их рисуем (чётко, без размытия)
  P3.font = '"JetBrains Mono", "DejaVu Sans Mono", Consolas, monospace';
  function glyphAtlas(gw, gh) {
    const key = gw + 'x' + gh + P3.font;
    if (S.atlasKey === key) return S.atlasTex;
    const c2 = document.createElement('canvas'); c2.width = gw * 8; c2.height = gh * 4;
    const x2 = c2.getContext('2d');
    x2.fillStyle = '#000'; x2.fillRect(0, 0, c2.width, c2.height);
    x2.fillStyle = '#fff'; x2.textAlign = 'center'; x2.textBaseline = 'middle';
    const fs = Math.max(6, Math.round(Math.min(gh * 0.86, gw * 1.6)));
    x2.font = '600 ' + fs + 'px ' + P3.font;
    const G2 = P3.GLYPHS;
    for (let i = 0; i < G2.length && i < 32; i++) x2.fillText(G2[i], (i % 8) * gw + gw / 2, Math.floor(i / 8) * gh + gh / 2 + 1);
    if (!S.atlasTex) S.atlasTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, S.atlasTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c2);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    S.atlasKey = key;
    return S.atlasTex;
  }
  // настройки картинки (их правит окно «Настройки 3D»)
  const FX0 = { ql: 22, dith: 0.95, bri: 1, con: 1, sat: 1, gam: 1, temp: 0, tint: [1, 1, 1], pal: 0, bloom: 0.35, bth: 0.72, out: 0, sharp: 0, vig: 0.55, grain: 0, scan: 0, ca: 0, curve: 0, refl: 0.6, foam: 1, abg: 0.1, amono: 0, aset: 0, again: 1.15 };
  P3.fx = Object.assign({}, FX0);
  P3.FX0 = FX0;
  P3.postOn = () => !!(S.post && S.sc && S.sc.ok);
  P3.supported = () => init();
  P3.canvas = () => cv;
  P3.shadows = true;

  // ============================================================
  // Текстуры: пиксель-арт 32×32 в атласе 1024×1024
  // ============================================================
  const TS = 32, AW = 1024, PER = AW / TS;
  let atlas = null, actx = null, atex = null, aIndex = new Map(), aNext = 0, aDirty = false;
  function initAtlas() {
    atlas = document.createElement('canvas'); atlas.width = AW; atlas.height = AW;
    actx = atlas.getContext('2d');
    atex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, atex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, AW, AW, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  // имя текстуры → смещение в атласе (u, v)
  P3.tex = function (name) {
    let k = aIndex.get(name);
    if (k == null) {
      if (aNext >= PER * PER) return [0, 0];
      k = aNext++;
      const img = actx.createImageData(TS, TS);
      (P3.TEX[name.split(':')[0]] || P3.TEX.noise)(img.data, name, mkRand(name));
      actx.putImageData(img, (k % PER) * TS, Math.floor(k / PER) * TS);
      aIndex.set(name, k);
      aDirty = true;
    }
    return [(k % PER) * TS / AW, Math.floor(k / PER) * TS / AW];
  };
  P3.TS = TS / AW;
  function mkRand(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; }
  P3.mkRand = mkRand;

  // ============================================================
  // Атлас спрайтов (растёт по мере надобности; переполнился — начинается заново, P3.sprGen++)
  // ============================================================
  let SW = 2048;
  let spr = null, sctx = null, stex = null, sIndex = new Map(), shelf = { x: 0, y: 0, h: 0 }, sDirty = [];
  P3.sprGen = 0;
  function initSprAtlas() {
    SW = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048);
    spr = document.createElement('canvas'); spr.width = SW; spr.height = SW;
    sctx = spr.getContext('2d');
    stex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, stex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SW, SW, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  // положить картинку спрайта в атлас; вернуть её прямоугольник
  P3.sprite = function (sp) {
    let r = sIndex.get(sp.key);
    if (r) return r;
    if (shelf.x + sp.w + 1 > SW) { shelf.x = 0; shelf.y += shelf.h + 1; shelf.h = 0; }
    if (shelf.y + sp.h + 1 > SW) { // атлас полон — начать заново
      sIndex.clear(); shelf = { x: 0, y: 0, h: 0 }; sctx.clearRect(0, 0, SW, SW); sDirty = [[0, 0, SW, SW]];
      P3.sprGen++;
      if (Gfx.PX) Gfx.PX.clear();
    }
    sctx.drawImage(sp.cv, shelf.x, shelf.y);
    r = { u0: shelf.x / SW, v0: shelf.y / SW, u1: (shelf.x + sp.w) / SW, v1: (shelf.y + sp.h) / SW, w: sp.w, h: sp.h, ax: sp.ax, ay: sp.ay, ppu: sp.ppu, gen: P3.sprGen };
    sDirty.push([shelf.x, shelf.y, sp.w, sp.h, sp.cv]);
    shelf.x += sp.w + 1; shelf.h = Math.max(shelf.h, sp.h);
    sIndex.set(sp.key, r);
    return r;
  };
  P3.hasSprite = (key) => sIndex.has(key);

  // ============================================================
  // Сетки
  // ============================================================
  // вершина мира: pos(3) loc(2) tile(2) n(3) sky(1) kind(1) tint(3) = 15 float
  const WV = 15;
  P3.mesh = function () { return { a: [], n: 0 }; };
  const WHITE = [1, 1, 1];
  P3.vtx = function (M, p, l, t, n, sky, kind, tint) { const c = tint || WHITE; M.a.push(p[0], p[1], p[2], l[0], l[1], t[0], t[1], n[0], n[1], n[2], sky, kind || 0, c[0], c[1], c[2]); };
  // прямоугольник по четырём углам; tint — цвет-множитель (один или по углу)
  P3.quad = function (M, p0, p1, p2, p3, l0, l1, tile, n, sky, kind, tint) {
    const t = P3.tex(tile);
    const tc = (i) => (tint && Array.isArray(tint[0]) ? tint[i] : tint);
    const L00 = [l0[0], l0[1]], L10 = [l1[0], l0[1]], L11 = [l1[0], l1[1]], L01 = [l0[0], l1[1]];
    P3.vtx(M, p0, L00, t, n, sky, kind, tc(0)); P3.vtx(M, p1, L10, t, n, sky, kind, tc(1)); P3.vtx(M, p2, L11, t, n, sky, kind, tc(2));
    P3.vtx(M, p0, L00, t, n, sky, kind, tc(0)); P3.vtx(M, p2, L11, t, n, sky, kind, tc(2)); P3.vtx(M, p3, L01, t, n, sky, kind, tc(3));
    M.n += 6;
  };
  // то же, но нормаль у каждой вершины своя (холмы)
  P3.quadN = function (M, p, l, tile, ns, sky, kind, tint) {
    const t = P3.tex(tile);
    const tc = (i) => (tint && Array.isArray(tint[0]) ? tint[i] : tint);
    for (const i of [0, 1, 2, 0, 2, 3]) P3.vtx(M, p[i], l[i], t, ns[i], sky, kind, tc(i));
    M.n += 6;
  };
  P3.tri = function (M, p0, p1, p2, l0, l1, l2, tile, n, sky, kind, tint) {
    const t = P3.tex(tile);
    P3.vtx(M, p0, l0, t, n, sky, kind, tint); P3.vtx(M, p1, l1, t, n, sky, kind, tint); P3.vtx(M, p2, l2, t, n, sky, kind, tint);
    M.n += 3;
  };
  // залить сетку в видеопамять
  P3.upload = function (M) {
    if (!init() || !M.n) return null;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(M.a), gl.STATIC_DRAW);
    return { buf, n: M.n };
  };
  P3.free = function (h) { if (h && h.buf && gl) gl.deleteBuffer(h.buf); };
  // щиты (спрайты, повёрнутые к камере): center(3) off(2) uv(2) sky(1)
  const BV = 8;
  P3.bmesh = function () { return { a: [], n: 0 }; };
  P3.bb = function (B, r, x, y, z, scale, sky) {
    const k = scale / r.ppu;
    const x0 = -r.ax * k, x1 = (r.w - r.ax) * k, y0 = (r.ay - r.h) * k, y1 = r.ay * k;
    const a = B.a;
    const put = (ox, oy, u, v) => { a.push(x, y, z, ox, oy, u, v, sky); };
    put(x0, y0, r.u0, r.v1); put(x1, y0, r.u1, r.v1); put(x1, y1, r.u1, r.v0);
    put(x0, y0, r.u0, r.v1); put(x1, y1, r.u1, r.v0); put(x0, y1, r.u0, r.v0);
    B.n += 6;
  };

  // ============================================================
  // Кадр
  // ============================================================
  // f: { w, h, time, cam: {x,y,z,yaw,pitch,fov} — всё в координатах кадра (рядом с нулём),
  //      sky: {…}, lights: […], meshes: [{h, off}], far: {h, off} | null, bills: [{h, off}],
  //      dyn: bmesh (спрайты этого кадра), near: [x0,z0,x1,z1], wx, shadow: {center:[x,y,z], size} | null }
  const mat = new Float32Array(16), smat = new Float32Array(16), lmat = new Float32Array(16);
  const ID = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  function mul4(out, A, B) { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += A[k * 4 + j] * B[i * 4 + k]; out[i * 4 + j] = s; } }
  function bindWorld(L, h, off) {
    gl.bindBuffer(gl.ARRAY_BUFFER, h.buf);
    const st = WV * 4;
    const at = (n, size, o) => { const l = L.a[n]; if (l == null || l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, st, o * 4); };
    at('aPos', 3, 0); at('aLoc', 2, 3); at('aTile', 2, 5); at('aN', 3, 7); at('aSky', 1, 10); at('aKind', 1, 11); at('aTint', 3, 12);
    if (L.u.uOff) gl.uniform3f(L.u.uOff, off[0], off[1], off[2]);
  }
  function unbind(L) { for (const n in L.a) if (L.a[n] >= 0) gl.disableVertexAttribArray(L.a[n]); }
  function bindBB(L, buf, off) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const st = BV * 4;
    const at = (n, size, o) => { const l = L.a[n]; if (l == null || l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, st, o * 4); };
    at('aC', 3, 0); at('aO', 2, 3); at('aUV', 2, 5); at('aSky', 1, 7);
    if (L.u.uOff) gl.uniform3f(L.u.uOff, off[0], off[1], off[2]);
  }
  function uploadAtlases() {
    if (aDirty) { gl.bindTexture(gl.TEXTURE_2D, atex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas); aDirty = false; }
    if (sDirty.length) {
      gl.bindTexture(gl.TEXTURE_2D, stex);
      for (const [x, y, w, , src] of sDirty) { if (w === SW) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, spr); break; } gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, gl.RGBA, gl.UNSIGNED_BYTE, src); }
      sDirty = [];
    }
  }
  // матрица «вид от солнца»: ортогональная коробка вокруг камеры, привязанная к текселям (тени не дрожат)
  function lightMatrix(sh, dir) {
    let lz = [-dir[0], -dir[1], -dir[2]];
    const up = Math.abs(lz[1]) > 0.95 ? [0, 0, 1] : [0, 1, 0];
    let lx = [up[1] * lz[2] - up[2] * lz[1], up[2] * lz[0] - up[0] * lz[2], up[0] * lz[1] - up[1] * lz[0]];
    let l = Math.hypot(...lx); lx = lx.map((v) => v / l);
    const ly = [lz[1] * lx[2] - lz[2] * lx[1], lz[2] * lx[0] - lz[0] * lx[2], lz[0] * lx[1] - lz[1] * lx[0]];
    const S2 = sh.size, depth = 160;
    const c = sh.center;
    const tex = (2 * S2) / SHN;
    let cx = c[0] * lx[0] + c[1] * lx[1] + c[2] * lx[2], cy = c[0] * ly[0] + c[1] * ly[1] + c[2] * ly[2];
    const cz = c[0] * lz[0] + c[1] * lz[1] + c[2] * lz[2];
    cx = Math.round(cx / tex) * tex; cy = Math.round(cy / tex) * tex;
    // вид: строки lx, ly, -lz (смотрим вдоль lz)
    const V = [lx[0], ly[0], -lz[0], 0, lx[1], ly[1], -lz[1], 0, lx[2], ly[2], -lz[2], 0, -cx, -cy, cz - depth / 2, 1];
    const Pm = [1 / S2, 0, 0, 0, 0, 1 / S2, 0, 0, 0, 0, -2 / depth, 0, 0, 0, -1, 1];
    mul4(lmat, Pm, V);
    return { right: lx };
  }
  P3.render = function (f) {
    if (!init()) return null;
    if (cv.width !== f.w || cv.height !== f.h) { cv.width = f.w; cv.height = f.h; }
    const A = f.ascii && S.cell && S.ascii ? f.ascii : null;
    const SW = A ? A.cols * A.ssx : f.w, SH = A ? A.rows * A.ssy : f.h;
    uploadAtlases();
    const c = f.cam, sk = f.sky;
    const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch || 0), sp = Math.sin(c.pitch || 0);
    const F = [sy * cp, sp, -cy * cp], R = [cy, 0, sy], U = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
    const tanH = Math.tan((c.fov || 1.05) / 2), asp = f.w / f.h, near = 0.06, far = f.farClip || 1400;
    const ex = c.x, ey = c.y, ez = c.z;
    const V = [R[0], U[0], -F[0], 0, R[1], U[1], -F[1], 0, R[2], U[2], -F[2], 0,
      -(R[0] * ex + R[1] * ey + R[2] * ez), -(U[0] * ex + U[1] * ey + U[2] * ez), (F[0] * ex + F[1] * ey + F[2] * ez), 1];
    const Pm = [1 / (tanH * asp), 0, 0, 0, 0, 1 / tanH, 0, 0, 0, 0, -(far + near) / (far - near), -1, 0, 0, -2 * far * near / (far - near), 0];
    mul4(mat, Pm, V);
    P3.last = { mat: Float32Array.from(mat), w: f.w, h: f.h, cam: c, F, R, U, tanH, asp };
    const meshes = f.meshes || [], bills = f.bills || [];
    // ---------- тени от солнца ----------
    let shOn = 0, lightR = [1, 0, 0];
    const shadowDir = sk.sunDir;
    if (f.shadow && P3.shadows && S.shOk && shadowDir[1] > 0.06 && (sk.sun[0] + sk.sun[1] + sk.sun[2]) > 0.05) {
      const lm = lightMatrix(f.shadow, shadowDir);
      lightR = lm.right;
      smat.set(lmat);
      gl.bindFramebuffer(gl.FRAMEBUFFER, S.shFB);
      gl.viewport(0, 0, SHN, SHN);
      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      let L = S.shW; gl.useProgram(L.p);
      gl.uniformMatrix4fv(L.u.uLVP, false, smat);
      for (const m of meshes) {
        if (!m.h || m.noShadow) continue;
        gl.bindBuffer(gl.ARRAY_BUFFER, m.h.buf);
        gl.enableVertexAttribArray(L.a.aPos); gl.vertexAttribPointer(L.a.aPos, 3, gl.FLOAT, false, WV * 4, 0);
        gl.enableVertexAttribArray(L.a.aKind); gl.vertexAttribPointer(L.a.aKind, 1, gl.FLOAT, false, WV * 4, 11 * 4);
        gl.uniform3f(L.u.uOff, m.off[0], m.off[1], m.off[2]);
        gl.drawArrays(gl.TRIANGLES, 0, m.h.n);
      }
      unbind(L);
      L = S.shB; gl.useProgram(L.p);
      gl.uniformMatrix4fv(L.u.uLVP, false, smat);
      gl.uniform3f(L.u.uLRight, lightR[0], lightR[1], lightR[2]);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, stex); gl.uniform1i(L.u.uSpr, 0);
      const shB = (buf, n, off) => { bindBB(L, buf, off); gl.drawArrays(gl.TRIANGLES, 0, n); };
      for (const b of bills) if (b.h && !b.noShadow) shB(b.h.buf, b.h.n, b.off);
      if (f.dyn && f.dyn.n) { gl.bindBuffer(gl.ARRAY_BUFFER, S.dynBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(f.dyn.a), gl.DYNAMIC_DRAW); shB(S.dynBuf, f.dyn.n, [0, 0, 0]); f.dyn.up = true; }
      unbind(L);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      shOn = 1;
    } else smat.set(ID);
    // ---------- куда рисуем: в текстуру для постобработки или прямо на холст ----------
    const FX = P3.fx;
    const post = !!S.post && sceneFB(SW, SH);
    const sQL = post || A ? 0 : FX.ql, sDith = FX.dith;
    gl.bindFramebuffer(gl.FRAMEBUFFER, post ? S.sc.fb : null);
    // ---------- небо ----------
    gl.viewport(0, 0, post ? SW : f.w, post ? SH : f.h);
    gl.clearColor(sk.fog[0], sk.fog[1], sk.fog[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    let L = S.sky; gl.useProgram(L.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, S.quad);
    gl.enableVertexAttribArray(L.a.aP); gl.vertexAttribPointer(L.a.aP, 2, gl.FLOAT, false, 0, 0);
    gl.uniform3fv(L.u.uF, F); gl.uniform3fv(L.u.uR, R); gl.uniform3fv(L.u.uU, U); gl.uniform1f(L.u.uTan, tanH); gl.uniform1f(L.u.uAsp, asp);
    gl.uniform3fv(L.u.uZen, sk.zen); gl.uniform3fv(L.u.uHor, sk.hor); gl.uniform3fv(L.u.uSunDir, sk.sunSky || sk.sunDir); gl.uniform3fv(L.u.uSunC, sk.sunDisc); gl.uniform3fv(L.u.uMoonDir, sk.moonDir);
    gl.uniform3fv(L.u.uGlow, sk.glow || [0, 0, 0]);
    gl.uniform1f(L.u.uStars, sk.stars); gl.uniform1f(L.u.uTime, f.time); gl.uniform1f(L.u.uCloud, sk.cloud); gl.uniform3fv(L.u.uCloudLit, sk.cloudLit || sk.cloudC); gl.uniform3fv(L.u.uCloudSh, sk.cloudSh || sk.cloudC);
    gl.uniform1f(L.u.uIn, sk.indoor ? 1 : 0); gl.uniform1f(L.u.uSeed, sk.seed || 0);
    gl.uniform1f(L.u.uQL, sQL); gl.uniform1f(L.u.uDith, sDith);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(L.a.aP);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    // общий свет
    const NL = P3.NL || 8;
    const lp = new Float32Array(NL * 4), lc = new Float32Array(NL * 4);
    const ls = f.lights.slice(0, NL);
    ls.forEach((l, i) => { lp.set([l.x, l.y, l.z, l.r], i * 4); lc.set([l.col[0], l.col[1], l.col[2], l.i], i * 4); });
    const setLight = (L) => {
      gl.uniformMatrix4fv(L.u.uVP, false, mat);
      if (L.u.uSM) gl.uniformMatrix4fv(L.u.uSM, false, smat);
      gl.uniform3fv(L.u.uSunDir, sk.sunDir); if (L.u.uSunSky) gl.uniform3fv(L.u.uSunSky, sk.sunSky || sk.sunDir);
      gl.uniform3fv(L.u.uSun, sk.sun); gl.uniform3fv(L.u.uAmb, sk.amb); gl.uniform3fv(L.u.uFog, sk.fog); if (L.u.uFogSun) gl.uniform3fv(L.u.uFogSun, sk.fogSun || sk.fog);
      if (L.u.uZen) gl.uniform3fv(L.u.uZen, sk.zen); if (L.u.uHor) gl.uniform3fv(L.u.uHor, sk.hor);
      gl.uniform3f(L.u.uCam, ex, ey, ez); gl.uniform1f(L.u.uFogD, sk.fogD); if (L.u.uTime) gl.uniform1f(L.u.uTime, f.time); if (L.u.uNight) gl.uniform1f(L.u.uNight, sk.night);
      if (L.u.uCut) { const c = f.cut; gl.uniform4f(L.u.uCut, c ? c[0] : 0, c ? c[1] : -999, c ? c[2] : 0, c ? c[3] : 0); }
      if (L.u.uLP) gl.uniform4fv(L.u.uLP, lp);
      if (L.u.uLC) gl.uniform4fv(L.u.uLC, lc);
      gl.uniform1i(L.u.uNL, ls.length);
      if (L.u.uQL) gl.uniform1f(L.u.uQL, sQL); if (L.u.uDith) gl.uniform1f(L.u.uDith, sDith);
      if (L.u.uShadow) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, S.shTex); gl.uniform1i(L.u.uShadow, 1); gl.activeTexture(gl.TEXTURE0); }
      if (L.u.uShOn) gl.uniform1f(L.u.uShOn, shOn * (f.shadow ? (f.shadow.k == null ? 1 : f.shadow.k) : 0));
      if (L.u.uShTex) gl.uniform1f(L.u.uShTex, SHN);
    };
    // ---------- земля, стены, крыши; дальняя земля ----------
    L = S.world; gl.useProgram(L.p); setLight(L);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atex); gl.uniform1i(L.u.uTex, 0); gl.uniform1f(L.u.uTS, P3.TS);
    const ft = P3.tex('farnoise'); gl.uniform2f(L.u.uFarTile, ft[0], ft[1]);
    const nr = f.near || [1e9, 1e9, -1e9, -1e9];
    gl.uniform4f(L.u.uNear, nr[0], nr[1], nr[2], nr[3]);
    const hd = f.hide || [1e9, 1e9, -1e9, -1e9];
    gl.uniform4f(L.u.uHide, hd[0], hd[1], hd[2], hd[3]);
    if (L.u.uThird) gl.uniform1f(L.u.uThird, f.third ? 1 : 0);
    if (L.u.uWT) gl.uniform1f(L.u.uWT, f.time % 1000);
    for (const m of meshes) { if (!m.h) continue; bindWorld(L, m.h, m.off); gl.drawArrays(gl.TRIANGLES, 0, m.h.n); }
    if (f.far && f.far.h) { bindWorld(L, f.far.h, f.far.off); gl.drawArrays(gl.TRIANGLES, 0, f.far.h.n); }
    unbind(L);
    // ---------- деревья, вещи, люди, звери ----------
    L = S.bb; gl.useProgram(L.p); setLight(L);
    gl.uniform3f(L.u.uRight, R[0], 0, R[2]);
    gl.uniform3fv(L.u.uTintAll, f.sprTint || [1, 1, 1]);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, stex); gl.uniform1i(L.u.uSpr, 0);
    for (const b of bills) { if (!b.h) continue; bindBB(L, b.h.buf, b.off); gl.drawArrays(gl.TRIANGLES, 0, b.h.n); }
    if (f.dyn && f.dyn.n) {
      gl.bindBuffer(gl.ARRAY_BUFFER, S.dynBuf);
      if (!f.dyn.up) gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(f.dyn.a), gl.DYNAMIC_DRAW);
      bindBB(L, S.dynBuf, [0, 0, 0]);
      gl.drawArrays(gl.TRIANGLES, 0, f.dyn.n);
    }
    unbind(L);
    // ---------- погода — тихая, поверх всего ----------
    if (f.wx) {
      gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
      L = S.wx; gl.useProgram(L.p);
      gl.bindBuffer(gl.ARRAY_BUFFER, S.quad);
      gl.enableVertexAttribArray(L.a.aP); gl.vertexAttribPointer(L.a.aP, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(L.u.uTime, f.time); gl.uniform1f(L.u.uKind, f.wx.kind); gl.uniform2f(L.u.uRes, post ? SW : f.w, post ? SH : f.h); gl.uniform3fv(L.u.uCol, f.wx.col); gl.uniform1f(L.u.uDens, f.wx.dens);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(L.a.aP);
      gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST);
    }
    // ---------- отражения в воде ----------
    let srcTex = post ? S.sc.tex : null;
    const fullQuad = (L2) => { gl.bindBuffer(gl.ARRAY_BUFFER, S.quad); gl.enableVertexAttribArray(L2.a.aP); gl.vertexAttribPointer(L2.a.aP, 2, gl.FLOAT, false, 0, 0); };
    if (post && S.refl && (FX.refl > 0.01 || FX.foam > 0.01) && colorFB(S.rf || (S.rf = {}), SW, SH)) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, S.rf.fb); gl.viewport(0, 0, SW, SH); gl.disable(gl.DEPTH_TEST);
      L = S.refl; gl.useProgram(L.p); fullQuad(L);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S.sc.tex); gl.uniform1i(L.u.uScene, 0);
      gl.uniform2f(L.u.uRes, SW, SH); gl.uniform1f(L.u.uTime, f.time); gl.uniform1f(L.u.uRefl, FX.refl); gl.uniform1f(L.u.uFoam, FX.foam == null ? 1 : FX.foam);
      gl.drawArrays(gl.TRIANGLES, 0, 3); gl.disableVertexAttribArray(L.a.aP);
      srcTex = S.rf.tex;
    }
    // ---------- ASCII: клетки → знаки ----------
    if (post && A && colorFB(S.cf || (S.cf = {}), A.cols, A.rows)) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, S.cf.fb); gl.viewport(0, 0, A.cols, A.rows); gl.disable(gl.DEPTH_TEST);
      L = S.cell; gl.useProgram(L.p); fullQuad(L);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, srcTex); gl.uniform1i(L.u.uScene, 0);
      gl.uniform2f(L.u.uCells, A.cols, A.rows); gl.uniform2f(L.u.uSS, A.ssx, A.ssy); gl.uniform1f(L.u.uTime, f.time);
      gl.uniform4f(L.u.uGrade, FX.bri, FX.con, FX.sat, FX.gam); gl.uniform1f(L.u.uTemp, FX.temp); if (L.u.uSet) gl.uniform1f(L.u.uSet, FX.aset || 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3); gl.disableVertexAttribArray(L.a.aP);
      const at = glyphAtlas(A.gw, A.gh);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, f.w, f.h);
      L = S.ascii; gl.useProgram(L.p); fullQuad(L);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S.cf.tex); gl.uniform1i(L.u.uCell, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, at); gl.uniform1i(L.u.uAtlas, 1); gl.activeTexture(gl.TEXTURE0);
      gl.uniform2f(L.u.uCells, A.cols, A.rows); gl.uniform2f(L.u.uGlyph, A.gw, A.gh); gl.uniform2f(L.u.uRes, f.w, f.h);
      gl.uniform1f(L.u.uBg, FX.abg); gl.uniform1f(L.u.uMono, FX.amono || 0); gl.uniform1f(L.u.uVig, FX.vig); gl.uniform1f(L.u.uScan, FX.scan); gl.uniform1f(L.u.uGain, FX.again || 1.15);
      gl.drawArrays(gl.TRIANGLES, 0, 3); gl.disableVertexAttribArray(L.a.aP);
      gl.enable(gl.DEPTH_TEST);
      return cv;
    }
    // ---------- постобработка ----------
    if (post) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, f.w, f.h);
      gl.disable(gl.DEPTH_TEST);
      L = S.post; gl.useProgram(L.p);
      gl.bindBuffer(gl.ARRAY_BUFFER, S.quad);
      gl.enableVertexAttribArray(L.a.aP); gl.vertexAttribPointer(L.a.aP, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, srcTex); gl.uniform1i(L.u.uScene, 0);
      if (L.u.uDepth) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, S.sc.hasD ? S.sc.dtex : S.sc.tex); gl.uniform1i(L.u.uDepth, 1); gl.activeTexture(gl.TEXTURE0); }
      const u = L.u, fv = (n, v) => { if (u[n]) gl.uniform1f(u[n], v); };
      fv('uHasD', S.sc.hasD ? 1 : 0); if (u.uRes) gl.uniform2f(u.uRes, f.w, f.h); fv('uTime', f.time); if (u.uNF) gl.uniform2f(u.uNF, near, far);
      if (u.uGrade) gl.uniform4f(u.uGrade, FX.bri, FX.con, FX.sat, FX.gam);
      if (u.uTintC) gl.uniform3fv(u.uTintC, FX.tint || [1, 1, 1]);
      fv('uTemp', FX.temp); fv('uPal', FX.pal); fv('uQL', FX.ql); fv('uDith', FX.dith);
      if (u.uBloom) gl.uniform2f(u.uBloom, FX.bloom, FX.bth);
      fv('uOut', FX.out); fv('uSharp', FX.sharp); fv('uVig', FX.vig); fv('uGrain', FX.grain); fv('uScan', FX.scan); fv('uCA', FX.ca); fv('uCurve', FX.curve);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(L.a.aP);
      gl.enable(gl.DEPTH_TEST);
    }
    return cv;
  };
  // точка (в координатах кадра) → пиксель кадра
  P3.project = function (x, y, z) {
    const l = P3.last;
    if (!l) return null;
    const m = l.mat;
    const X = m[0] * x + m[4] * y + m[8] * z + m[12], Y = m[1] * x + m[5] * y + m[9] * z + m[13], W = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (W <= 0.05) return null;
    return [(X / W * 0.5 + 0.5) * l.w, (1 - (Y / W * 0.5 + 0.5)) * l.h, W];
  };
  // пиксель кадра → луч (в координатах кадра)
  P3.ray = function (px, py) {
    const l = P3.last;
    if (!l) return null;
    const nx = (px / l.w) * 2 - 1, ny = 1 - (py / l.h) * 2;
    const d = [l.F[0] + l.R[0] * nx * l.tanH * l.asp + l.U[0] * ny * l.tanH, l.F[1] + l.R[1] * nx * l.tanH * l.asp + l.U[1] * ny * l.tanH, l.F[2] + l.R[2] * nx * l.tanH * l.asp + l.U[2] * ny * l.tanH];
    return { o: [l.cam.x, l.cam.y, l.cam.z], d };
  };
})(window.EOF);
