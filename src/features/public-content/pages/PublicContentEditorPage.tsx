import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlignCenter, AlignLeft, AlignRight, Bold, ChevronLeft, ChevronDown, ChevronUp, Highlighter, Italic, Link2, List, ListOrdered, Palette, Redo2, RemoveFormatting, Save, Trash2, Plus, Edit3, Eye, Underline, Undo2 } from 'lucide-react';
import { useGetPublicContentQuery, useGetPublicContentPageQuery, useUpsertPublicContentPageMutation, useUpdatePublicContentPageMutation, useDeletePublicContentPageMutation, type PublicContentSection, type PublicContentPage } from '@/store/publicContentApi';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { cn } from '@/shared/utils';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/authSlice';

const pageMeta: Record<string, { label: string; description: string; accent: string }> = {
  'about-us': { label: 'About Us', description: 'Company story and mission.', accent: 'from-[#1D4F6D] to-[#3B82F6]' },
  faq: { label: 'FAQ', description: 'Questions and answers for users.', accent: 'from-emerald-500 to-teal-500' },
  'privacy-policy': { label: 'Privacy Policy', description: 'Data collection and usage policy.', accent: 'from-violet-500 to-indigo-500' },
  'terms-and-conditions': { label: 'Terms & Conditions', description: 'Rules and responsibilities.', accent: 'from-amber-500 to-orange-500' },
};

function normalizeBody(body: PublicContentPage['body']) {
  if (!body) return '';
  return typeof body === 'string' ? body : JSON.stringify(body, null, 2);
}

function normalizeSections(sections: PublicContentPage['sections']) {
  if (!sections) return [];
  return Array.isArray(sections) ? sections : [];
}

