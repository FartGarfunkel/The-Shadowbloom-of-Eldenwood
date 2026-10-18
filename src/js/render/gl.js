// ---------------------------------------------------------------------------
// render/gl.js — thin WebGL2 helpers and every shader in the game.
// ---------------------------------------------------------------------------

function compileProgram(gl, vsSrc, fsSrc, name) {
  const mk = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(name + ' shader: ' + gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fsSrc));
  gl.bindAttribLocation(p, 0, 'aPos'); gl.bindAttribLocation(p, 1, 'aUV'); gl.bindAttribLocation(p, 2, 'aLight'); gl.bindAttribLocation(p, 3, 'aTint');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(name + ' link: ' + gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace('[0]', '')] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}

// Interleaved 28-byte vertex layout shared by terrain, particles, items, models.
function bindVertexLayout(gl) {
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, VSTRIDE, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, VSTRIDE, 12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, VSTRIDE, 20);
  gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, true, VSTRIDE, 24);
}
function makeVAO(gl, vertBytes, indices) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, vertBytes, gl.STATIC_DRAW);
  bindVertexLayout(gl);
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, vb, ib, count: indices.length };
}
function freeVAO(gl, m) {
  if (!m) return;
  gl.deleteBuffer(m.vb); gl.deleteBuffer(m.ib); gl.deleteVertexArray(m.vao);
}

