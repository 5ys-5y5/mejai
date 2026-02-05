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
    if (!this.update()) return false;
    this.draw();
    return true;
  }
}

class Char extends Entity {
  static size = 10;
  static width = 10;
  static height = 10;

  charList: string[];
  color: Color;
  headColor: Color;
  head: boolean;
  alpha: number;
  val = "";

  constructor(
    x: number,
    y: number,
    ctx: CanvasRenderingContext2D,
    charList: string[],
    color: Color,
    headColor: Color
  ) {
    super(x, y, ctx);
    this.charList = charList;
    this.color = color;
    this.headColor = headColor;
    this.head = true;
    this.alpha = 1;
    this.randomizeCharVal();
  }

  randomizeCharVal() {
    this.val = this.charList[random(0, this.charList.length - 1)];
  }

  update(): boolean {
    if (random(0, 100) < 5) this.randomizeCharVal();
    this.alpha *= 0.95;
    return this.alpha >= 0.01;
  }

  draw() {
    this.ctx.font = `light ${Char.size}px "Apple SD Gothic Neo"`;
    if (!this.head) {
      this.ctx.fillStyle = colorToText(this.color.red, this.color.green, this.color.blue, this.alpha);
    } else {
      this.ctx.fillStyle = colorToText(this.headColor.red, this.headColor.green, this.headColor.blue, 1);
      this.head = false;
    }
    this.ctx.fillText(this.val, this.pos.x, this.pos.y);
  }
}

class Strand extends Entity {
  canvas: HTMLCanvasElement;
  charList: string[];
  color: Color;
  headColor: Color;
  chars: Char[];

  constructor(
    x: number,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    charList: string[],
    color: Color,
    headColor: Color
  ) {
    super(x, Char.height, ctx);
    this.canvas = canvas;
    this.charList = charList;
    this.color = color;
    this.headColor = headColor;
    this.chars = [];
  }

  update(): boolean {
    if (this.chars.length < 1 || this.chars[this.chars.length - 1].pos.y < this.canvas.height * 2) {
      this.chars.push(new Char(this.pos.x, this.pos.y, this.ctx, this.charList, this.color, this.headColor));
      this.pos.y += Char.height;
      return true;
    }
    return false;
  }

  draw() {
    Entity.showAll(this.chars);
  }
}

export class MatrixRain {
  canvas: HTMLCanvasElement;
  charList: string[];
  color: Color;
  headColor: Color;
  randomColors: boolean;
  flowRate: number;
  ctx: CanvasRenderingContext2D;
  columns = 0;
  strands: Strand[] = [];
  intervalId: number | null = null;

  constructor(
    element: HTMLCanvasElement,
    width: number,
    height: number,
    charList: string[],
    tailRed: number,
    tailGreen: number,
    tailBlue: number,
    headRed: number,
    headGreen: number,
    headBlue: number,
    randomColors: boolean,
    flowRate: number,
    fps: number,
  ) {
    this.canvas = element;
    this.charList = charList;
    this.color = { red: tailRed, green: tailGreen, blue: tailBlue };
    this.headColor = { red: headRed, green: headGreen, blue: headBlue };
    this.randomColors = randomColors;
    this.flowRate = flowRate;

    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("Could not get 2d context");
    this.ctx = context;

    this.setCanvasDimensions(width, height);
    this.updateContextTransform();

    this.intervalId = window.setInterval(() => {
      this.run();
    }, 1000 / fps);
  }

  updateContextTransform() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  setCanvasDimensions(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.columns = Math.ceil(this.canvas.width / Char.width);
    this.updateContextTransform();
  }

  run() {
    this.ctx.save();
    this.ctx.globalCompositeOperation = "destination-out";
    this.ctx.fillStyle = colorToText(0, 0, 0, 0.08);
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    for (let i = 0; i < this.flowRate; i++) {
      const column = random(0, this.columns);
      let available = true;
      for (let j = 0; j < this.strands.length; j++) {
        if (this.strands[j].pos.x === column * Char.width && this.strands[j].pos.y <= this.canvas.height) {
          available = false;
        }
      }

      if (available) {
        const tailColor = this.randomColors
          ? { red: random(0, 255), green: random(0, 255), blue: random(0, 255) }
          : this.color;
        this.strands.push(
          new Strand(
            column * Char.width,
            this.canvas,
            this.ctx,
            this.charList,
            tailColor,
            this.headColor
          ),
        );
      }
    }
    Entity.showAll(this.strands);
  }

  setColors(headColor: Color, tailColor: Color) {
    this.headColor = headColor;
    this.color = tailColor;
    for (const strand of this.strands) {
      strand.color = tailColor;
      strand.headColor = headColor;
      for (const ch of strand.chars) {
        ch.color = tailColor;
        ch.headColor = headColor;
      }
    }
  }

  destroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}
