// liquid-glass-webgl2.ts
// WebGL2 multipass: background -> blur -> final glass composite

type GL = WebGL2RenderingContext;

function compileShader(gl: GL, type: number, src: string): WebGLShader {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh);
        gl.deleteShader(sh);
        throw new Error(`Shader compile failed: ${log}`);
    }
    return sh;
}

function createProgram(gl: GL, vsSrc: string, fsSrc: string): WebGLProgram {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(prog);
        gl.deleteProgram(prog);
        throw new Error(`Program link failed: ${log}`);
    }
    return prog;
}

function createTexture(gl: GL, w: number, h: number): WebGLTexture {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        w,
        h,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
    );
    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex;
}

function createFBO(gl: GL, tex: WebGLTexture): WebGLFramebuffer {
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        gl.deleteFramebuffer(fbo);
        throw new Error(`FBO incomplete: ${status}`);
    }
    return fbo;
}

const FULLSCREEN_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const BLUR_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTex;
uniform vec2 uTexel;   // 1.0/size
uniform vec2 uDir;     // (1,0) or (0,1)
uniform float uSigma;

float gauss(float x, float s) { return exp(-(x*x)/(2.0*s*s)); }

void main(){
  // 9-tap (radius 4) separable Gaussian
  float w0 = gauss(0.0, uSigma);
  vec3 c = texture(uTex, vUv).rgb * w0;
  float wsum = w0;

  for(int i=1;i<=4;i++){
    float wi = gauss(float(i), uSigma);
    vec2 off = uDir * uTexel * float(i);
    c += texture(uTex, vUv + off).rgb * wi;
    c += texture(uTex, vUv - off).rgb * wi;
    wsum += 2.0 * wi;
  }
  c /= wsum;
  fragColor = vec4(c, 1.0);
}
`;

const FINAL_GLASS_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uBg;     // original background
uniform sampler2D uBlur;   // blurred background

uniform vec2  uRes;
uniform vec2  uCenter;     // 0..1
uniform vec2  uSize;       // 0..1 (relative)
uniform float uRound;      // superellipse exponent control
uniform float uThickness;  // edge thickness (px-ish)
uniform float uIor;        // refraction strength base
uniform float uDisp;       // dispersion strength
uniform float uFresnel;    // fresnel strength
uniform float uTint;       // tint mix
uniform vec3  uTintColor;  // tint color
uniform vec2  uGlareDir;   // normalized direction
uniform float uGlare;      // glare amount

// --- Superellipse SDF (approx) ---
// Map uv to local space (-1..1), apply aspect correction.
float sdfSuperellipse(vec2 p, vec2 b, float n){
  // p: local coords, b: half-size in local space
  vec2 q = abs(p) / b;
  // superellipse: (|x|^n + |y|^n)^(1/n) - 1
  float k = pow(pow(q.x, n) + pow(q.y, n), 1.0/n);
  return (k - 1.0) * min(b.x, b.y);
}

vec2 sdfGrad(vec2 p, vec2 b, float n){
  // numeric gradient
  float e = 1.0 / min(uRes.x, uRes.y);
  float d  = sdfSuperellipse(p, b, n);
  float dx = sdfSuperellipse(p + vec2(e,0), b, n) - d;
  float dy = sdfSuperellipse(p + vec2(0,e), b, n) - d;
  return vec2(dx, dy) / e;
}

void main(){
  vec2 uv = vUv;
  vec2 aspect = vec2(uRes.x/uRes.y, 1.0);

  // local coordinates centered at uCenter in NDC-like space
  vec2 p = (uv - uCenter);
  p.x *= aspect.x;

  vec2 b = uSize * 0.5;
  b.x *= aspect.x;

  float n = mix(2.0, 12.0, clamp(uRound, 0.0, 1.0)); // 2=ellipse, 12=more squarish
  float d = sdfSuperellipse(p, b, n);

  // inside mask with smooth edge
  float aa = 1.5 / min(uRes.x, uRes.y);
  float mask = 1.0 - smoothstep(0.0, aa, d);

  vec3 bg   = texture(uBg,   uv).rgb;
  vec3 blur = texture(uBlur, uv).rgb;

  if(mask <= 0.0){
    fragColor = vec4(bg, 1.0);
    return;
  }

  // normal from gradient
  vec2 g = sdfGrad(p, b, n);
  vec2 N = normalize(g + 1e-6);

  // refraction offset (screen-space)
  float ior = uIor;
  vec2 refr = -N * (ior / min(uRes.x, uRes.y)) * 220.0; // scale to taste

  // dispersion: slightly different offsets per channel
  vec2 rOff = refr * (1.0 + uDisp);
  vec2 gOff = refr;
  vec2 bOff = refr * (1.0 - uDisp);

  vec3 refrCol;
  refrCol.r = texture(uBg, uv + rOff).r;
  refrCol.g = texture(uBg, uv + gOff).g;
  refrCol.b = texture(uBg, uv + bOff).b;

  // blurred component mixed for "frost" feel
  vec3 glassBase = mix(refrCol, blur, 0.55);

  // Fresnel (approx): use view angle vs normal proxy
  // Here we fake view dir as (0,0,1) and normal from screen N -> convert to 3D-ish
  vec3 n3 = normalize(vec3(N, 0.7));
  float F = pow(1.0 - max(n3.z, 0.0), 4.0) * uFresnel;

  // edge highlight (thickness in pixels-ish)
  float edge = 1.0 - smoothstep(0.0, (uThickness / min(uRes.x,uRes.y)), abs(d));
  edge *= 0.35;

  // glare: directional streak inside shape
  // project local p onto glare direction
  vec2 gd = normalize(uGlareDir);
  float t = dot(p, gd);
  float glare = exp(-t*t*80.0) * uGlare * (1.0 - smoothstep(0.0, 0.02, abs(d)));

  // tint
  vec3 tinted = mix(glassBase, glassBase * uTintColor, uTint);

  // composite
  vec3 col = tinted;
  col += F * vec3(0.9);         // fresnel rim
  col += edge * vec3(1.0);      // edge
  col += glare * vec3(1.0);     // glare

  // subtle alpha to keep background presence
  fragColor = vec4(mix(bg, col, 0.92) , 1.0);
}
`;

