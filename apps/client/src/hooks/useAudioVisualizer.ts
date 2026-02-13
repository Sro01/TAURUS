import { useRef, useEffect, useState, useCallback } from 'react';
import { FilmGrain } from '../utils/FilmGrain';

interface BeamState {
    bassIntensity: number;
    midIntensity: number;
    trebleIntensity: number;
    time: number;
    filmGrain: FilmGrain | null;
    colorState: {
        hue: number;
        targetHue: number;
        saturation: number;
        targetSaturation: number;
        lightness: number;
        targetLightness: number;
    };
    waves: {
        amplitude: number;
        frequency: number;
        speed: number;
        offset: number;
        thickness: number;
        opacity: number;
    }[];
    particles: any[];
    bassHistory: number[];
    postProcessing: {
        filmGrainIntensity: number;
        vignetteIntensity: number;
        chromaticAberration: number;
        scanlineIntensity: number;
    };
}

export const useAudioVisualizer = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationRef = useRef<number>(null);
    const beamRef = useRef<BeamState | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [audioProgress, setAudioProgress] = useState(0);

    const [fps, setFps] = useState(0);
    const lastTimeRef = useRef<number>(0);
    const frameCountRef = useRef<number>(0);
    const lastFpsUpdateRef = useRef<number>(0);

    // Initialize audio
    const initAudio = useCallback(() => {
        if (!audioRef.current || audioContextRef.current) return;

        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContextClass();
            audioContextRef.current = audioContext;

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.8;
            analyserRef.current = analyser;

            const source = audioContext.createMediaElementSource(audioRef.current);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
        } catch (error) {
            console.error('Error initializing audio:', error);
        }
    }, []);

    // Initialize canvas and animation
    const initCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Initialize film grain
        const filmGrain = new FilmGrain(window.innerWidth, window.innerHeight);

        // Beam state with dynamic color system
        const beam: BeamState = {
            bassIntensity: 0,
            midIntensity: 0,
            trebleIntensity: 0,
            time: 0,
            filmGrain: filmGrain,
            // Dynamic color state
            colorState: {
                hue: 30,
                targetHue: 30,
                saturation: 80,
                targetSaturation: 80,
                lightness: 50,
                targetLightness: 50
            },
            waves: [
                {
                    amplitude: 30,
                    frequency: 0.003,
                    speed: 0.02,
                    offset: 0,
                    thickness: 1,
                    opacity: 0.9
                },
                {
                    amplitude: 25,
                    frequency: 0.004,
                    speed: 0.015,
                    offset: Math.PI * 0.5,
                    thickness: 0.8,
                    opacity: 0.7
                },
                {
                    amplitude: 20,
                    frequency: 0.005,
                    speed: 0.025,
                    offset: Math.PI,
                    thickness: 0.6,
                    opacity: 0.5
                },
                {
                    amplitude: 35,
                    frequency: 0.002,
                    speed: 0.01,
                    offset: Math.PI * 1.5,
                    thickness: 1.2,
                    opacity: 0.6
                }
            ],
            particles: [],
            bassHistory: new Array(20).fill(0),
            postProcessing: {
                filmGrainIntensity: 0.04,
                vignetteIntensity: 0.4,
                chromaticAberration: 0.8,
                scanlineIntensity: 0.02
            }
        };
        beamRef.current = beam;

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            if (beam.filmGrain) {
                beam.filmGrain.resize(canvas.width, canvas.height);
            }
        };

        resizeCanvas();

        const animate = (timestamp: number) => {
            animationRef.current = requestAnimationFrame(animate);

            // FPS Calculation
            if (lastTimeRef.current === 0) {
                lastTimeRef.current = timestamp;
                lastFpsUpdateRef.current = timestamp;
            }

            frameCountRef.current++;

            // Update FPS every 500ms
            if (timestamp - lastFpsUpdateRef.current >= 500) {
                const elapsed = timestamp - lastFpsUpdateRef.current;
                const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
                setFps(currentFps);
                frameCountRef.current = 0;
                lastFpsUpdateRef.current = timestamp;
            }

            // Clear canvas with slight fade for motion blur
            ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Get audio data
            let bassAmplitude = 0;
            let midAmplitude = 0;
            let trebleAmplitude = 0;

            if (analyserRef.current && isPlaying) { // Use local isPlaying or check audio state
                // Note: isPlaying in closure might be stale if not careful, 
                // but since we rely on analyser data which is real-time, it's okay.
                // However, strictly speaking, we should check audioRef.current.paused maybe?
                // Let's rely on the fact that if it's paused, dataArray will be silent or we can check audio state.
            }

            // Check real audio state for animation data
            const isAudioPlaying = audioRef.current && !audioRef.current.paused;

            if (analyserRef.current && isAudioPlaying) {
                const bufferLength = analyserRef.current.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                analyserRef.current.getByteFrequencyData(dataArray);

                // Calculate frequency ranges
                let bassSum = 0;
                for (let i = 0; i < 30; i++) {
                    bassSum += dataArray[i];
                }
                bassAmplitude = bassSum / (30 * 255);

                let midSum = 0;
                for (let i = 30; i < 200; i++) {
                    midSum += dataArray[i];
                }
                midAmplitude = midSum / (170 * 255);

                let trebleSum = 0;
                for (let i = 200; i < 800; i++) {
                    trebleSum += dataArray[i];
                }
                trebleAmplitude = trebleSum / (600 * 255);

                beam.bassHistory.shift();
                beam.bassHistory.push(bassAmplitude);
                const avgBass = beam.bassHistory.reduce((a, b) => a + b) / beam.bassHistory.length;

                beam.bassIntensity = avgBass;
                beam.midIntensity = midAmplitude;
                beam.trebleIntensity = trebleAmplitude;

                // Dynamic color mapping
                if (bassAmplitude > midAmplitude && bassAmplitude > trebleAmplitude) {
                    beam.colorState.targetHue = 0 + bassAmplitude * 30;
                    beam.colorState.targetSaturation = 80 + bassAmplitude * 20;
                    beam.colorState.targetLightness = 50 + bassAmplitude * 10;
                } else if (midAmplitude > trebleAmplitude) {
                    beam.colorState.targetHue = 40 + midAmplitude * 80;
                    beam.colorState.targetSaturation = 20 + midAmplitude * 30;
                    beam.colorState.targetLightness = 55 + midAmplitude * 15;
                } else {
                    beam.colorState.targetHue = 200 + trebleAmplitude * 80;
                    beam.colorState.targetSaturation = 20 + trebleAmplitude * 40;
                    beam.colorState.targetLightness = 60 + trebleAmplitude * 10;
                }

                // Adjust post-processing based on audio
                beam.postProcessing.filmGrainIntensity = 0.03 + bassAmplitude * 0.2;
                beam.postProcessing.chromaticAberration = trebleAmplitude * 0.5;

            } else {
                // Demo animation (Idle state)
                beam.bassIntensity = 0.4 + Math.sin(beam.time * 0.01) * 0.3;
                beam.midIntensity = 0.3 + Math.sin(beam.time * 0.015) * 0.2;
                beam.trebleIntensity = 0.2 + Math.sin(beam.time * 0.02) * 0.1;

                beam.colorState.targetHue = 180 + Math.sin(beam.time * 0.005) * 180;
                beam.colorState.targetSaturation = 70 + Math.sin(beam.time * 0.01) * 30;
                beam.colorState.targetLightness = 50 + Math.sin(beam.time * 0.008) * 20;
            }

            // Smooth color transitions
            beam.colorState.hue += (beam.colorState.targetHue - beam.colorState.hue) * 0.5;
            beam.colorState.saturation += (beam.colorState.targetSaturation - beam.colorState.saturation) * 0.2;
            beam.colorState.lightness += (beam.colorState.targetLightness - beam.colorState.lightness) * 0.1;

            // Update time
            beam.time++;

            const centerY = canvas.height / 2;

            // Draw waves
            beam.waves.forEach((wave, waveIndex) => {
                wave.offset += wave.speed * (1 + beam.bassIntensity * 0.8);

                const freqInfluence = waveIndex < 2 ? beam.bassIntensity : beam.midIntensity;
                const dynamicAmplitude = wave.amplitude * (1 + freqInfluence * 5);

                const waveHue = beam.colorState.hue + waveIndex * 15;
                const waveSaturation = beam.colorState.saturation - waveIndex * 5;
                const waveLightness = beam.colorState.lightness + waveIndex * 5;

                const gradient = ctx.createLinearGradient(0, centerY - dynamicAmplitude, 0, centerY + dynamicAmplitude);
                const alpha = wave.opacity * (0.5 + beam.bassIntensity * 0.5);

                gradient.addColorStop(0, `hsla(${waveHue}, ${waveSaturation}%, ${waveLightness}%, 0)`);
                gradient.addColorStop(0.5, `hsla(${waveHue}, ${waveSaturation}%, ${waveLightness + 10}%, ${alpha})`);
                gradient.addColorStop(1, `hsla(${waveHue}, ${waveSaturation}%, ${waveLightness}%, 0)`);

                ctx.beginPath();
                for (let x = -50; x <= canvas.width + 50; x += 2) {
                    const y1 = Math.sin(x * wave.frequency + wave.offset) * dynamicAmplitude;
                    const y2 = Math.sin(x * wave.frequency * 2 + wave.offset * 1.5) * (dynamicAmplitude * 0.3 * beam.midIntensity);
                    const y3 = Math.sin(x * wave.frequency * 0.5 + wave.offset * 0.7) * (dynamicAmplitude * 0.5);
                    const y = centerY + y1 + y2 + y3;

                    if (x === -50) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }

                ctx.lineTo(canvas.width + 50, canvas.height);
                ctx.lineTo(-50, canvas.height);
                ctx.closePath();

                ctx.fillStyle = gradient;
                ctx.fill();
            });

            // Apply post-processing effects

            // 1. Film grain
            if (beam.filmGrain) {
                beam.filmGrain.update();
                beam.filmGrain.apply(ctx, beam.postProcessing.filmGrainIntensity, true, beam.colorState.hue);
            }

            // 2. Scanlines
            ctx.strokeStyle = `rgba(0, 0, 0, ${beam.postProcessing.scanlineIntensity})`;
            ctx.lineWidth = 1;
            for (let y = 0; y < canvas.height; y += 3) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }

            // 3. Chromatic aberration
            if (beam.postProcessing.chromaticAberration > 0.1) {
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                ctx.globalAlpha = beam.postProcessing.chromaticAberration * 0.7;

                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext('2d')!;

                tempCtx.drawImage(canvas, 0, 0);

                // Red channel shift
                ctx.globalCompositeOperation = 'multiply';
                ctx.fillStyle = 'rgb(255, 0, 0)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.globalCompositeOperation = 'screen';
                ctx.drawImage(tempCanvas, -2 * beam.postProcessing.chromaticAberration, 0);

                // Blue channel shift
                ctx.globalCompositeOperation = 'multiply';
                ctx.fillStyle = 'rgb(0, 0, 255)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.globalCompositeOperation = 'screen';
                ctx.drawImage(tempCanvas, 2 * beam.postProcessing.chromaticAberration, 0);

                ctx.restore();
            }

            // 4. Vignette
            const vignette = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, canvas.width * 0.2,
                canvas.width / 2, canvas.height / 2, canvas.width * 0.9
            );
            vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
            vignette.addColorStop(0.5, `rgba(0, 0, 0, ${beam.postProcessing.vignetteIntensity * 0.3})`);
            vignette.addColorStop(0.8, `rgba(0, 0, 0, ${beam.postProcessing.vignetteIntensity * 0.6})`);
            vignette.addColorStop(1, `rgba(0, 0, 0, ${beam.postProcessing.vignetteIntensity})`);
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 5. Dust particles
            if (Math.random() < 0.02) {
                const dustCount = Math.floor(Math.random() * 5) + 1;
                for (let i = 0; i < dustCount; i++) {
                    const x = Math.random() * canvas.width;
                    const y = Math.random() * canvas.height;
                    const size = Math.random() * 2 + 0.5;

                    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
                    ctx.beginPath();
                    ctx.arc(x, y, size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // 6. Flicker (Removed per user request)
            // const flicker = Math.sin(beam.time * 0.3) * 0.02 + Math.random() * 0.01;
            // ctx.fillStyle = `rgba(255, 255, 255, ${flicker})`;
            // ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 7. Color grade
            ctx.save();
            ctx.globalCompositeOperation = 'overlay';
            ctx.globalAlpha = 0.1;
            const colorGradeGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            colorGradeGradient.addColorStop(0, 'rgb(255, 240, 220)');
            colorGradeGradient.addColorStop(0.5, 'rgb(255, 255, 255)');
            colorGradeGradient.addColorStop(1, 'rgb(220, 230, 255)');
            ctx.fillStyle = colorGradeGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();

            // 8. Scratches
            if (Math.random() < 0.005) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.2 + 0.1})`;
                ctx.lineWidth = Math.random() * 2 + 0.5;
                ctx.beginPath();
                const scratchX = Math.random() * canvas.width;
                ctx.moveTo(scratchX, 0);
                ctx.lineTo(scratchX + (Math.random() - 0.5) * 20, canvas.height);
                ctx.stroke();
            }
        };

        requestAnimationFrame(animate);

        // Handle resize
        window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []); // Remove isPlaying dependency to avoid re-init loop

    // Toggle playback
    const togglePlayback = useCallback(() => {
        if (!audioRef.current) return;

        // Resume context if suspended (browser policy)
        if (!audioContextRef.current) {
            initAudio();
        } else if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(error => {
                    console.error('Error playing audio:', error);
                    // Handle autoplay policy errors?
                });
        }
    }, [isPlaying, initAudio]);

    // Update progress
    const updateProgress = useCallback(() => {
        if (audioRef.current && audioRef.current.duration) {
            const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
            setAudioProgress(progress);
        }
    }, []);

    useEffect(() => {
        const cleanup = initCanvas();
        return cleanup;
    }, [initCanvas]);

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            const handleCanPlay = () => setIsLoading(false);
            const handleError = (e: any) => {
                console.error('Audio error:', e);
                setIsLoading(false);
            };
            const handleEnded = () => setIsPlaying(false);

            audio.addEventListener('canplay', handleCanPlay);
            audio.addEventListener('error', handleError);
            audio.addEventListener('timeupdate', updateProgress);
            audio.addEventListener('ended', handleEnded);

            return () => {
                audio.removeEventListener('canplay', handleCanPlay);
                audio.removeEventListener('error', handleError);
                audio.removeEventListener('timeupdate', updateProgress);
                audio.removeEventListener('ended', handleEnded);
            };
        }
    }, [updateProgress]);

    return {
        canvasRef,
        audioRef,
        isPlaying,
        isLoading,
        audioProgress,
        togglePlayback,
        fps
    };
};
