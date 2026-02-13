export class FilmGrain {
    width: number;
    height: number;
    grainCanvas: HTMLCanvasElement;
    grainCtx: CanvasRenderingContext2D;
    grainData: ImageData | null;
    frame: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.grainCanvas = document.createElement('canvas');
        this.grainCanvas.width = width;
        this.grainCanvas.height = height;
        this.grainCtx = this.grainCanvas.getContext('2d')!;
        this.grainData = null;
        this.frame = 0;
        this.generateGrainPattern();
    }

    generateGrainPattern() {
        const imageData = this.grainCtx.createImageData(this.width, this.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const grain = Math.random();
            const value = grain * 255;
            data[i] = value;     // R
            data[i + 1] = value; // G
            data[i + 2] = value; // B
            data[i + 3] = 255;   // A
        }

        this.grainData = imageData;
    }

    update() {
        this.frame++;

        // Regenerate grain every few frames for animation
        if (this.frame % 2 === 0 && this.grainData) {
            const data = this.grainData.data;

            for (let i = 0; i < data.length; i += 4) {
                // Create animated grain with varying intensity
                const grain = Math.random();
                const time = this.frame * 0.01;
                const x = (i / 4) % this.width;
                const y = Math.floor((i / 4) / this.width);

                // Add some structure to the grain for more realistic look
                const pattern = Math.sin(x * 0.01 + time) * Math.cos(y * 0.01 - time);
                const value = (grain * 0.8 + pattern * 0.2) * 255;

                data[i] = value;
                data[i + 1] = value;
                data[i + 2] = value;
            }

            this.grainCtx.putImageData(this.grainData, 0, 0);
        }
    }

    apply(ctx: CanvasRenderingContext2D, intensity = 0.05, colorize = true, hue = 0) {
        ctx.save();

        // Apply grain with screen blend mode for lighter areas
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = intensity * 0.5;
        ctx.drawImage(this.grainCanvas, 0, 0);

        // Apply grain with multiply for darker areas
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 1 - (intensity * 0.3);
        ctx.drawImage(this.grainCanvas, 0, 0);

        // Add colored grain if specified
        if (colorize) {
            ctx.globalCompositeOperation = 'overlay';
            ctx.globalAlpha = intensity * 0.3;
            ctx.fillStyle = `hsla(${hue}, 50%, 50%, 1)`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        ctx.restore();
    }

    resize(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.grainCanvas.width = width;
        this.grainCanvas.height = height;
        this.generateGrainPattern();
    }
}
