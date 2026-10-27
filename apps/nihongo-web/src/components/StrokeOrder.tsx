'use client';

import { useEffect, useRef } from 'react';
import { kanjivgStrokeFetchUrls } from '@edu/vocab-images';
import { getStrokeText } from '../utils/japanese';
import { getStrokeThemeColors, strokeWidthForSize } from '../utils/stroke-order-theme';

function extractSvgMarkup(svgText: string): string {
  const start = svgText.indexOf('<svg');
  if (start === -1) return svgText;
  const end = svgText.lastIndexOf('</svg>');
  if (end === -1) return svgText.slice(start);
  return svgText.slice(start, end + '</svg>'.length);
}

async function fetchStrokeSvg(char: string): Promise<string> {
  const urls = kanjivgStrokeFetchUrls(char);

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.text();
    } catch {
      /* thử URL tiếp theo */
    }
  }

  throw new Error(`SVG not found for ${char}`);
}

function styleGuidePaths(paths: SVGPathElement[], color: string, width: number): void {
  paths.forEach((path) => {
    path.style.stroke = color;
    path.style.strokeWidth = `${width}`;
    path.style.fill = 'none';
    path.style.strokeLinecap = 'round';
    path.style.strokeLinejoin = 'round';
  });
}

/** Dải màu trên thẻ học: đỏ ở đầu nét, cam giữa, tím–xanh ở cuối — như mẫu. */
const RAINBOW_STOPS: { offset: string; color: string }[] = [
  { offset: '0%', color: '#e23b4a' },
  { offset: '38%', color: '#f08a32' },
  { offset: '70%', color: '#7a4de0' },
  { offset: '100%', color: '#4f6fe8' },
];

function applyRainbowStroke(svgEl: SVGSVGElement, paths: SVGPathElement[], width: number): void {
  const ns = 'http://www.w3.org/2000/svg';
  const gradId = `stroke-rainbow-${Math.random().toString(36).slice(2, 8)}`;
  let defs = svgEl.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS(ns, 'defs');
    svgEl.insertBefore(defs, svgEl.firstChild);
  }
  const grad = document.createElementNS(ns, 'linearGradient');
  grad.setAttribute('id', gradId);
  grad.setAttribute('gradientUnits', 'userSpaceOnUse');
  grad.setAttribute('x1', '16');
  grad.setAttribute('y1', '8');
  grad.setAttribute('x2', '98');
  grad.setAttribute('y2', '102');
  RAINBOW_STOPS.forEach((stop) => {
    const el = document.createElementNS(ns, 'stop');
    el.setAttribute('offset', stop.offset);
    el.setAttribute('stop-color', stop.color);
    grad.appendChild(el);
  });
  defs.appendChild(grad);

  paths.forEach((path) => {
    path.style.stroke = `url(#${gradId})`;
    path.style.strokeWidth = `${width}`;
    path.style.fill = 'none';
    path.style.strokeLinecap = 'round';
    path.style.strokeLinejoin = 'round';
  });
}