const SHADERS = {
  terrainVS: `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aUV;
layout(location=2) in vec4 aLight;
layout(location=3) in vec4 aTint;
uniform mat4 uProj; uniform mat4 uView; uniform vec3 uOffset; uniform float uTime; uniform float uWind; uniform vec2 uWorld; uniform float uSea;
out vec2 vUV; out float vSky; out float vBlock; out float vShade; out float vDist; out vec4 vTint; out vec3 vRel;
void main(){
  vec3 p = aPos + uOffset;
  float sway = floor(aLight.w * 255.0 + 0.5);
  if (sway > 0.5) {
    vec2 w = aPos.xz + uWorld;
    float gust = 0.6 + 0.4 * sin(uTime * 0.35 + w.x * 0.02 + w.y * 0.015);
    if (sway > 47.5) {      // (alpha 3) cloth in the wind: flags, banners, bunting, washing (48 + k flaps across z, 64 + k across x; k: how far out)
      bool acrossX = sway > 63.5;
      float k = (sway - (acrossX ? 64.0 : 48.0)) / 15.0;
      float ph = w.x * 0.37 + w.y * 0.29;
      float wave = sin(uTime * 5.1 - k * 4.2 + ph) * 0.65 + sin(uTime * 3.3 - k * 2.6 + ph * 1.7) * 0.35;
      float a = k * (0.07 + 0.2 * uWind) * gust * wave;
      if (acrossX) p.x += a; else p.z += a;
      p.y -= abs(a) * 0.2 * k;
    } else if (sway > 31.5) {      // (0.9.0.50) water, and how open it is (32 + 0..15): the open sea swells, more in a storm; a pond barely stirs
      float k = (sway - 32.0) / 15.0, A = k * (0.04 + 0.14 * uSea);
      float ripple = sin(uTime * 1.6 + w.x * 0.8 + w.y * 0.55) * 0.035 + sin(uTime * 1.05 - w.x * 0.37 + w.y * 0.77) * 0.025;
      float swell = sin(uTime * 0.9 + w.x * 0.21 + w.y * 0.13) * 0.6 + sin(uTime * 0.63 - w.x * 0.09 + w.y * 0.17) * 0.4;
      float chop = sin(uTime * 2.7 + w.x * 1.3 - w.y * 0.9) * uSea * k;
      p.y += ripple * (1.0 + 0.6 * uSea * k) + swell * A + chop * 0.025 - A * 0.7 - 0.06;
    } else if (sway < 1.5 || sway > 15.5) {        // grass & flowers bend at the tip (16..31: partway up a solid plant)
      float pk = sway > 15.5 ? (sway - 16.0) / 15.0 : 1.0;
      p.x += (sin(uTime * 1.9 + w.x * 0.37 + w.y * 0.23) + 0.4 * sin(uTime * 3.3 + w.x * 1.1)) * 0.075 * uWind * gust * pk;
      p.z += cos(uTime * 1.5 + w.y * 0.31 + w.x * 0.11) * 0.055 * uWind * gust * pk;
    } else if (sway < 2.5) { // leaves rustle
      float ph = w.x * 0.45 + w.y * 0.38 + aPos.y * 0.5;
      p.x += sin(uTime * 1.4 + ph) * 0.028 * uWind * gust;
      p.y += sin(uTime * 1.9 + ph * 1.3) * 0.018 * uWind * gust;
      p.z += cos(uTime * 1.2 + ph) * 0.028 * uWind * gust;
    } else if (sway < 3.5) { // water rolls
      p.y += sin(uTime * 1.6 + w.x * 0.8 + w.y * 0.55) * 0.035 + sin(uTime * 1.05 - w.x * 0.37 + w.y * 0.77) * 0.025 - 0.06;
    } else {                 // hanging things swing about their hook
      float k = (sway - 4.0) / 11.0;
      float ph = floor(w.x) * 1.7 + floor(w.y) * 2.3;
      p.x += sin(uTime * 1.7 + ph) * 0.07 * k * (0.35 + uWind) * gust;
      p.z += cos(uTime * 1.3 + ph * 0.7) * 0.05 * k * (0.35 + uWind) * gust;
    }
  }
  vec4 vp = uView * vec4(p, 1.0);
  gl_Position = uProj * vp;
  vUV = aUV; vSky = aLight.x; vBlock = aLight.y; vShade = aLight.z; vDist = length(vp.xyz); vTint = aTint; vRel = p;
}`,
  terrainFS: `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform float uDay; uniform vec3 uFog; uniform vec2 uFogRange;
uniform float uAlpha; uniform float uAlphaTest; uniform float uMinLight; uniform vec4 uTint;
in vec2 vUV; in float vSky; in float vBlock; in float vShade; in float vDist; in vec4 vTint; in vec3 vRel;
out vec4 o;
float curve(float l){ return l / (3.2 - 2.2 * l); }
uniform vec4 uDyn[8]; uniform int uDynN;
// Carried lights (torches in hand, lanterns on belts): light falls off one level
// per block like placed light, and only lights faces turned toward it.
float dynLight(vec3 pos, vec3 n){
  if (uDynN == 0) return 0.0;
  float best = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= uDynN) break;
    vec3 d = uDyn[i].xyz - pos;
    float l = length(d);
    float lv = (uDyn[i].w - l) / 15.0;
    if (lv <= best) continue;
    float face = clamp(dot(n, d / max(l, 0.001)) * 2.0 + 0.6, 0.0, 1.0);
    best = max(best, lv * face);
  }
  return clamp(best, 0.0, 1.0);
}
void main(){
  // the face normal is only needed for carried lights, so skip the work when there are none
  vec3 nrm = vec3(0.0, 1.0, 0.0);
  if (uDynN > 0) nrm = normalize(cross(dFdx(vRel), dFdy(vRel)));
  vec4 t = texture(uTex, vUV);
  if (t.a < uAlphaTest) discard;
  // pixels painted with alpha 253 take the climate tint (grass, leaves); water takes it everywhere
  if (vTint.a > 0.5) t.rgb *= vTint.rgb * 1.25;
  else if (abs(t.a - 0.99216) < 0.002) { t.rgb *= vTint.rgb * 1.3; t.a = 1.0; }
  float sky = curve(vSky) * uDay;
  float blk = curve(max(vBlock, dynLight(vRel, nrm)));
  vec3 lc = max(vec3(sky), vec3(blk) * vec3(1.0, 0.85, 0.62));
  lc = max(lc, vec3(uMinLight));
  vec3 c = t.rgb * lc * vShade;
  c = mix(c, uTint.rgb, uTint.a);
  float f = smoothstep(uFogRange.x, uFogRange.y, vDist);
  o = vec4(mix(c, uFog, f), t.a * uAlpha);
}`,
  // Models (entities, hand, items) — same vertex layout, own model matrix.
  modelVS: `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aUV;
layout(location=2) in vec4 aLight;
layout(location=3) in vec4 aTint;
uniform mat4 uProj; uniform mat4 uView; uniform mat4 uModel;
out vec2 vUV; out float vShade; out float vDist; out vec4 vTint; out vec3 vRel;
void main(){
  vec4 wp = uModel * vec4(aPos, 1.0);
  vec4 vp = uView * wp;
  gl_Position = uProj * vp;
  vUV = aUV; vShade = aLight.z; vDist = length(vp.xyz); vTint = aTint; vRel = wp.xyz;
}`,
  modelFS: `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform vec2 uLight; uniform float uDay; uniform vec3 uFog; uniform vec2 uFogRange;
uniform vec4 uTint; uniform float uMinLight; uniform float uUnlit; uniform float uAlpha; uniform vec2 uGlint;
in vec2 vUV; in float vShade; in float vDist; in vec4 vTint; in vec3 vRel;
out vec4 o;
float curve(float l){ return l / (3.2 - 2.2 * l); }
uniform vec4 uDyn[8]; uniform int uDynN;
// Carried lights (torches in hand, lanterns on belts): light falls off one level
// per block like placed light, and only lights faces turned toward it.
float dynLight(vec3 pos, vec3 n){
  if (uDynN == 0) return 0.0;
  float best = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= uDynN) break;
    vec3 d = uDyn[i].xyz - pos;
    float l = length(d);
    float lv = (uDyn[i].w - l) / 15.0;
    if (lv <= best) continue;
    float face = clamp(dot(n, d / max(l, 0.001)) * 2.0 + 0.6, 0.0, 1.0);
    best = max(best, lv * face);
  }
  return clamp(best, 0.0, 1.0);
}
void main(){
  // the face normal is only needed for carried lights, so skip the work when there are none
  vec3 nrm = vec3(0.0, 1.0, 0.0);
  if (uDynN > 0) nrm = normalize(cross(dFdx(vRel), dFdy(vRel)));
  vec4 t = texture(uTex, vUV);
  if (t.a < 0.1) discard;
  if (abs(t.a - 0.99216) < 0.002) { t.rgb *= vTint.rgb * 1.3; t.a = 1.0; }
  vec3 lc = max(vec3(curve(uLight.x) * uDay), vec3(curve(max(uLight.y, dynLight(vRel, nrm)))) * vec3(1.0, 0.85, 0.62));
  lc = max(lc, vec3(uMinLight));
  lc = mix(lc, vec3(1.0), uUnlit);
  vec3 c = t.rgb * lc * mix(vShade, 1.0, uUnlit);
  c = mix(c, uTint.rgb, uTint.a);
  // enchanted things shimmer: a faint violet sheen with bright bands sliding across
  if (uGlint.x > 0.0) {
    float b = fract((vRel.x * 1.1 + vRel.y * 1.7 - vRel.z * 0.8) * 1.6 - uGlint.y * 0.42);
    float band = smoothstep(0.0, 0.1, b) * smoothstep(0.3, 0.12, b);
    c += vec3(0.62, 0.36, 1.0) * uGlint.x * (0.16 + band * 0.7);
  }
  float f = uUnlit > 0.5 ? 0.0 : smoothstep(uFogRange.x, uFogRange.y, vDist);
  o = vec4(mix(c, uFog, f), t.a * uAlpha);
}`,
  skyVS: `#version 300 es
const vec2 P[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));
out vec2 vNdc;
void main(){ vNdc = P[gl_VertexID]; gl_Position = vec4(P[gl_VertexID], 0.9999, 1.0); }`,
  skyFS: `#version 300 es
precision highp float;
uniform mat4 uInvVP; uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uSunGlow; uniform float uStars; uniform float uVoid;
uniform float uAurora; uniform float uRainbow; uniform float uSkyT; uniform vec4 uStorm; uniform vec3 uStormCol;
in vec2 vNdc; out vec4 o;
float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
void main(){
  vec4 w = uInvVP * vec4(vNdc, 1.0, 1.0);
  vec3 d = normalize(w.xyz / w.w);
  float t = pow(clamp(d.y, 0.0, 1.0), 0.45);
  vec3 c = mix(uHorizon, uZenith, t);
  if (d.y < 0.0) c = mix(uHorizon, uHorizon * (1.0 - uVoid * 0.85), clamp(-d.y * 3.0, 0.0, 1.0));
  float sg = max(dot(d, uSunDir), 0.0);
  c += uSunGlow * pow(sg, 6.0) * clamp(1.0 - abs(d.y) * 2.0, 0.0, 1.0);
  if (uStars > 0.0 && d.y > 0.0) {
    vec3 q = floor(d * 220.0);
    float s = step(0.9975, h(q));
    c += vec3(s) * uStars * clamp(d.y * 3.0, 0.0, 1.0);
  }
  // (0.9.0.50) the northern lights: curtains of green, purple at the top, folding and drifting across the north
  if (uAurora > 0.001 && d.y > 0.0) {
    float az = atan(d.x, -d.z), north = smoothstep(-0.35, 0.45, -d.z / max(0.001, length(d.xz)));
    vec3 au = vec3(0.0);
    for (int i = 0; i < 3; i++) {
      float fi = float(i), x = az * (2.2 + fi * 0.9) + fi * 1.7;
      float fold = sin(x * 2.0 + uSkyT * (0.05 + fi * 0.02)) * 0.5 + sin(x * 4.7 - uSkyT * 0.07 + fi) * 0.3 + sin(x * 9.3 + uSkyT * 0.11) * 0.2;
      float base = 0.16 + fi * 0.07 + 0.05 * fold, h = d.y - base;
      float curtain = smoothstep(-0.015, 0.02, h) * exp(-max(h, 0.0) * (5.0 + fi * 2.0));
      float rays = 0.55 + 0.45 * sin(az * (70.0 + fi * 23.0) + sin(az * 6.0 + uSkyT * 0.2 + fi) * 5.0);
      float glow = 0.6 + 0.4 * sin(az * 3.0 - uSkyT * 0.09 + fi * 2.1);
      vec3 col = mix(vec3(0.12, 1.0, 0.45), vec3(0.65, 0.25, 0.95), clamp(h * 4.5, 0.0, 1.0));
      au += col * curtain * rays * glow * (1.0 - fi * 0.25);
    }
    c += au * north * uAurora * 0.55;
  }
  // a storm still far off: a dark bank of cloud along that side of the sky, its top rising as it comes closer
  // (the front is a line across the land, so it stands highest straight toward it and sinks to the horizon at the sides)
  if (uStorm.w > 0.001 && d.y > -0.06) {
    vec2 hd = normalize(d.xz + vec2(1e-5));
    float facing = dot(hd, uStorm.xy);
    if (facing > 0.0) {
      float az = atan(d.x, d.z);
      float top = 95.0 * facing / max(uStorm.z, 60.0);
      top += (0.012 * sin(az * 19.0) + 0.008 * sin(az * 47.0 + 1.3) + 0.005 * sin(az * 113.0 + 2.1)) * sqrt(facing);
      top = min(top, 0.9);
      float bank = smoothstep(top + 0.006, top - 0.006, d.y) * smoothstep(0.0, 0.3, facing);
      float rim = smoothstep(top - 0.035, top, d.y);
      c = mix(c, mix(uStormCol, uStormCol * 1.7 + 0.04, rim * 0.55), bank * uStorm.w);
    }
  }
  // a rainbow after the rain: the bow 42 degrees round the point opposite the sun, red outside, violet in
  if (uRainbow > 0.001 && d.y > -0.02) {
    float r = acos(clamp(dot(d, -uSunDir), -1.0, 1.0));
    float b = (r - 0.705) / 0.04;                     // 0 at violet (40.4 deg), 1 at red (42.7 deg)
    if (b > -0.25 && b < 1.25) {
      float hh = (1.0 - clamp(b, 0.0, 1.0)) * 0.78;    // red (outside) round to violet (inside)
      vec3 bow = clamp(vec3(abs(hh * 6.0 - 3.0) - 1.0, 2.0 - abs(hh * 6.0 - 2.0), 2.0 - abs(hh * 6.0 - 4.0)), 0.0, 1.0);
      float edge = smoothstep(-0.25, 0.1, b) * smoothstep(1.25, 0.9, b);
      c += bow * edge * uRainbow * 0.22 * smoothstep(-0.02, 0.06, d.y);
    }
  }
  o = vec4(c, 1.0);
}`,
  lineVS: `#version 300 es
layout(location=0) in vec3 aPos;
uniform mat4 uProj; uniform mat4 uView; uniform vec3 uOffset;
void main(){ gl_Position = uProj * uView * vec4(aPos + uOffset, 1.0); }`,
  lineFS: `#version 300 es
precision mediump float;
uniform vec4 uColor; out vec4 o;
void main(){ o = uColor; }`,
  // Ground telegraphs for boss attacks: circles and lanes drawn on the floor.
  decalVS: `#version 300 es
layout(location=0) in vec3 aPos;
uniform mat4 uProj; uniform mat4 uView; uniform mat4 uModel;
out vec2 vP;
void main(){ vP = aPos.xz; gl_Position = uProj * uView * uModel * vec4(aPos, 1.0); }`,
  decalFS: `#version 300 es
precision highp float;
uniform vec4 uColor; uniform float uProgress; uniform float uShape; uniform float uTime;
in vec2 vP; out vec4 o;
void main(){
  float a;
  if (uShape < 0.5) {
    float d = length(vP);
    if (d > 1.0) discard;
    float ring = smoothstep(0.9, 0.97, d) * (1.0 - smoothstep(0.97, 1.0, d));
    float fill = step(d, uProgress) * 0.35;
    float stripes = 0.08 * step(0.5, fract((d - uTime * 0.6) * 6.0));
    a = max(ring, fill + stripes);
  } else {
    // lane: x in [-1,1] across, z in [0,1] along
    float edge = smoothstep(0.85, 0.95, abs(vP.x));
    float fill = step(vP.y, uProgress) * 0.35;
    float chev = 0.12 * step(0.5, fract(vP.y * 8.0 - uTime * 2.0));
    a = max(edge * 0.8, fill + chev);
  }
  o = vec4(uColor.rgb, a * uColor.a);
}`,
};
