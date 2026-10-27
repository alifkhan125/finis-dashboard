import { useEffect, useRef, useState, type FC } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  List,
  Type,
  FileText,
  Trash2,
  Eye,
  Edit3,
  Check,
} from 'lucide-react';

export type QuotationTextRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

export type QuotationBlock = {
  runs: QuotationTextRun[];
  heading?: boolean;
  bullet?: boolean;
};

export interface QuotationDetailsEditorProps {
  value: QuotationBlock[];
  onChange: (blocks: QuotationBlock[]) => void;
  className?: string;
  placeholder?: string;
}

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
        html += runHtml;
      }
      html += '</li>';
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      const tag = block.heading ? 'h2' : 'p';
      html += `<${tag}>`;
      for (const run of block.runs || []) {
        let runHtml = escapeHtml(run.text || '');
        if (run.bold) runHtml = `<strong>${runHtml}</strong>`;
        if (run.italic) runHtml = `<em>${runHtml}</em>`;
        if (run.underline) runHtml = `<u>${runHtml}</u>`;
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
        parent = parent.parentElement;
      }

      block.runs.push({
        text,
        ...(bold ? { bold: true } : {}),
        ...(italic ? { italic: true } : {}),
        ...(underline ? { underline: true } : {}),
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
            {b.runs.map((r, rIdx) => {
              let textEl: JSX.Element = <span key={rIdx}>{r.text}</span>;
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
        elements.push(
          <h3
            key={`h-${idx}`}
            className="mt-4 mb-2 text-base font-bold text-sky-950 first:mt-0 tracking-tight"
          >
            {block.runs.map((r, rIdx) => {
              let textEl: JSX.Element = <span key={rIdx}>{r.text}</span>;
              if (r.underline) textEl = <u key={rIdx}>{textEl}</u>;
              if (r.italic) textEl = <em key={rIdx}>{textEl}</em>;
              if (r.bold) textEl = <strong key={rIdx}>{textEl}</strong>;
              return textEl;
            })}
          </h3>
        );
      } else {
        elements.push(
          <p key={`p-${idx}`} className="my-2 text-sm leading-relaxed text-gray-700">
            {block.runs.map((r, rIdx) => {
              let textEl: JSX.Element = <span key={rIdx}>{r.text}</span>;
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
  const lastHtmlRef = useRef('');

  useEffect(() => {
    const nextHtml = quotationBlocksToHtml(value);
    if (editorRef.current && editorRef.current.innerHTML !== nextHtml && nextHtml !== lastHtmlRef.current) {
      editorRef.current.innerHTML = nextHtml;
      lastHtmlRef.current = nextHtml;
    }
  }, [value]);

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
    document.execCommand(command, false, arg);
    syncChanges();
  };

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
      block.runs.reduce(
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
        <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 bg-white px-3 py-2 text-xs">
          <button
            type="button"
            title="Heading 2"
            onClick={() => executeCommand('formatBlock', '<h2>')}
            className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-gray-700 hover:bg-gray-100 hover:border-gray-300"
          >
            <Heading2 size={14} />
            <span className="text-[11px] font-semibold">H2</span>
          </button>
          <button
            type="button"
            title="Normal Paragraph"
            onClick={() => executeCommand('formatBlock', '<p>')}
            className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-gray-700 hover:bg-gray-100 hover:border-gray-300"
          >
            <Type size={14} />
            <span className="text-[11px]">Normal</span>
          </button>

          <span className="h-4 w-px bg-gray-200 mx-1" />

          <button
            type="button"
            title="Bold (Ctrl+B)"
            onClick={() => executeCommand('bold')}
            className="rounded-md border border-gray-200 p-1.5 text-gray-700 hover:bg-gray-100 hover:border-gray-300"
          >
            <Bold size={14} />
          </button>
          <button
            type="button"
            title="Italic (Ctrl+I)"
            onClick={() => executeCommand('italic')}
            className="rounded-md border border-gray-200 p-1.5 text-gray-700 hover:bg-gray-100 hover:border-gray-300"
          >
            <Italic size={14} />
          </button>
          <button
            type="button"
            title="Underline (Ctrl+U)"
            onClick={() => executeCommand('underline')}
            className="rounded-md border border-gray-200 p-1.5 text-gray-700 hover:bg-gray-100 hover:border-gray-300"
          >
            <Underline size={14} />
          </button>

          <span className="h-4 w-px bg-gray-200 mx-1" />

          <button
            type="button"
            title="Bullet List"
            onClick={() => executeCommand('insertUnorderedList')}
            className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-gray-700 hover:bg-gray-100 hover:border-gray-300"
          >
            <List size={14} />
            <span className="text-[11px]">List</span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              title="Clear all text"
              onClick={clearContent}
              className="flex items-center gap-1 rounded-md text-red-600 hover:bg-red-50 px-2 py-1 transition-colors"
            >
              <Trash2 size={13} />
              <span className="text-[11px]">Clear</span>
            </button>
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
              onInput={syncChanges}
              onBlur={syncChanges}
              data-placeholder={placeholder}
              className="min-h-[220px] max-h-[500px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-800 leading-relaxed outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-500/15 transition-all prose-headings:font-bold prose-headings:text-sky-950 prose-h2:text-base prose-h2:mt-3 prose-h2:mb-1 prose-p:my-1.5 prose-ul:my-2 prose-ul:list-disc prose-ul:pl-5 prose-li:my-0.5"
            />
          </div>
        ) : (
          <div className="min-h-[220px] max-h-[500px] overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <QuotationDetailsPreview blocks={value} />
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/70 px-4 py-2 text-[11px] text-gray-500">
        <div className="flex items-center gap-3">
          <span>{value.length} block{value.length === 1 ? '' : 's'}</span>
          <span>•</span>
          <span>{totalWords} word{totalWords === 1 ? '' : 's'}</span>
        </div>
        <span className="text-gray-400">
          Formatted details are automatically included in the client PDF & email.
        </span>
      </div>
    </div>
  );
}