function RichTextEditor({ content, onChange, placeholder = 'Write content here...' }: { content: string, onChange: (val: string) => void, placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== content) {
      ref.current.innerHTML = content;
    }
  }, [content]);

  const runCommand = (command: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, value);
    onChange(ref.current?.innerHTML ?? '');
  };

  const addLink = () => {
    const url = window.prompt('Enter the link URL');
    if (!url) return;
    runCommand('createLink', /^https?:\/\//i.test(url) ? url : `https://${url}`);
  };

  const toolbarButton = (label: string, icon: ReactNode, command: string, value?: string) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => runCommand(command, value)}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 transition hover:bg-white hover:text-[#1D4F6D] hover:shadow-sm"
    >
      {icon}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm focus-within:border-[#1D4F6D]/40 focus-within:ring-4 focus-within:ring-[#1D4F6D]/5">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-2">
        <select
          title="Text style"
          aria-label="Text style"
          defaultValue="p"
          onChange={(event) => runCommand('formatBlock', event.target.value)}
          className="mr-1 h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 outline-none"
        >
          <option value="p">Paragraph</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="blockquote">Quote</option>
        </select>
        {toolbarButton('Undo', <Undo2 className="h-4 w-4" />, 'undo')}
        {toolbarButton('Redo', <Redo2 className="h-4 w-4" />, 'redo')}
        <span className="mx-1 h-5 w-px bg-gray-200" />
        {toolbarButton('Bold', <Bold className="h-4 w-4" />, 'bold')}
        {toolbarButton('Italic', <Italic className="h-4 w-4" />, 'italic')}
        {toolbarButton('Underline', <Underline className="h-4 w-4" />, 'underline')}
        {toolbarButton('Highlight', <Highlighter className="h-4 w-4" />, 'hiliteColor', '#FEF3C7')}
        <span className="mx-1 h-5 w-px bg-gray-200" />
        {toolbarButton('Bulleted list', <List className="h-4 w-4" />, 'insertUnorderedList')}
        {toolbarButton('Numbered list', <ListOrdered className="h-4 w-4" />, 'insertOrderedList')}
        {toolbarButton('Align left', <AlignLeft className="h-4 w-4" />, 'justifyLeft')}
        {toolbarButton('Align center', <AlignCenter className="h-4 w-4" />, 'justifyCenter')}
        {toolbarButton('Align right', <AlignRight className="h-4 w-4" />, 'justifyRight')}
        <button type="button" title="Add link" aria-label="Add link" onMouseDown={(event) => event.preventDefault()} onClick={addLink} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 transition hover:bg-white hover:text-[#1D4F6D] hover:shadow-sm"><Link2 className="h-4 w-4" /></button>
        {toolbarButton('Clear formatting', <RemoveFormatting className="h-4 w-4" />, 'removeFormat')}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className="prose min-h-[150px] max-w-none p-4 text-sm leading-7 text-gray-800 outline-none empty:before:pointer-events-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)] prose-headings:mb-2 prose-headings:mt-3 prose-li:my-1 prose-ol:pl-6 prose-ul:pl-6"
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
      />
      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2 text-[10px] font-medium text-gray-400">
        <span>Rich text editor</span><span>{htmlToPlainText(content).length} characters</span>
      </div>
    </div>
  );
}

function htmlToPlainText(value: string) {
  if (!value) return '';
  const element = document.createElement('div');
  element.innerHTML = value;
  return element.textContent?.trim() ?? '';
}

export function PublicContentEditorPage() {
  const { slug = 'about-us' } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef<HTMLDivElement>(null);

  const authUser = useAppSelector(selectAuthUser);
  const isSuperAdmin = authUser?.role === 'super_admin';

  const { data: pages = [], refetch } = useGetPublicContentQuery();
  const { data: pageBySlug } = useGetPublicContentPageQuery(slug);
  const [upsertPage, { isLoading: isCreatingPage }] = useUpsertPublicContentPageMutation();
  const [, { isLoading: isUpdatingPage }] = useUpdatePublicContentPageMutation();
  const [deletePage, { isLoading: isDeletingPage }] = useDeletePublicContentPageMutation();
  const isSubmitting = isCreatingPage || isUpdatingPage;

  const activePage = useMemo(() => pageBySlug ?? pages.find((page) => page.slug === slug) ?? null, [pageBySlug, pages, slug]);
  const meta = pageMeta[slug] ?? pageMeta['about-us'];
  const isLegalPage = slug === 'privacy-policy' || slug === 'terms-and-conditions';

  const [pageForm, setPageForm] = useState({ slug, title: meta.label, subtitle: '', isPublished: true });
  const [sections, setSections] = useState<PublicContentSection[]>([{ title: 'Section Title', content: 'Section content' }]);
  const [pageHtml, setPageHtml] = useState('<p>Write your page content here...</p>');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const nextMeta = pageMeta[slug] ?? pageMeta['about-us'];
    const html = '<p>Write your page content here...</p>';
    setPageForm({
      slug,
      title: nextMeta.label,
      subtitle: '',
      isPublished: true,
    });
    setSections([{ title: 'Section Title', content: 'Section content' }]);
    setPageHtml(html);
    if (editorRef.current) editorRef.current.innerHTML = html;
    setOpenFaqIndex(0);
    setIsEditing(false);
  }, [slug]);

  useEffect(() => {
    if (!activePage) return;
    const html = normalizeBody(activePage.body) || '<p>Write your page content here...</p>';
    setPageForm({
      slug: activePage.slug,
      title: activePage.title,
      subtitle: activePage.subtitle ?? '',
      isPublished: activePage.isPublished,
    });
    setPageHtml(html);
    if (editorRef.current) editorRef.current.innerHTML = html;
    setSections(normalizeSections(activePage.sections).length ? normalizeSections(activePage.sections) : [{ title: 'Section Title', content: 'Section content' }]);
  }, [activePage]);

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    setPageHtml(editorRef.current?.innerHTML ?? pageHtml);
  };

  const handleSave = async () => {
    const html = editorRef.current?.innerHTML ?? pageHtml;
    const payload = {
      slug: pageForm.slug,
      title: pageForm.title,
      subtitle: pageForm.subtitle || null,
      body: html,
      sections: isLegalPage ? [] : sections,
      isPublished: pageForm.isPublished,
    };
    await upsertPage(payload).unwrap();
    await refetch();
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deletePage(pageForm.slug).unwrap();
    navigate('/settings');
  };

  useLayoutEffect(() => {
    if (!isEditing || !editorRef.current) return;
    editorRef.current.innerHTML = pageHtml;
    // Only initialize the contentEditable surface when edit mode opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  const handleEditToggle = () => {
    setIsEditing((current) => !current);
  };

  const addFaqItem = () => {
    setSections((current) => [...current, { title: 'New question', content: 'New answer' }]);
  };

  const removeFaqItem = async (index: number) => {
    const nextSections = sections.filter((_, itemIndex) => itemIndex !== index);
    const safeSections = nextSections.length > 0 ? nextSections : [{ title: 'New question', content: 'New answer' }];

    setSections(safeSections);
    setOpenFaqIndex((current) => {
      if (current === index) return null;
      if (current != null && current > index) return current - 1;
      return current;
    });

    if (slug === 'faq') {
      await upsertPage({
        slug: pageForm.slug,
        title: pageForm.title,
        subtitle: pageForm.subtitle || null,
        body: pageHtml,
        sections: safeSections,
        isPublished: pageForm.isPublished,
      }).unwrap();
      await refetch();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border border-gray-100 bg-white shadow-sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" type="button" onClick={() => navigate('/settings')}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1D4F6D]">Public Page</p>
              <h2 className="text-xl font-bold text-gray-900">{meta.label}</h2>
            </div>
          </div>
          {isSuperAdmin && (
            <Button variant={isEditing ? 'outline' : 'default'} size="sm" onClick={handleEditToggle} className="gap-2">
              {isEditing ? <Eye className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              {isEditing ? 'View Page' : 'Edit Page'}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="rounded-[28px] border border-gray-100 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_42%)] p-4 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.35)]">
        {isEditing && slug !== 'faq' && !isLegalPage && (
          <Card className="mb-4 border border-gray-100 bg-white shadow-sm">
            <CardContent className="flex flex-wrap gap-2 p-3">
              <select className="rounded-md border border-gray-200 px-3 py-2 text-sm">
                <option>Normal</option>
                <option>Heading 1</option>
                <option>Heading 2</option>
              </select>
              <select className="rounded-md border border-gray-200 px-3 py-2 text-sm">
                <option>List</option>
                <option>Bullet List</option>
                <option>Numbered List</option>
              </select>
              <div className="mx-2 h-8 w-px bg-gray-200" />
              <Button variant="ghost" size="sm" onClick={() => exec('bold')}><Bold className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => exec('italic')}><Italic className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => exec('hiliteColor', '#FEF3C7')}><Highlighter className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => exec('foreColor', '#1D4F6D')}><Palette className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        )}

        <div className={cn('w-full rounded-[24px] bg-white p-8 md:p-10 text-left', slug === 'faq' ? 'mx-auto max-w-5xl' : 'mx-auto max-w-4xl')}>
          <div className={cn('h-1 rounded-full bg-gradient-to-r', meta.accent)} />
          <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{pageForm.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600">{pageForm.subtitle || meta.description}</p>
            </div>
            {!isEditing && (
              <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500">
                View only mode
              </div>
            )}
          </div>

          {slug === 'faq' ? (
            isEditing ? (
              <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">FAQ Items</p>
                      <p className="text-sm text-gray-500">Each item will be shown as a collapsible question card.</p>
                    </div>
                  <Button onClick={addFaqItem} variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Question
                  </Button>
                </div>
                <div className="space-y-3">
                  {sections.map((section, index) => {
                    const isOpen = openFaqIndex === index;
                    return (
                      <div key={`${slug}-${section.title}-${index}`} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-4 px-5 py-4 text-left">
                          <button
                            type="button"
                            onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                            className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{index + 1}. {section.title || 'Untitled question'}</p>
                            </div>
                            {isOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                          </button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeFaqItem(index)}
                            className="shrink-0 gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                        {isOpen && (
                          <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-3">
                            <Input
                              value={section.title}
                              onChange={(e) => setSections((current) => current.map((item, i) => i === index ? { ...item, title: e.target.value } : item))}
                              placeholder="Question"
                            />
                            <RichTextEditor
                              content={section.content || ''}
                              onChange={(val) => setSections((current) => current.map((item, i) => i === index ? { ...item, content: val } : item))}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={handleDelete} disabled={isDeletingPage} className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                  <Button onClick={handleSave} disabled={isSubmitting} className="gap-2">
                    <Save className="h-4 w-4" />
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-10 space-y-4">
                {sections.map((section, index) => (
                  <div key={`${slug}-${section.title}-${index}`} className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-900">{index + 1}. {section.title || 'Untitled question'}</p>
                    </div>
                    <div className="border-t border-gray-100 px-5 py-4 text-sm leading-7 text-gray-600">
                      <div dangerouslySetInnerHTML={{ __html: section.content || '<p>No answer available.</p>' }} />
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : isLegalPage ? (
            isEditing ? (
              <div className="mt-8 space-y-5">
                <div className="mx-auto max-w-[850px] rounded-sm border border-gray-200 bg-white px-10 py-12 shadow-[0_4px_24px_rgba(15,23,42,0.10)] md:min-h-[980px] md:px-20 md:py-16">
                  <div className="mb-8 space-y-3 border-b border-gray-100 pb-6">
                    <Input value={pageForm.title} onChange={(e) => setPageForm((p) => ({ ...p, title: e.target.value }))} placeholder="Document title" className="border-0 px-0 text-3xl font-bold shadow-none focus:ring-0" />
                    <Input value={pageForm.subtitle} onChange={(e) => setPageForm((p) => ({ ...p, subtitle: e.target.value }))} placeholder="Document summary (optional)" className="border-0 px-0 text-sm text-gray-500 shadow-none focus:ring-0" />
                  </div>
                  <RichTextEditor content={pageHtml} onChange={setPageHtml} placeholder="Start writing your document. Use the toolbar to add headings, numbered points, bullet lists, links, and formatting..." />
                </div>
                <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-xl backdrop-blur">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-600"><input type="checkbox" checked={pageForm.isPublished} onChange={(e) => setPageForm((current) => ({ ...current, isPublished: e.target.checked }))} className="h-4 w-4 accent-[#1D4F6D]" />Published in app</label>
                  <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={handleEditToggle}>Cancel</Button>
                    <Button type="button" onClick={handleSave} disabled={isSubmitting} className="gap-2"><Save className="h-4 w-4" />{isSubmitting ? 'Saving...' : 'Save document'}</Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto mt-8 min-h-[900px] max-w-[850px] rounded-sm border border-gray-200 bg-white px-10 py-12 shadow-[0_4px_24px_rgba(15,23,42,0.10)] md:px-20 md:py-16">
                <div className="prose max-w-none text-left prose-headings:text-gray-900 prose-li:my-1 prose-ol:pl-6 prose-p:leading-8 prose-p:text-gray-700 prose-ul:pl-6" dangerouslySetInnerHTML={{ __html: pageHtml || '<p>No document content available.</p>' }} />
              </div>
            )
          ) : (
            <>
              {!isEditing ? (
                  <div className="mt-8">
                    <div className="prose max-w-none text-left prose-h2:mb-4 prose-h2:text-2xl prose-p:leading-8 prose-p:text-gray-700 prose-li:text-gray-700 prose-headings:text-left prose-p:text-left prose-li:text-left">
                      <div dangerouslySetInnerHTML={{ __html: pageHtml || '<p>No content available.</p>' }} />
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    <Input value={pageForm.title} onChange={(e) => setPageForm((p) => ({ ...p, title: e.target.value }))} />
                    <Input value={pageForm.subtitle} onChange={(e) => setPageForm((p) => ({ ...p, subtitle: e.target.value }))} placeholder="Subtitle" />
                    <div
                      ref={editorRef}
                      contentEditable
                      dir="ltr"
                      suppressContentEditableWarning
                      onInput={() => setPageHtml(editorRef.current?.innerHTML ?? '')}
                      className="min-h-[420px] rounded-2xl border border-gray-100 p-6 text-left text-gray-800 focus:outline-none"
                      style={{ textAlign: 'left', direction: 'ltr', unicodeBidi: 'plaintext' }}
                    />
                    <div className="flex items-center justify-end gap-3">
                      <Button variant="outline" onClick={handleDelete} disabled={isDeletingPage} className="gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                      <Button onClick={handleSave} disabled={isSubmitting} className="gap-2">
                        <Save className="h-4 w-4" />
                        {isSubmitting ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
