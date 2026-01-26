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
  const lines: string[] = [];
  let currentLine = words[0] || "";

  for (let i = 1; i < words.length; i++) {
    const word = words[i] || "";
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

  const label = (node.id || "") as string;
  const fontSize = 10 / globalScale;
  ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;

  /* Optimization: Re-enabled wrap text but larger width for larger nodes */
  const maxTextWidth = 140 / globalScale; // Increased width
  const lines = wrapText(ctx, label, maxTextWidth);
  const lineHeight = fontSize * 1.2;
  // const totalTextHeight = lines.length * lineHeight;

  // Calculate radius
  // Fixed size regardless of text content
  const baseRadius = 40 / globalScale; // Increased from 20 to 40
  const radius = isHovered ? baseRadius * 1.1 : baseRadius;

  // Determine Colors
  // let primaryColor = "#a855f7"; // Removed unused
  let secondaryColor = "#7c3aed"; // Violet (Border)

  const ids = node.doc_ids || [];
  const filenames = ids
    .map((id: number) => docLookup.get(id))
    .filter(Boolean) as string[];

  if (filenames.length > 1) {
    // primaryColor = isDark ? "#1e293b" : "#f1f5f9"; 
    secondaryColor = isDark ? "#94a3b8" : "#64748b";
  } else if (filenames.length === 1) {
    const docColor = stringToColor(filenames[0] || "");
    // primaryColor = docColor;
    secondaryColor = docColor;
  }

  // --- Optimization: SOLID COLORS ONLY (No Gradients, No Glows) ---

  // 1. Draw Body
  ctx.beginPath();
  ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);

  if (filenames.length === 1) {
    // Tinted body for single source
    ctx.fillStyle = isDark ? secondaryColor : secondaryColor; // Simplified
    // If we want it strictly low memory, avoiding too many color calcs is good.
    // But fillStyle string parsing is fine.
  } else {
    ctx.fillStyle = isDark ? "#1e293b" : "#f8fafc";
  }

  // Override for standard single-color look if needed, but let's stick to the color coding
  // Just ensure we don't use createRadialGradient
  ctx.fill();

  // 2. Draw Border
  ctx.beginPath();
  ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
  ctx.lineWidth = (isHovered ? 3 : 2) / globalScale;
  ctx.strokeStyle = secondaryColor;
  ctx.stroke();

  // 3. Label
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Select text color based on background logic
  // If single file, we used the doc color as background. We might need white text.
  // If multi file, we used slate background.
  if (filenames.length === 1) {
    // For random colors, white text is usually safe if colors are darkish.
    // If colors can be light, we have a problem.
    // Let's assume standard UI colors.
    ctx.fillStyle = "#ffffff";
  } else {
    ctx.fillStyle = isDark ? "#ffffff" : "#0f172a";
  }

  const startY = node.y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, node.x, startY + i * lineHeight);
  });
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

  const start = link.source;
  const end = link.target;

  // Draw Line
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);

  const linkColor = isDark ? "rgba(148, 163, 184, 0.4)" : "rgba(71, 85, 105, 0.4)";
  ctx.strokeStyle = linkColor;
  ctx.lineWidth = 1 / globalScale;
  ctx.stroke();

  if (!label) return;

  // Label Optimization: Only draw if close enough or hovered to avoid thousands of text calls?
  // For now, let's just simplify the drawing.

  const textPos = {
    x: start.x + (end.x - start.x) / 2,
    y: start.y + (end.y - start.y) / 2,
  };

  const fontSize = 10 / globalScale;
  ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
  const textWidth = ctx.measureText(label || "").width;
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

  // Background - Solid w/o shadow
  if (isDark) {
    ctx.fillStyle = isHovered ? "rgba(30, 41, 59, 1)" : "rgba(15, 23, 42, 0.9)";
  } else {
    ctx.fillStyle = isHovered ? "rgba(255, 255, 255, 1)" : "rgba(248, 250, 252, 0.9)";
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

  // Border - Solid
  ctx.strokeStyle = isDark ? "#475569" : "#cbd5e1";
  ctx.lineWidth = 1 / globalScale;
  ctx.stroke();

  // Text
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = isDark ? "#e2e8f0" : "#475569";
  ctx.fillText(label, 0, 0);

  ctx.restore();
};