let measuringContext: CanvasRenderingContext2D | null | undefined;

export function textWidth(text: string, size: number): number {
  if (measuringContext === undefined) {
    measuringContext = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  }
  if (!measuringContext) return Array.from(text).length * size * 0.55;
  measuringContext.font = `${size}px Arial`;
  return measuringContext.measureText(text).width;
}

export function wrapText(text: string, width: number, size: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && textWidth(candidate, size) > width) {
        lines.push(line);
        line = '';
      }
      if (textWidth(word, size) > width) {
        for (const character of word) {
          if (textWidth(line + character, size) > width && line) {
            lines.push(line);
            line = '';
          }
          line += character;
        }
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    lines.push(line);
  }
  return lines;
}
