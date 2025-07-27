// Canvas context for text measurement (reused for performance)
let measureCanvas: HTMLCanvasElement | null = null;
let measureContext: CanvasRenderingContext2D | null = null;

// Initialize measurement canvas
function initializeMeasurementCanvas() {
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas');
    measureContext = measureCanvas.getContext('2d');
  }
  return measureContext;
}

// Measure text width in pixels with specific font properties
export function measureTextWidth(
  text: string, 
  fontSize: string = '14px', 
  fontFamily: string = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  fontWeight: string = 'normal'
): number {
  const context = initializeMeasurementCanvas();
  if (!context) return text.length * 8; // Fallback estimation
  
  context.font = `${fontWeight} ${fontSize} ${fontFamily}`;
  return context.measureText(text).width;
}

// Truncate text to fit within a specific pixel width
export function truncateTextToWidth(
  text: string,
  maxWidth: number,
  fontSize: string = '14px',
  fontFamily: string = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  fontWeight: string = 'normal',
  ellipsis: string = '...'
): string {
  const fullTextWidth = measureTextWidth(text, fontSize, fontFamily, fontWeight);
  
  // If text fits, return as is
  if (fullTextWidth <= maxWidth) {
    return text;
  }
  
  const ellipsisWidth = measureTextWidth(ellipsis, fontSize, fontFamily, fontWeight);
  const availableWidth = maxWidth - ellipsisWidth;
  
  // Binary search to find the longest text that fits
  let left = 0;
  let right = text.length;
  let bestFit = '';
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const substring = text.substring(0, mid);
    const substringWidth = measureTextWidth(substring, fontSize, fontFamily, fontWeight);
    
    if (substringWidth <= availableWidth) {
      bestFit = substring;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return bestFit + ellipsis;
}

// Check if text needs truncation
export function shouldTruncateText(
  text: string,
  maxWidth: number,
  fontSize: string = '14px',
  fontFamily: string = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  fontWeight: string = 'normal'
): boolean {
  const textWidth = measureTextWidth(text, fontSize, fontFamily, fontWeight);
  return textWidth > maxWidth;
}

// Hook for dynamic truncation that can be used in React components
export function useDynamicTruncation() {
  return {
    measureTextWidth,
    truncateTextToWidth,
    shouldTruncateText
  };
}