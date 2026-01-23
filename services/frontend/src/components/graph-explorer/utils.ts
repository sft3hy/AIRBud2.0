// Helper: Consistent Color Generator
export const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
};

// Canvas Drawing: Node
export const drawNode = (
  node: any,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  isHovered: boolean,
  docLookup: Map<number, string>
) => {
  if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

  const label = node.id as string;
  const fontSize = 11 / globalScale;
  const baseRadius = 6;
  const radius = isHovered ? baseRadius * 1.2 : baseRadius;

  let primaryColor = "#a855f7";
  let secondaryColor = "#9333ea";

  const ids = node.doc_ids || [];
  const filenames = ids
    .map((id: number) => docLookup.get(id))
    .filter(Boolean) as string[];

  // Match logic with Legend styling
  if (filenames.length > 1) {
    primaryColor = "#f8fafc";
    secondaryColor = "#cbd5e1";
  } else if (filenames.length === 1) {
    const docColor = stringToColor(filenames[0]);
    primaryColor = docColor;
    secondaryColor = docColor;
  }

  ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
  const textWidth = ctx.measureText(label).width;
  const padding = 8 / globalScale;
  const bubbleWidth = textWidth + padding * 2;
  const bubbleHeight = fontSize + padding * 1.3;

  // Glow effect on hover
  if (isHovered) {
    const gradient = ctx.createRadialGradient(
      node.x,
      node.y,
      0,
      node.x,
      node.y,
      radius * 3
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.6)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius * 3, 0, 2 * Math.PI);
    ctx.fill();
  }

  const gradientBg = ctx.createLinearGradient(
    node.x - bubbleWidth / 2,
    node.y - bubbleHeight / 2,
    node.x + bubbleWidth / 2,
    node.y + bubbleHeight / 2
  );
  gradientBg.addColorStop(0, primaryColor);
  gradientBg.addColorStop(1, secondaryColor);

  if (isHovered) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
    ctx.shadowBlur = 10 / globalScale;
    ctx.shadowOffsetY = 3 / globalScale;
  }

  const cornerRadius = 5 / globalScale;
  ctx.beginPath();
  ctx.roundRect(
    node.x - bubbleWidth / 2,
    node.y - bubbleHeight / 2,
    bubbleWidth,
    bubbleHeight,
    cornerRadius
  );
  ctx.fillStyle = gradientBg;
  ctx.fill();

  ctx.strokeStyle = isHovered
    ? "rgba(255, 255, 255, 0.8)"
    : "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 1.5 / globalScale;
  ctx.stroke();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = filenames.length > 1 ? "#0f172a" : "#ffffff";

  if (filenames.length === 1) {
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 2;
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, node.x, node.y);
  ctx.shadowColor = "transparent";
};

// Canvas Drawing: Link Label
export const drawLink = (
  link: any,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  isHovered: boolean
) => {
  if (!link.source.x || !link.target.x) return;

  const label = link.label;
  if (!label) return;

  const start = link.source;
  const end = link.target;

  const textPos = {
    x: start.x + (end.x - start.x) / 2,
    y: start.y + (end.y - start.y) / 2,
  };

  const fontSize = 9 / globalScale;
  ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
  const textWidth = ctx.measureText(label).width;
  const padding = 6 / globalScale;
  const bckgWidth = textWidth + padding * 2;
  const bckgHeight = fontSize + padding * 1.1;

  ctx.save();
  ctx.translate(textPos.x, textPos.y);

  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  let rotation = angle;
  if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
    rotation += Math.PI;
  }
  ctx.rotate(rotation);

  if (isHovered) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
    ctx.shadowBlur = 8 / globalScale;
    ctx.shadowOffsetY = 2 / globalScale;
  }

  const gradient = ctx.createLinearGradient(
    -bckgWidth / 2,
    -bckgHeight / 2,
    bckgWidth / 2,
    bckgHeight / 2
  );
  gradient.addColorStop(0, isHovered ? "#f8fafc" : "#ffffff");
  gradient.addColorStop(1, isHovered ? "#e2e8f0" : "#f8fafc");

  ctx.beginPath();
  ctx.roundRect(
    -bckgWidth / 2,
    -bckgHeight / 2,
    bckgWidth,
    bckgHeight,
    4 / globalScale
  );
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = isHovered ? "#94a3b8" : "#cbd5e1";
  ctx.lineWidth = (isHovered ? 2 : 1) / globalScale;
  ctx.stroke();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = isHovered ? "#1e293b" : "#475569";
  ctx.fillText(label, 0, 0);

  ctx.restore();
};