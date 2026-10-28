import { useEffect, useRef, useState, type FC } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  FileText,
  Trash2,
  Eye,
  Edit3,
  Check,
  Undo2,
  Redo2,
} from 'lucide-react';

export type QuotationTextRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
};

export type QuotationBlock = {
  runs: QuotationTextRun[];
  heading?: boolean;
  headingLevel?: 1 | 2 | 3 | 4 | 5;
  bullet?: boolean;
};

export interface QuotationDetailsEditorProps {
  value: QuotationBlock[];
  onChange: (blocks: QuotationBlock[]) => void;
  className?: string;
  placeholder?: string;
}

type ActiveFormats = {
  block: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'p';
  bold: boolean;
  italic: boolean;
  underline: boolean;
  list: boolean;
  fontSize: number | null;
};

const DEFAULT_FORMATS: ActiveFormats = {
  block: 'p',
  bold: false,
  italic: false,
  underline: false,
  list: false,
  fontSize: null,
};

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32];

const headingClassNames: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'text-2xl',
  2: 'text-xl',
  3: 'text-lg',
  4: 'text-base',
  5: 'text-sm',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function quotationBlocksToHtml(blocks: QuotationBlock[]): string {
  if (!blocks || blocks.length === 0) return '';
  let html = '';
  let inList = false;

  for (const block of blocks) {
    if (block.bullet) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += '<li>';
      for (const run of block.runs || []) {
        let runHtml = escapeHtml(run.text || '');
        if (run.bold) runHtml = `<strong>${runHtml}</strong>`;
        if (run.italic) runHtml = `<em>${runHtml}</em>`;
        if (run.underline) runHtml = `<u>${runHtml}</u>`;
        if (run.fontSize) runHtml = `<span style="font-size:${run.fontSize}px">${runHtml}</span>`;
        html += runHtml;
      }
      html += '</li>';
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      const headingLevel = Math.min(5, Math.max(1, block.headingLevel ?? 2));
      const tag = block.heading ? `h${headingLevel}` : 'p';
      html += `<${tag}>`;
      for (const run of block.runs || []) {
        let runHtml = escapeHtml(run.text || '');
        if (run.bold) runHtml = `<strong>${runHtml}</strong>`;
        if (run.italic) runHtml = `<em>${runHtml}</em>`;
        if (run.underline) runHtml = `<u>${runHtml}</u>`;
        if (run.fontSize) runHtml = `<span style="font-size:${run.fontSize}px">${runHtml}</span>`;
        html += runHtml;
      }
      html += `</${tag}>`;
    }
  }
  if (inList) {
    html += '</ul>';
  }
  return html;
}

export function htmlToQuotationBlocks(container: HTMLElement): QuotationBlock[] {
  const blocks: QuotationBlock[] = [];

  function processTextAndInline(node: Node, block: QuotationBlock) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (!text) return;

      let bold = false;
      let italic = false;
      let underline = false;
      let fontSize: number | undefined;
      let parent = node.parentElement;

      while (parent && parent !== container) {
        const tag = parent.tagName.toLowerCase();
        if (
          tag === 'b' ||
          tag === 'strong' ||
          parent.style.fontWeight === 'bold' ||
          parseInt(parent.style.fontWeight, 10) >= 600
        ) {
          bold = true;
        }
        if (tag === 'i' || tag === 'em' || parent.style.fontStyle === 'italic') {
          italic = true;
        }
        if (tag === 'u' || (parent.style.textDecoration && parent.style.textDecoration.includes('underline'))) {
          underline = true;
        }
        const inlineSize = Number.parseFloat(parent.style.fontSize);
        if (Number.isFinite(inlineSize)) fontSize = Math.round(inlineSize);
        parent = parent.parentElement;
      }

      block.runs.push({
        text,
        ...(bold ? { bold: true } : {}),
        ...(italic ? { italic: true } : {}),
        ...(underline ? { underline: true } : {}),
        ...(fontSize ? { fontSize } : {}),
      });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (tag === 'br') {
        block.runs.push({ text: '\n' });
      } else {
        for (const child of Array.from(el.childNodes)) {
          processTextAndInline(child, block);
        }
      }
    }
  }

  const allBlocks = container.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, div');

  if (allBlocks.length === 0) {
    const singleBlock: QuotationBlock = { runs: [] };
    for (const child of Array.from(container.childNodes)) {
      processTextAndInline(child, singleBlock);
    }
    if (singleBlock.runs.length > 0 && singleBlock.runs.some(r => r.text.trim())) {
      blocks.push(singleBlock);
    }
  } else {
    const topBlocks: HTMLElement[] = [];
    allBlocks.forEach((node) => {
      const el = node as HTMLElement;
      let isNestedInBlock = false;
      let p = el.parentElement;
      while (p && p !== container) {
        const pTag = p.tagName.toLowerCase();
        if (/^h[1-6]$/.test(pTag) || pTag === 'p' || pTag === 'li') {
          isNestedInBlock = true;
          break;
        }
        p = p.parentElement;
      }
      if (!isNestedInBlock) {
        topBlocks.push(el);
      }
    });

    for (const el of topBlocks) {
      const tag = el.tagName.toLowerCase();
      const isHeading = /^h[1-6]$/.test(tag);
      const isBullet = tag === 'li';
      const block: QuotationBlock = {
        ...(isHeading ? { heading: true } : {}),
        ...(isHeading ? { headingLevel: Math.min(5, Math.max(1, Number(tag.slice(1)))) as 1 | 2 | 3 | 4 | 5 } : {}),
        ...(isBullet ? { bullet: true } : {}),
        runs: [],
      };
      for (const child of Array.from(el.childNodes)) {
        processTextAndInline(child, block);
      }
      if (block.runs.length > 0 && block.runs.some(r => r.text.trim())) {
        blocks.push(block);
      }
    }
  }

  return blocks;
}

