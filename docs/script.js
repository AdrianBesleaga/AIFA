const canvas = document.querySelector("#aifa-canvas");
const context = canvas.getContext("2d");
const systemMap = document.querySelector(".system-map");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let width = 0;
let height = 0;
let pixelRatio = 1;
let pointerX = 0;
let pointerY = 0;
let animationFrame = 0;

const nodes = [
  { x: 0.58, y: 0.43, radius: 5, color: "#66ffd2" },
  { x: 0.67, y: 0.58, radius: 7, color: "#f26b5b" },
  { x: 0.76, y: 0.41, radius: 5, color: "#66ffd2" },
  { x: 0.86, y: 0.55, radius: 6, color: "#e3ab2f" },
  { x: 0.72, y: 0.72, radius: 5, color: "#b28cff" },
  { x: 0.93, y: 0.27, radius: 5, color: "#66ffd2" },
];

const links = [
  [0, 1],
  [1, 2],
  [2, 5],
  [1, 4],
  [4, 3],
];

function resize() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function drawGrid(time) {
  const grid = 42;
  const drift = (time * 0.018) % grid;

  context.save();
  context.strokeStyle = "rgba(102, 255, 210, 0.07)";
  context.lineWidth = 1;

  for (let x = -grid + drift; x < width + grid; x += grid) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + width * 0.22, height);
    context.stroke();
  }

  for (let y = -grid + drift; y < height + grid; y += grid) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y + height * 0.08);
    context.stroke();
  }

  context.restore();
}

function nodePosition(node) {
  return {
    x: node.x * width + pointerX * 14,
    y: node.y * height + pointerY * 10,
  };
}

function drawLinks(time) {
  links.forEach(([fromIndex, toIndex], index) => {
    const from = nodePosition(nodes[fromIndex]);
    const to = nodePosition(nodes[toIndex]);
    const pulse = (Math.sin(time * 0.004 + index * 1.7) + 1) / 2;
    const glowX = from.x + (to.x - from.x) * pulse;
    const glowY = from.y + (to.y - from.y) * pulse;

    const gradient = context.createLinearGradient(from.x, from.y, to.x, to.y);
    gradient.addColorStop(0, "rgba(102, 255, 210, 0.08)");
    gradient.addColorStop(0.5, "rgba(102, 255, 210, 0.72)");
    gradient.addColorStop(1, "rgba(242, 107, 91, 0.38)");

    context.save();
    context.strokeStyle = gradient;
    context.lineWidth = 2;
    context.shadowColor = "rgba(102, 255, 210, 0.45)";
    context.shadowBlur = 16;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();

    context.fillStyle = nodes[toIndex].color;
    context.shadowBlur = 24;
    context.beginPath();
    context.arc(glowX, glowY, 4 + pulse * 3, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });
}

function drawNodes(time) {
  nodes.forEach((node, index) => {
    const position = nodePosition(node);
    const pulse = Math.sin(time * 0.003 + index) * 0.5 + 0.5;

    context.save();
    context.fillStyle = node.color;
    context.shadowColor = node.color;
    context.shadowBlur = 28;
    context.beginPath();
    context.arc(position.x, position.y, node.radius + pulse * 2.4, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });
}

function draw(time = 0) {
  context.clearRect(0, 0, width, height);
  drawGrid(time);
  drawLinks(time);
  drawNodes(time);

  if (!prefersReducedMotion.matches) {
    animationFrame = requestAnimationFrame(draw);
  }
}

function start() {
  resize();
  cancelAnimationFrame(animationFrame);
  draw();
}

window.addEventListener("resize", start);
window.addEventListener("pointermove", (event) => {
  pointerX = event.clientX / window.innerWidth - 0.5;
  pointerY = event.clientY / window.innerHeight - 0.5;

  if (systemMap) {
    systemMap.style.setProperty("--map-x", `${pointerX * -10}px`);
    systemMap.style.setProperty("--map-y", `${pointerY * -8}px`);
  }
});

start();