function createFullscreenQuad(gl: GL) {
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    // two triangles
    const verts = new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1,
    ]);

    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return { vao, vbo };
}

export function startLiquidGlass(canvas: HTMLCanvasElement, bgSource: HTMLVideoElement | HTMLImageElement) {
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: false }) as GL | null;
    if (!gl) throw new Error("WebGL2 not supported");

    const quad = createFullscreenQuad(gl);

    const blurProg = createProgram(gl, FULLSCREEN_VS, BLUR_FS);
    const finalProg = createProgram(gl, FULLSCREEN_VS, FINAL_GLASS_FS);

    function resize() {
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const w = Math.floor(canvas.clientWidth * dpr);
        const h = Math.floor(canvas.clientHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w; canvas.height = h;
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    // background texture
    const bgTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, bgTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    // ping-pong blur targets
    let texA = createTexture(gl, canvas.width || 2, canvas.height || 2);
    let texB = createTexture(gl, canvas.width || 2, canvas.height || 2);
    let fboA = createFBO(gl, texA);
    let fboB = createFBO(gl, texB);

    function rebuildTargets() {
        // delete old
        gl.deleteFramebuffer(fboA); gl.deleteFramebuffer(fboB);
        gl.deleteTexture(texA); gl.deleteTexture(texB);

        texA = createTexture(gl, canvas.width, canvas.height);
        texB = createTexture(gl, canvas.width, canvas.height);
        fboA = createFBO(gl, texA);
        fboB = createFBO(gl, texB);
    }

    function updateBgTexture() {
        gl.bindTexture(gl.TEXTURE_2D, bgTex);
        // first call allocates, next calls update
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bgSource);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    function drawBlurPass(inputTex: WebGLTexture, outFbo: WebGLFramebuffer, dirX: number, dirY: number, sigma: number) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, outFbo);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(blurProg);
        gl.bindVertexArray(quad.vao);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, inputTex);

        gl.uniform1i(gl.getUniformLocation(blurProg, "uTex"), 0);
        gl.uniform2f(gl.getUniformLocation(blurProg, "uTexel"), 1 / canvas.width, 1 / canvas.height);
        gl.uniform2f(gl.getUniformLocation(blurProg, "uDir"), dirX, dirY);
        gl.uniform1f(gl.getUniformLocation(blurProg, "uSigma"), sigma);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.bindVertexArray(null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function drawFinal(bg: WebGLTexture, blur: WebGLTexture, t: number) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(finalProg);
        gl.bindVertexArray(quad.vao);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, bg);
        gl.uniform1i(gl.getUniformLocation(finalProg, "uBg"), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, blur);
        gl.uniform1i(gl.getUniformLocation(finalProg, "uBlur"), 1);

        gl.uniform2f(gl.getUniformLocation(finalProg, "uRes"), canvas.width, canvas.height);

        // demo params (원하는 UI로 연결하면 liquid-glass-studio처럼 실시간 조절 가능)
        gl.uniform2f(gl.getUniformLocation(finalProg, "uCenter"), 0.5, 0.5);
        gl.uniform2f(gl.getUniformLocation(finalProg, "uSize"), 0.55, 0.35);
        gl.uniform1f(gl.getUniformLocation(finalProg, "uRound"), 0.65);

        gl.uniform1f(gl.getUniformLocation(finalProg, "uThickness"), 2.0);
        gl.uniform1f(gl.getUniformLocation(finalProg, "uIor"), 0.9);
        gl.uniform1f(gl.getUniformLocation(finalProg, "uDisp"), 0.08);

        gl.uniform1f(gl.getUniformLocation(finalProg, "uFresnel"), 1.0);
        gl.uniform1f(gl.getUniformLocation(finalProg, "uTint"), 0.18);
        gl.uniform3f(gl.getUniformLocation(finalProg, "uTintColor"), 0.85, 0.95, 1.0);

        // glare direction rotates slowly
        const ang = t * 0.0004;
        gl.uniform2f(gl.getUniformLocation(finalProg, "uGlareDir"), Math.cos(ang), Math.sin(ang));
        gl.uniform1f(gl.getUniformLocation(finalProg, "uGlare"), 0.45);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.bindVertexArray(null);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    function frame(t: number) {
        resize();

        // if resized: rebuild ping-pong targets
        // (simple check: textures must match canvas size)
        // For brevity, rebuild always when size changes:
        // Use a cached lastW/lastH in real code.
        rebuildTargets();

        updateBgTexture();

        // blur: bgTex -> texA (H) -> texB (V)
        drawBlurPass(bgTex, fboA, 1, 0, 3.5);
        drawBlurPass(texA, fboB, 0, 1, 3.5);

        drawFinal(bgTex, texB, t);

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}