export const QuotationDetailsPreview: FC<{ blocks: QuotationBlock[]; className?: string }> = ({
  blocks,
  className = '',
}) => {
  if (!blocks || blocks.length === 0) {
    return <p className="text-xs italic text-gray-400">No quotation details specified.</p>;
  }

  const elements: JSX.Element[] = [];
  let currentBullets: QuotationBlock[] = [];

  const flushBullets = (keyIdx: number) => {
    if (currentBullets.length === 0) return;
    elements.push(
      <ul key={`ul-${keyIdx}`} className="my-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
        {currentBullets.map((b, bIdx) => (
          <li key={bIdx} className="leading-relaxed">
            {(b.runs || []).map((r, rIdx) => {
              let textEl: JSX.Element = <span key={rIdx} style={r.fontSize ? { fontSize: `${r.fontSize}px` } : undefined}>{r.text}</span>;
              if (r.underline) textEl = <u key={rIdx}>{textEl}</u>;
              if (r.italic) textEl = <em key={rIdx}>{textEl}</em>;
              if (r.bold) textEl = <strong key={rIdx} className="font-semibold text-gray-900">{textEl}</strong>;
              return textEl;
            })}
          </li>
        ))}
      </ul>
    );
    currentBullets = [];
  };

  blocks.forEach((block, idx) => {
    if (block.bullet) {
      currentBullets.push(block);
    } else {
      flushBullets(idx);
      if (block.heading) {
        const headingLevel = Math.min(5, Math.max(1, block.headingLevel ?? 2)) as 1 | 2 | 3 | 4 | 5;
        elements.push(
          <div
            key={`h-${idx}`}
            role="heading"
            aria-level={headingLevel}
            className={`${headingClassNames[headingLevel]} mt-4 mb-2 font-bold text-sky-950 first:mt-0 tracking-tight`}
          >
            {(block.runs || []).map((r, rIdx) => {
              let textEl: JSX.Element = <span key={rIdx} style={r.fontSize ? { fontSize: `${r.fontSize}px` } : undefined}>{r.text}</span>;
              if (r.underline) textEl = <u key={rIdx}>{textEl}</u>;
              if (r.italic) textEl = <em key={rIdx}>{textEl}</em>;
              if (r.bold) textEl = <strong key={rIdx}>{textEl}</strong>;
              return textEl;
            })}
          </div>
        );
      } else {
        elements.push(
          <p key={`p-${idx}`} className="my-2 text-sm leading-relaxed text-gray-700">
            {(block.runs || []).map((r, rIdx) => {
              let textEl: JSX.Element = <span key={rIdx} style={r.fontSize ? { fontSize: `${r.fontSize}px` } : undefined}>{r.text}</span>;
              if (r.underline) textEl = <u key={rIdx}>{textEl}</u>;
              if (r.italic) textEl = <em key={rIdx}>{textEl}</em>;
              if (r.bold) textEl = <strong key={rIdx} className="font-semibold text-gray-900">{textEl}</strong>;
              return textEl;
            })}
          </p>
        );
      }
    }
  });

  flushBullets(blocks.length);

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
};

