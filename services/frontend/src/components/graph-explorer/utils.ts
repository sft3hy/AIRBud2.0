// Helper: Consistent Color Generator
export const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
};

// Helper: Text Wrapping
const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const words = text.split(" ");
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
};

// Canvas Drawing: Node
export const drawNode = (
  node: any,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  isHovered: boolean,
  docLookup: Map<number, string>,
  isDark: boolean,
) => {
  if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

  const label = node.id as string;
  const fontSize = 10 / globalScale; // Smaller font
  ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;

  // Text Wrapping Logic
  const maxTextWidth = 80 / globalScale; // Constrain width
  const lines = wrapText(ctx, label, maxTextWidth);

  const lineHeight = fontSize * 1.2;
  const totalTextHeight = lines.length * lineHeight;

  // Calculate radius based on wrapped text
  // Find widest line
  let maxLineWidth = 0;
  lines.forEach(line => {
    const w = ctx.measureText(line).width;
    if (w > maxLineWidth) maxLineWidth = w;
  });

  const padding = 8 / globalScale;
  const minRadius = 12 / globalScale; // Smaller minimum
  // Radius needs to fit the text box (pythagoras roughly or just max dimension)
  const contentRadius = Math.max(maxLineWidth / 2, totalTextHeight / 2) + padding;

  const baseRadius = Math.max(minRadius, contentRadius);
  const radius = isHovered ? baseRadius * 1.1 : baseRadius;

  let primaryColor = "#a855f7"; // Purple
  let secondaryColor = "#7c3aed"; // Violet

  const ids = node.doc_ids || [];
  const filenames = ids
    .map((id: number) => docLookup.get(id))
    .filter(Boolean) as string[];

  // Match logic with Legend styling
  if (filenames.length > 1) {
    primaryColor = isDark ? "#f8fafc" : "#475569"; // White/Slate for multi
    secondaryColor = isDark ? "#94a3b8" : "#64748b";
  } else if (filenames.length === 1) {
    const docColor = stringToColor(filenames[0] || "");
    primaryColor = docColor;
    secondaryColor = docColor;
  }

  // --- 1. Outer Glow (Neon) ---
  if (isHovered) {
    const gradient = ctx.createRadialGradient(
      node.x,
      node.y,
      radius,
      node.x,
      node.y,
      radius * 2.5,
    );
    gradient.addColorStop(0, "rgba(168, 85, 247, 0.6)"); // Purple glow
    gradient.addColorStop(1, "rgba(168, 85, 247, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius * 2.5, 0, 2 * Math.PI);
    ctx.fill();
  }

  // --- 2. Node Body (Glass Sphere) ---
  const gradientBg = ctx.createRadialGradient(
    node.x - radius / 3,
    node.y - radius / 3,
    radius / 4,
    node.x,
    node.y,
    radius,
  );

  if (isDark) {
    // Dark Mode: Dark center, colored rim
    gradientBg.addColorStop(0, "rgba(30, 41, 59, 0.9)"); // Slate-900 transparent
    gradientBg.addColorStop(1, "rgba(15, 23, 42, 0.95)"); // Slate-950 transparent
  } else {
    // Light Mode: Light center, colored rim
    gradientBg.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    gradientBg.addColorStop(1, "rgba(241, 245, 249, 0.95)"); // Slate-100
  }

  // Shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
  ctx.shadowBlur = 10 / globalScale;
  ctx.shadowOffsetY = 4 / globalScale;

  ctx.beginPath();
  ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = gradientBg;
  ctx.fill();

  // --- 3. Border (Neon Rim) ---
  const borderGradient = ctx.createLinearGradient(
    node.x - radius,
    node.y - radius,
    node.x + radius,
    node.y + radius,
  );
  borderGradient.addColorStop(0, primaryColor);
  borderGradient.addColorStop(1, secondaryColor);

  ctx.strokeStyle = borderGradient;
  ctx.lineWidth = (isHovered ? 3 : 2) / globalScale;
  ctx.stroke();

  // Reset Shadow
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // --- 4. Label Text (Inside Node, Wrapped) ---
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Text Color
  ctx.fillStyle = isDark ? "#ffffff" : "#0f172a";

  // Text Shadow/Glow for readability
  if (isDark) {
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 4;
  } else {
    ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
    ctx.shadowBlur = 2;
  }

  // Draw each line
  const startY = node.y - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, node.x, startY + i * lineHeight);
  });

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
};

// Canvas Drawing: Link Label
export const drawLink = (
  link: any,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  isHovered: boolean,
  isDark: boolean,
) => {
  if (!link.source.x || !link.target.x) return;

  const label = link.label;

  // Draw Line (if not handled by default, but we want custom color)
  // Note: ForceGraph2D draws the line automatically unless we override linkCanvasObject completely and don't call default.
  // But here we are just drawing the label ON TOP.
  // Wait, if we use linkCanvasObject, we are responsible for drawing the line too if we want custom visuals?
  // Actually, usually linkCanvasObject replaces the default drawing.
  // Let's draw the line explicitly to ensure visibility.

  const start = link.source;
  const end = link.target;

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);

  const linkColor = isDark ? "rgba(148, 163, 184, 0.6)" : "rgba(71, 85, 105, 0.6)"; // Slate-400 / Slate-600
  ctx.strokeStyle = linkColor;
  ctx.lineWidth = 1 / globalScale;
  ctx.stroke();

  if (!label) return;

  const textPos = {
    x: start.x + (end.x - start.x) / 2,
    y: start.y + (end.y - start.y) / 2,
  };

  const fontSize = 10 / globalScale;
  ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
  const textWidth = ctx.measureText(label).width;
  const padding = 6 / globalScale;
  const bckgWidth = textWidth + padding * 2;
  const bckgHeight = fontSize + padding;

  ctx.save();
  ctx.translate(textPos.x, textPos.y);

  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  let rotation = angle;
  if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
    rotation += Math.PI;
  }
  ctx.rotate(rotation);

  // Pill Background
  if (isHovered) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
    ctx.shadowBlur = 6 / globalScale;
    ctx.shadowOffsetY = 2 / globalScale;
  }

  if (isDark) {
    ctx.fillStyle = isHovered ? "rgba(30, 41, 59, 0.95)" : "rgba(15, 23, 42, 0.85)";
  } else {
    ctx.fillStyle = isHovered ? "rgba(255, 255, 255, 0.95)" : "rgba(248, 250, 252, 0.85)";
  }

  ctx.beginPath();
  ctx.roundRect(
    -bckgWidth / 2,
    -bckgHeight / 2,
    bckgWidth,
    bckgHeight,
    4 / globalScale,
  );
  ctx.fill();

  // Border
  ctx.strokeStyle = isDark ? "#475569" : "#cbd5e1";
  ctx.lineWidth = 1 / globalScale;
  ctx.stroke();

  ctx.shadowColor = "transparent";

  // Text
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = isDark ? "#e2e8f0" : "#475569";
  ctx.fillText(label, 0, 0);

  ctx.restore();
};