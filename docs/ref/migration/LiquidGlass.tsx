import { useEffect, useRef } from 'react';
import { MultiPassRenderer } from './utils/GLUtils';
import { computeGaussianKernelByRadius } from './utils';

// Import shaders
// NOTE: Ensure your bundler handles ?raw query or configure raw-loader
import VertexShader from './shaders/vertex.glsl?raw';
import FragmentBgShader from './shaders/fragment-bg.glsl?raw';
import FragmentBgVblurShader from './shaders/fragment-bg-vblur.glsl?raw';
import FragmentBgHblurShader from './shaders/fragment-bg-hblur.glsl?raw';
import FragmentMainShader from './shaders/fragment-main.glsl?raw';

import { Controller } from '@react-spring/web';

interface LiquidGlassProps {
    className?: string;
    style?: React.CSSProperties;
}

export function LiquidGlass({ className, style }: LiquidGlassProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Spring controller for elastic mouse movement
    const mouseSpring = useRef(new Controller({ x: 0, y: 0 })).current;
    const mouseSpringVal = useRef({ x: 0, y: 0 }); // Track value outside react render cycle

    useEffect(() => {
        // Subscribe to spring updates to avoid frequent React re-renders
        mouseSpring.start({
            onChange: (result) => {
                mouseSpringVal.current = result.value;
            }
        });
    }, [mouseSpring]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const gl = canvas.getContext('webgl2');
        if (!gl) {
            console.error('WebGL 2 not supported');
            return;
        }

        // 1. Initialize Renderer
        const renderer = new MultiPassRenderer(canvas, [
            {
                name: 'bgPass',
                shader: { vertex: VertexShader, fragment: FragmentBgShader },
            },
            {
                name: 'vBlurPass',
                shader: { vertex: VertexShader, fragment: FragmentBgVblurShader },
                inputs: { u_prevPassTexture: 'bgPass' },
            },
            {
                name: 'hBlurPass',
                shader: { vertex: VertexShader, fragment: FragmentBgHblurShader },
                inputs: { u_prevPassTexture: 'vBlurPass' },
            },
            {
                name: 'mainPass',
                shader: { vertex: VertexShader, fragment: FragmentMainShader },
                inputs: { u_blurredBg: 'hBlurPass', u_bg: 'bgPass' },
                outputToScreen: true,
            },
        ]);

        // 2. Event Listeners
        const onPointerMove = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio;
            const x = (e.clientX - rect.left) * dpr;
            // WebGL Y-axis is inverted relative to DOM
            const y = (rect.height - (e.clientY - rect.top)) * dpr;

            mouseSpring.start({ x, y });
        };
        window.addEventListener('pointermove', onPointerMove);

        // 3. Render Loop
        let rafId: number;
        const render = () => {
            const dpr = window.devicePixelRatio;
            // Handle resize
            const displayWidth = canvas.clientWidth * dpr;
            const displayHeight = canvas.clientHeight * dpr;

            if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
                canvas.width = displayWidth;
                canvas.height = displayHeight;
                gl.viewport(0, 0, displayWidth, displayHeight);
                renderer.resize(displayWidth, displayHeight);
            }

            // Set Uniforms
            renderer.setUniforms({
                u_resolution: [displayWidth, displayHeight],
                u_dpr: dpr,
                u_mouseSpring: [mouseSpringVal.current.x, mouseSpringVal.current.y],
                u_blurWeights: computeGaussianKernelByRadius(20), // Default blur radius

                // --- Custom Parameters (mimicking Leva controls) ---
                u_shapeWidth: 150 * dpr,
                u_shapeHeight: 150 * dpr,
                u_shapeRadius: 50,
                u_shapeRoundness: 4.0,
                u_mergeRate: 200,

                // PBR & Material
                u_refThickness: 80,
                u_refFactor: 0.25,
                u_refDispersion: 1.0,
                u_tint: [1.0, 1.0, 1.0, 0.0], // r, g, b, alpha

                u_showShape1: 1, // Show the static circle in center
                STEP: 9, // Final render step

                // Shadow (optional)
                u_shadowExpand: 0,
                u_shadowFactor: 100,
                u_shadowPosition: [0, 0],

                // Glare & Fresnel
                u_refFresnelRange: 500,
                u_refFresnelFactor: 100,
                u_refFresnelHardness: 0,
                u_glareRange: 500,
                u_glareFactor: 100,
                u_glareHardness: 0,
                u_glareAngle: 0,
                u_glareOppositeFactor: 100,
                u_glareConvergence: 0,
            });

            renderer.render();
            rafId = requestAnimationFrame(render);
        };
        render();

        return () => {
            window.removeEventListener('pointermove', onPointerMove);
            cancelAnimationFrame(rafId);
            renderer.dispose();
        };
    }, []);

    return <canvas ref={canvasRef} className={className} style={{ width: '100%', height: '100%', ...style }} />;
}