export function QuotationDetailsEditor({
  value,
  onChange,
  className = '',
  placeholder = 'Write custom quotation specifications, scope of work, warranty details, and payment terms...',
}: QuotationDetailsEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [isSaved, setIsSaved] = useState(false);
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>(DEFAULT_FORMATS);
  const lastHtmlRef = useRef('');
  const isComposingRef = useRef(false);
  const savedSelectionRef = useRef<Range | null>(null);

  useEffect(() => {
    if (viewMode !== 'edit') return;
    const nextHtml = quotationBlocksToHtml(value);
    if (
      editorRef.current &&
      document.activeElement !== editorRef.current &&
      editorRef.current.innerHTML !== nextHtml
    ) {
      editorRef.current.innerHTML = nextHtml;
      lastHtmlRef.current = nextHtml;
    }
  }, [value, viewMode]);

  const rememberSelection = () => {
    const selection = window.getSelection();
    if (!editorRef.current || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      savedSelectionRef.current = range.cloneRange();
      const rawBlock = String(document.queryCommandValue('formatBlock') || '').toLowerCase();
      const blockMatch = rawBlock.match(/h([1-5])/);
      let selectedFontSize: number | null = null;
      let selectionElement = selection.focusNode instanceof HTMLElement
        ? selection.focusNode
        : selection.focusNode?.parentElement;
      while (selectionElement && selectionElement !== editorRef.current) {
        const inlineSize = Number.parseFloat(selectionElement.style.fontSize);
        if (Number.isFinite(inlineSize)) {
          selectedFontSize = Math.round(inlineSize);
          break;
        }
        selectionElement = selectionElement.parentElement;
      }
      setActiveFormats({
        block: blockMatch ? (`h${blockMatch[1]}` as ActiveFormats['block']) : 'p',
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        list: document.queryCommandState('insertUnorderedList'),
        fontSize: selectedFontSize,
      });
    }
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      if (document.activeElement === editorRef.current) rememberSelection();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const syncChanges = () => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    lastHtmlRef.current = currentHtml;
    const nextBlocks = htmlToQuotationBlocks(editorRef.current);
    onChange(nextBlocks);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const executeCommand = (command: string, arg?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedSelectionRef.current);
    }
    document.execCommand(command, false, arg);
    syncChanges();
    rememberSelection();
  };

  const applyFontSize = (fontSize: number) => {
    if (editorRef.current) editorRef.current.focus();
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedSelectionRef.current);
    }
    document.execCommand('fontSize', false, '7');
    editorRef.current?.querySelectorAll('font[size="7"]').forEach((node) => {
      const element = node as HTMLElement;
      element.removeAttribute('size');
      element.style.fontSize = `${fontSize}px`;
    });
    syncChanges();
    rememberSelection();
  };

  const formatButtonClass = (active: boolean) =>
    `inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-medium transition-colors ${
      active
        ? 'border-sky-700 bg-sky-700 text-white shadow-sm'
        : 'border-gray-200 bg-white text-gray-700 hover:border-sky-300 hover:bg-sky-50'
    }`;

  const clearContent = () => {
    if (window.confirm('Clear all quotation details?')) {
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      onChange([]);
    }
  };

  const totalWords = value.reduce(
    (count, block) =>
      count +
      (block.runs || []).reduce(
        (acc, run) => acc + (run.text.trim() ? run.text.trim().split(/\s+/).length : 0),
        0
      ),
    0
  );

  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden ${className}`}>
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/70 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-sky-700" />
          <span className="text-xs font-semibold text-gray-800">Quotation Details Editor</span>
          {isSaved && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <Check size={12} /> Auto-saved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'edit'
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Edit3 size={13} /> Edit
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'preview'
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Eye size={13} /> Preview
            </button>
          </div>
        </div>
      </div>

      {/* Formatting Toolbar */}
      {viewMode === 'edit' && (
        <div
          className="border-b border-gray-200 bg-gray-50/70 px-4 py-3 text-xs"
          onMouseDown={(event) => {
            if ((event.target as HTMLElement).closest('button')) event.preventDefault();
          }}
        >
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 whitespace-nowrap">
            <label className="sr-only" htmlFor="quotation-heading-style">Text style</label>
            <select
              id="quotation-heading-style"
              aria-label="Text style"
              value={activeFormats.block}
              onChange={(event) => executeCommand('formatBlock', event.target.value)}
              className="h-9 min-w-[150px] rounded-lg border border-gray-200 bg-white px-3 font-medium text-gray-700 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/15"
            >
              <option value="p">Paragraph</option>
              <option value="h1">Heading 1 — Main title</option>
              <option value="h2">Heading 2 — Section</option>
              <option value="h3">Heading 3</option>
              <option value="h4">Heading 4</option>
              <option value="h5">Heading 5</option>
            </select>

            <label className="sr-only" htmlFor="quotation-font-size">Font size</label>
            <select
              id="quotation-font-size"
              aria-label="Font size"
              value={activeFormats.fontSize ?? ''}
              onChange={(event) => applyFontSize(Number(event.target.value))}
              className="h-9 min-w-[105px] rounded-lg border border-gray-200 bg-white px-3 font-medium text-gray-700 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/15"
            >
              <option value="" disabled>Font size</option>
              {FONT_SIZES.map((size) => <option key={size} value={size}>{size} px</option>)}
            </select>

            <span className="mx-0.5 h-6 w-px shrink-0 bg-gray-200" />
            <button type="button" title="Bold (Ctrl+B)" aria-label="Bold" aria-pressed={activeFormats.bold} onClick={() => executeCommand('bold')} className={formatButtonClass(activeFormats.bold)}><Bold size={15} /></button>
            <button type="button" title="Italic (Ctrl+I)" aria-label="Italic" aria-pressed={activeFormats.italic} onClick={() => executeCommand('italic')} className={formatButtonClass(activeFormats.italic)}><Italic size={15} /></button>
            <button type="button" title="Underline (Ctrl+U)" aria-label="Underline" aria-pressed={activeFormats.underline} onClick={() => executeCommand('underline')} className={formatButtonClass(activeFormats.underline)}><Underline size={15} /></button>
            <button type="button" title="Bullet list" aria-label="Bullet list" aria-pressed={activeFormats.list} onClick={() => executeCommand('insertUnorderedList')} className={formatButtonClass(activeFormats.list)}><List size={15} /></button>

            <span className="mx-0.5 h-6 w-px shrink-0 bg-gray-200" />
            <button type="button" title="Undo (Ctrl+Z)" aria-label="Undo" onClick={() => executeCommand('undo')} className={formatButtonClass(false)}><Undo2 size={15} /></button>
            <button type="button" title="Redo (Ctrl+Y)" aria-label="Redo" onClick={() => executeCommand('redo')} className={formatButtonClass(false)}><Redo2 size={15} /></button>
            <button type="button" title="Clear all text" aria-label="Clear all text" onClick={clearContent} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 font-medium text-red-600 transition-colors hover:bg-red-50"><Trash2 size={15} /><span>Clear all</span></button>
          </div>

        </div>
      )}

      {/* Editor Content Area */}
      <div className="p-4">
        {viewMode === 'edit' ? (
          <div className="relative">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              dir="ltr"
              spellCheck
              onInput={() => {
                rememberSelection();
                if (!isComposingRef.current) syncChanges();
              }}
              onKeyUp={rememberSelection}
              onMouseUp={rememberSelection}
              onCompositionStart={() => {
                isComposingRef.current = true;
              }}
              onCompositionEnd={() => {
                isComposingRef.current = false;
                rememberSelection();
                syncChanges();
              }}
              onBlur={syncChanges}
              onFocus={rememberSelection}
              data-placeholder={placeholder}
              aria-label="Quotation details text editor"
              className="min-h-[280px] max-h-[560px] overflow-y-auto rounded-lg border border-gray-300 bg-white p-5 text-left text-sm leading-relaxed text-gray-800 outline-none transition-all empty:before:pointer-events-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)] focus:border-sky-600 focus:ring-2 focus:ring-sky-500/15 [&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-sky-950 [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-sky-950 [&_h3]:my-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-sky-950 [&_h4]:my-2.5 [&_h4]:text-base [&_h4]:font-bold [&_h4]:text-sky-950 [&_h5]:my-2 [&_h5]:text-sm [&_h5]:font-bold [&_h5]:text-sky-950 [&_li]:my-1 [&_p]:my-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6"
            />
          </div>
        ) : (
          <div className="min-h-[220px] max-h-[500px] overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <QuotationDetailsPreview blocks={value} />
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/70 px-4 py-2.5 text-[11px] text-gray-500">
        <div className="flex items-center gap-3">
          <span>{value.length} block{value.length === 1 ? '' : 's'}</span>
          <span>•</span>
          <span>{totalWords} word{totalWords === 1 ? '' : 's'}</span>
        </div>
        <span className="text-gray-500">
          Auto-saved · Included in the client PDF and email
        </span>
      </div>
    </div>
  );
}
