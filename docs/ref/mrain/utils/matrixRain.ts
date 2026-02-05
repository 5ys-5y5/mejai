function random(min = 0, max = 1): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function colorToText(r: number, g: number, b: number, a = 1): string {
  return `rgba(${r},${g},${b},${a})`;
}

interface Color {
  red: number;
  green: number;
  blue: number;
}

interface Position {
  x: number;
  y: number;
}

abstract class Entity {
  pos: Position;
  ctx: CanvasRenderingContext2D;

  static showAll(list: Entity[]) {
    for (let i = 0; i < list.length; i++) {
      if (!list[i].show()) {
        list.splice(i, 1);
      }
    }
  }

  constructor(x: number, y: number, ctx: CanvasRenderingContext2D) {
    this.pos = { x, y };
    this.ctx = ctx;
  }

  abstract update(): boolean;
  abstract draw(): void;

  show(): boolean {
    if (this.update()) {
      this.draw();
      return true;
    } else {
      return false;
    }
  }
}

class Char extends Entity {
  static size = 10; // Reduced from 20 (1/4 size)
  static width = 10; // Reduced from 14 (1/4 size)
  static height = 10; // Reduced from 24 (1/4 size)
  
  charList: string[];
  color: Color;
  head: boolean;
  alpha: number;
  val: string = '';

  constructor(x: number, y: number, ctx: CanvasRenderingContext2D, charList: string[], color: Color) {
    super(x, y, ctx);
    this.charList = charList;
    this.color = color;
    this.head = true;
    this.alpha = 1;
    this.randomizeCharVal();
  }

  randomizeCharVal() {
    this.val = this.charList[random(0, this.charList.length - 1)];
  }

  update(): boolean {
    if (random(0, 100) < 5) {
      this.randomizeCharVal();
    }
    this.alpha *= 0.95;
    return this.alpha >= 0.01;
  }

  draw() {
    // Customization: Use Apple SD Gothic Neo
    this.ctx.font = `bold ${Char.size}px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
    
    if (!this.head) {
        // Customization: Use the passed color (Black) with alpha for trails
        this.ctx.fillStyle = colorToText(this.color.red, this.color.green, this.color.blue, this.alpha);
    } else {
        // Customization: Head is also Black (or slightly different if preferred, but keeping consistent with "Black text")
        // To make the head pop on white background, we might want it pure black while trails fade.
        // Or if we want a distinct head color, we could use a dark gray.
        // Per prompt "Black text", we use pure black (0,0,0) for the head.
        this.ctx.fillStyle = colorToText(0, 0, 0, 1);
        this.head = false;
    }
    
    this.ctx.fillText(this.val, this.pos.x, this.pos.y);
  }
}

class Strand extends Entity {
  canvas: HTMLCanvasElement;
  charList: string[];
  color: Color;
  chars: Char[];

  constructor(x: number, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, charList: string[], color: Color) {
    super(x, Char.height, ctx);
    this.canvas = canvas;
    this.charList = charList;
    this.color = color;
    this.chars = [];
  }

  update(): boolean {
    if (this.chars.length < 1 || this.chars[this.chars.length - 1].pos.y < this.canvas.height * 2) {
      this.chars.push(new Char(this.pos.x, this.pos.y, this.ctx, this.charList, this.color));
      this.pos.y += Char.height;
      return true;
    } else {
      return false;
    }
  }

  draw() {
    Entity.showAll(this.chars);
  }
}

export class MatrixRain {
  canvas: HTMLCanvasElement;
  charList: string[];
  color: Color;
  randomColors: boolean;
  flowRate: number;
  ctx: CanvasRenderingContext2D;
  columns: number = 0;
  strands: Strand[] = [];
  intervalId: number | null = null;

  constructor(
    element: HTMLCanvasElement,
    width: number,
    height: number,
    charList: string[],
    red: number,
    green: number,    blue: number,
    randomColors: boolean,
    flowRate: number,
    fps: number
  ) {
    this.canvas = element;
    this.charList = charList;
    this.color = { red, green, blue };
    this.randomColors = randomColors;
    this.flowRate = flowRate;
    
    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("Could not get 2d context");
    this.ctx = context;

    this.setCanvasDimensions(width, height);
    
    // Initial setup of transform
    this.updateContextTransform();

    this.intervalId = window.setInterval(() => {
      this.run();
    }, 1000 / fps);
  }

  updateContextTransform() {
      // Customization: Ensure 1:1 scale without mirroring (Fixed: Text was flipped)
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  setCanvasDimensions(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.columns = Math.ceil(this.canvas.width / Char.width);
    
    // We need to re-apply transform because resizing clears the context state
    this.updateContextTransform();
  }

  run() {
    // Customization: Clear with White background instead of Black
    // Using a slight alpha here creates the trail effect (old frames fade out)
    // For white background, we need to paint "white" with some transparency over the old frame
    // to make the black text fade into white.
    this.ctx.fillStyle = colorToText(255, 255, 255, 0.4); 
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    let column: number;
    let available: boolean;
    
    for (let i = 0; i < this.flowRate; i++) {
      column = random(0, this.columns);
      available = true;
      for (let j = 0; j < this.strands.length; j++) {
        // Simple collision detection to prevent strands overlapping too much at the top
        if (this.strands[j].pos.x === column * Char.width && this.strands[j].pos.y <= this.canvas.height) {
          available = false;
        }
      }
      
      if (available) {
        this.strands.push(new Strand(
          column * Char.width,
          this.canvas,
          this.ctx,
          this.charList,
          (this.randomColors) ? { 
            red: random(0, 255),
            green: random(0, 255),
            blue: random(0, 255)
          } : this.color
        ));
      }
    }
    Entity.showAll(this.strands);
  }

  destroy() {
    if (this.intervalId) {
        clearInterval(this.intervalId);
    }
  }
}