function mountKanjiVgSvg(
  charDiv: HTMLDivElement,
  char: string,
  svgText: string,
  width: number,
  height: number,
  onCharClick?: (char: string) => void,
  rainbow = false,
) {
  const colors = getStrokeThemeColors();
  const strokeWidth = rainbow ? 3.6 : strokeWidthForSize(Math.min(width, height));

  const svgWrapper = document.createElement('div');
  svgWrapper.className = 'stroke-order-char';
  svgWrapper.innerHTML = extractSvgMarkup(svgText);
  svgWrapper.style.width = `${width}px`;
  svgWrapper.style.height = `${height}px`;
  svgWrapper.style.position = 'relative';

  const svgEl = svgWrapper.querySelector('svg');
  if (!svgEl) {
    charDiv.textContent = char;
    charDiv.style.fontSize = `${Math.round(Math.min(width, height) * 0.55)}px`;
    charDiv.style.fontFamily = 'var(--font-jp)';
    charDiv.style.color = colors.fallback;
    return;
  }

  svgEl.style.width = '100%';
  svgEl.style.height = '100%';
  svgEl.style.display = 'block';

  const pathsGroup = svgEl.querySelector('[id*="StrokePaths"]');
  const numbersGroup = svgEl.querySelector('[id*="StrokeNumbers"]');

  if (!pathsGroup) {
    styleGuidePaths(Array.from(svgEl.querySelectorAll('path')), colors.guide, strokeWidth);
    charDiv.style.cursor = 'pointer';
    charDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      onCharClick?.(char);
    });
    charDiv.appendChild(svgWrapper);
    return;
  }

  const bgPaths = Array.from(pathsGroup.querySelectorAll('path'));
  if (rainbow) {
    applyRainbowStroke(svgEl, bgPaths, strokeWidth);
  } else {
    styleGuidePaths(bgPaths, colors.guide, strokeWidth);
  }

  const fgPathsGroup = pathsGroup.cloneNode(true) as Element;
  const fgPaths = Array.from(fgPathsGroup.querySelectorAll('path'));
  const drawColor = rainbow ? `url(#${svgEl.querySelector('linearGradient')?.id ?? ''})` : colors.active;

  fgPaths.forEach((path) => {
    path.style.stroke = drawColor;
    path.style.strokeWidth = `${strokeWidth}`;
    path.style.fill = 'none';
    path.style.strokeLinecap = 'round';
    path.style.strokeLinejoin = 'round';

    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length + 1}`;
    path.style.strokeDashoffset = rainbow ? '0' : `${length + 1}`;
  });

  svgEl.appendChild(fgPathsGroup);
  if (rainbow) {
    bgPaths.forEach((path) => { path.style.stroke = 'none'; });
    numbersGroup?.remove();
  } else if (numbersGroup) {
    svgEl.appendChild(numbersGroup);
    Array.from(numbersGroup.querySelectorAll('text')).forEach((el) => {
      const textEl = el as SVGTextElement;
      textEl.style.fill = colors.number;
      textEl.style.fontWeight = '700';
    });
  }

  const animateStrokes = () => {
    fgPaths.forEach((path) => {
      path.style.transition = 'none';
      const length = path.getTotalLength();
      path.style.strokeDashoffset = `${length + 1}`;
    });

    svgEl.getBoundingClientRect();

    let delay = 0.35;
    fgPaths.forEach((path) => {
      path.style.transition = `stroke-dashoffset 0.55s ease-in-out ${delay}s`;
      path.style.strokeDashoffset = '0';
      delay += 0.7;
    });
  };

  charDiv.className = 'stroke-order-char-host';
  charDiv.style.cursor = 'pointer';
  charDiv.addEventListener('click', (e) => {
    e.stopPropagation();
    animateStrokes();
    onCharClick?.(char);
  });

  charDiv.appendChild(svgWrapper);
  if (!rainbow) setTimeout(animateStrokes, 80);
}

interface Props {
  text: string;
  width?: number;
  height?: number;
  compact?: boolean;
  /** Thẻ học: nét nhiều màu, không mũi tên và không số thứ tự. */
  rainbow?: boolean;
  onCharClick?: (char: string, index: number) => void;
}

export default function StrokeOrder({
  text,
  width,
  height,
  compact = false,
  rainbow = false,
  onCharClick,
}: Props) {
  const resolvedWidth = width ?? (compact ? 96 : 200);
  const resolvedHeight = height ?? (compact ? 96 : 200);
  const containerRef = useRef<HTMLDivElement>(null);
  const onCharClickRef = useRef(onCharClick);
  onCharClickRef.current = onCharClick;
  const writableText = getStrokeText(text);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    if (!writableText) {
      containerRef.current.innerHTML =
        '<p class="stroke-empty">Không có hướng dẫn viết cho mục này.</p>';
      return;
    }

    const chars = [...writableText];

    chars.forEach((char, index) => {
      const charDiv = document.createElement('div');
      charDiv.style.display = 'inline-block';
      charDiv.style.margin = compact ? '0 4px' : '0 6px';
      containerRef.current?.appendChild(charDiv);

      const handleCharClick = () => onCharClickRef.current?.(char, index);

      fetchStrokeSvg(char)
        .then((svgText) =>
          mountKanjiVgSvg(
            charDiv,
            char,
            svgText,
            resolvedWidth,
            resolvedHeight,
            handleCharClick,
            rainbow,
          ),
        )
        .catch(() => {
          const colors = getStrokeThemeColors();
          charDiv.textContent = char;
          charDiv.style.fontSize = `${Math.round(Math.min(resolvedWidth, resolvedHeight) * 0.55)}px`;
          charDiv.style.fontFamily = 'var(--font-jp)';
          charDiv.style.color = colors.fallback;
          charDiv.style.cursor = 'pointer';
          charDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            handleCharClick();
          });
        });
    });
  }, [writableText, resolvedWidth, resolvedHeight, compact, rainbow]);

  return (
    <div className={`stroke-order-wrapper${compact ? ' stroke-order-wrapper--compact' : ''}`}>
      <div
        ref={containerRef}
        className="stroke-order-container"
        title="Nhấn vào chữ để xem lại nét vẽ"
      />
      {writableText && !compact && (
        <p className="stroke-hint">(Nhấn vào chữ để xem lại)</p>
      )}
    </div>
  );
}
