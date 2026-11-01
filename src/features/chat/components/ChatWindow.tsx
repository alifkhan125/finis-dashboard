import { Send, Paperclip, MapPin, MoreVertical, ShieldAlert, Archive, Download, User, Eye, ExternalLink, Building } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { ChatConversation, ChatMessage } from '@/shared/types/entities';
import { useState, useRef, useEffect, useLayoutEffect, type ChangeEvent } from 'react';
import { cn } from '@/shared/utils';
import { getFullUrl } from '@/shared/utils/helpers';
import { format } from 'date-fns';
import { useUploadMessageFileMutation } from '@/store/messageApi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

interface ChatWindowProps {
    conversation: ChatConversation;
    messages: ChatMessage[];
    onSendMessage: (content: string, mediaUrl?: string, mediaType?: string, locationUrl?: string) => void;
    onCloseChat: (id: string) => void;
    onExport: (id: string) => void;
    onLoadOlderMessages?: () => void;
    isMessagesLoading?: boolean;
    isLoadingOlderMessages?: boolean;
    hasMoreMessages?: boolean;
    currentUserId: string;
    currentUserRole: 'admin' | 'manager' | 'worker' | 'super_admin';
    isReadOnly?: boolean;
    isBlocked?: boolean;
}

function mapMimeToMediaType(mime: string) {
    if (mime.startsWith('image/')) return 'image';
    if (mime === 'application/pdf') return 'document';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    return 'document';
}

function getMediaTypeFromUrl(url?: string | null) {
    if (!url) return 'document';
    if (url.startsWith('data:application/pdf')) return 'pdf';
    if (url.startsWith('data:image/')) return 'image';
    if (url.toLowerCase().includes('.pdf')) return 'pdf';
    return 'document';
}

function resolveMediaUrl(url?: string | null) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
        return url;
    }
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function isLocationUrl(url?: string | null) {
    if (!url) return false;
    return /google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.com\/maps/i.test(url);
}

function extractLatLngFromMapsUrl(url?: string | null) {
    if (!url) return null;
    const match = url.match(/[?&]q=([-0-9.]+),([-0-9.]+)/i) || url.match(/@([-0-9.]+),([-0-9.]+)/i);
    if (!match) return null;
    return { lat: match[1], lng: match[2] };
}

function getFileNameFromDataUrl(dataUrl?: string | null) {
    if (!dataUrl) return 'Attachment';
    const match = dataUrl.match(/^data:[^;]+;name=([^;]+);base64,/i);
    if (match?.[1]) return decodeURIComponent(match[1]);
    return 'Attachment';
}

function Avatar({
    name,
    avatarUrl,
    size = 'sm',
}: {
    name: string;
    avatarUrl?: string | null;
    size?: 'sm' | 'md';
}) {
    const sizeClass = size === 'md' ? 'w-10 h-10' : 'w-8 h-8';
    const avatarSrc = getFullUrl(avatarUrl ?? undefined);
    if (avatarSrc) {
        return (
            <img
                src={avatarSrc}
                alt={name}
                className={`${sizeClass} rounded-full object-cover border border-gray-100 shrink-0 bg-white`}
            />
        );
    }

    const initials = name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

    return (
        <div className={`${sizeClass} rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0 text-[10px] font-black text-gray-500`}>
            {initials}
        </div>
    );
}

export function ChatWindow({
    conversation,
    messages,
    onSendMessage,
    onCloseChat,
    onExport,
    onLoadOlderMessages,
    isMessagesLoading = false,
    isLoadingOlderMessages = false,
    hasMoreMessages = false,
    currentUserId,
    currentUserRole,
    isReadOnly = false,
    isBlocked = false,
}: ChatWindowProps) {
    const [messageText, setMessageText] = useState('');
    const [selectedMedia, setSelectedMedia] = useState<{ name: string; file: File; url?: string; type: string } | null>(null);
    const [previewMedia, setPreviewMedia] = useState<{ name: string; url: string; type: string } | null>(null);
    const [isSharingLocation, setIsSharingLocation] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isInitialRenderRef = useRef(true);
    const activeConversationIdRef = useRef<string | null>(null);
    const previousScrollHeightRef = useRef(0);
    const previousScrollTopRef = useRef(0);
    const isLoadingOlderRef = useRef(false);
    const [uploadMessageFile] = useUploadMessageFileMutation();

    const participantDetails = conversation.participantDetails ?? [];
    const primaryParticipants = participantDetails.slice(0, 2);

    useEffect(() => {
        if (activeConversationIdRef.current === conversation.id) return;

        activeConversationIdRef.current = conversation.id;
        isInitialRenderRef.current = true;
        previousScrollHeightRef.current = 0;
        previousScrollTopRef.current = 0;
        isLoadingOlderRef.current = false;
    }, [conversation.id]);

    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        if (isInitialRenderRef.current) {
            el.scrollTop = el.scrollHeight;
        }
    }, [conversation.id, messages.length]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        if (isInitialRenderRef.current || isNearBottom) {
            el.scrollTop = el.scrollHeight;
            isInitialRenderRef.current = false;
        }
    }, [messages, conversation.id]);

    useEffect(() => {
        if (!isLoadingOlderRef.current) return;
        if (isLoadingOlderMessages) return;

        const el = scrollRef.current;
        if (el) {
            const heightDiff = el.scrollHeight - previousScrollHeightRef.current;
            el.scrollTop = previousScrollTopRef.current + heightDiff;
        }
        isLoadingOlderRef.current = false;
    }, [messages.length, isLoadingOlderMessages]);

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el || !onLoadOlderMessages || !hasMoreMessages || isLoadingOlderMessages) return;

        if (el.scrollTop <= 80) {
            isLoadingOlderRef.current = true;
            previousScrollHeightRef.current = el.scrollHeight;
            previousScrollTopRef.current = el.scrollTop;
            onLoadOlderMessages();
        }
    };

    const handleSend = () => {
        if (!messageText.trim() && !selectedMedia) return;
        if (isReadOnly) return;
        void (async () => {
            let mediaUrl = selectedMedia?.url;
            let mediaType = selectedMedia?.type;

            if (selectedMedia?.file && !mediaUrl) {
                const formData = new FormData();
                formData.append('file', selectedMedia.file);
                const uploaded = await uploadMessageFile(formData).unwrap();
                mediaUrl = uploaded.url;
                mediaType = uploaded.mimeType.startsWith('image/')
                    ? 'image'
                    : uploaded.mimeType === 'application/pdf'
                        ? 'document'
                        : uploaded.mimeType.startsWith('audio/')
                            ? 'audio'
                            : uploaded.mimeType.startsWith('video/')
                                ? 'video'
                                : 'document';
            }

            onSendMessage(messageText, mediaUrl, mediaType);
            setMessageText('');
            setSelectedMedia(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        })();
    };

    const handleShareLocation = () => {
        if (isReadOnly || !navigator.geolocation) return;
        setIsSharingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
                onSendMessage('Shared a location', locationUrl, 'document', locationUrl);
                setIsSharingLocation(false);
            },
            () => {
                setIsSharingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000 },
        );
    };

    const handleMediaClick = () => {
        if (isReadOnly) return;
        fileInputRef.current?.click();
    };

    const handleMediaChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setSelectedMedia({
            name: file.name,
            file,
            type: mapMimeToMediaType(file.type || 'application/octet-stream'),
        });
    };

    const openMediaPreview = async (mediaUrl: string, mediaType?: string | null, name?: string) => {
        const resolvedUrl = resolveMediaUrl(mediaUrl);
        const type = mediaType ?? getMediaTypeFromUrl(resolvedUrl);
        if (type === 'image' || type === 'pdf') {
            setPreviewMedia({
                url: resolvedUrl,
                type,
                name: name ?? getFileNameFromDataUrl(resolvedUrl),
            });
            return;
        }
        window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <Card className="h-full flex flex-col border-gray-100 shadow-sm overflow-hidden rounded-[24px]">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                    {conversation.type === 'individual' && primaryParticipants.length > 0 ? (
                        <div className="flex items-center -space-x-2">
                            {primaryParticipants.map((participant) => (
                                <Avatar
                                    key={participant.id}
                                    name={participant.fullName}
                                    avatarUrl={participant.avatarUrl}
                                    size="md"
                                />
                            ))}
                        </div>
                    ) : (
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-[#2D5F82] font-black text-xs",
                            conversation.type === 'project' ? "bg-blue-100" : "bg-purple-100 text-purple-600"
                        )}>
                            {conversation.type === 'project' ? <Building className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-black text-gray-900 leading-tight">{conversation.name}</h3>
                            {isBlocked && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                    <ShieldAlert className="w-3 h-3" /> Blocked
                                </span>
                            )}
                            {isReadOnly && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                    <Eye className="w-3 h-3" /> Read Only
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn(
                                "w-2 h-2 rounded-full",
                                conversation.status === 'active' ? "bg-green-500" : "bg-gray-400"
                            )} />
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                {conversation.status === 'active' ? 'Active Discussion' : 'Closed / Archived'}
                            </p>
                        </div>
                        {conversation.type === 'individual' && participantDetails.length > 0 && (
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
                                <span className="font-semibold text-gray-400 uppercase tracking-wider">Participants</span>
                                <div className="flex items-center gap-2">
                                    {participantDetails.map((participant) => (
                                        <span key={participant.id} className="inline-flex items-center gap-1">
                                            <Avatar name={participant.fullName} avatarUrl={participant.avatarUrl} />
                                            <span className="font-medium text-gray-600">{participant.fullName}</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {currentUserRole === 'admin' && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 gap-2 font-bold border-gray-100 text-xs rounded-xl hover:bg-gray-50"
                                onClick={() => onExport(conversation.id)}
                            >
                                <Download className="h-3.5 w-3.5" /> Export
                            </Button>
                            {conversation.status === 'active' && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 gap-2 font-bold border-red-50 text-red-600 rounded-xl hover:bg-red-50 hover:text-red-700 hover:border-red-100"
                                    onClick={() => onCloseChat(conversation.id)}
                                >
                                    <ShieldAlert className="h-3.5 w-3.5" /> Close Chat
                                </Button>
                            )}
                        </>
                    )}
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                    </Button>
                </div>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30"
            >
                {isMessagesLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <div className="w-10 h-10 rounded-full border-4 border-gray-100 border-t-blue-500 animate-spin mb-3" />
                        <p className="font-bold text-sm text-center">Loading messages...</p>
                    </div>
                ) : messages.length > 0 ? (
                    <>
                    {isLoadingOlderMessages && (
                            <div className="flex justify-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-white border border-gray-100 rounded-full px-3 py-1 shadow-sm">
                                    Loading older messages...
                                </span>
                            </div>
                        )}
                        {messages.map((msg, index) => {
                        const isMe = msg.senderId === currentUserId;
                        const showDate = index === 0 ||
                            format(new Date(messages[index - 1].timestamp), 'yyyy-MM-dd') !==
                            format(new Date(msg.timestamp), 'yyyy-MM-dd');

                        return (
                            <div key={msg.id} className="space-y-4">
                                {showDate && (
                                    <div className="flex justify-center">
                                        <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 shadow-sm">
                                            {format(new Date(msg.timestamp), 'MMMM dd, yyyy')}
                                        </span>
                                    </div>
                                )}
                                <div className={cn("flex gap-3", isMe ? "flex-row-reverse" : "flex-row")}>
                                    {!isMe && (
                                        <Avatar name={msg.senderName} avatarUrl={msg.senderAvatarUrl} />
                                    )}
                                    <div className={cn(
                                        "max-w-[70%] space-y-1",
                                        isMe ? "items-end text-right" : "items-start text-left"
                                    )}>
                                        {!isMe && (
                                            <div className="flex items-center gap-2 mb-1 px-1">
                                                <span className="text-xs font-black text-gray-900">{msg.senderName}</span>
                                                <Badge className={cn(
                                                    "text-[9px] uppercase font-black px-1.5 h-4",
                                                    msg.senderRole === 'admin' ? "bg-red-50 text-red-700 border-red-100" :
                                                        msg.senderRole === 'manager' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                            "bg-gray-100 text-gray-600 border-gray-200"
                                                )}>
                                                    {msg.senderRole}
                                                </Badge>
                                            </div>
                                        )}
                                        <div className={cn(
                                            "p-3 rounded-2xl text-sm font-medium shadow-sm space-y-3",
                                            isMe
                                                ? "bg-blue-600 text-white rounded-tr-none"
                                                : "bg-white text-gray-700 rounded-tl-none border border-gray-100"
                                        )}>
                                            {msg.mediaUrl && (
                                                <div className={cn(
                                                    "overflow-hidden rounded-xl",
                                                    isMe ? "bg-white/10" : "bg-gray-50"
                                                )}>
                                                    {isLocationUrl(msg.mediaUrl) && (
                                                        <div className={cn(
                                                            "p-3 space-y-3",
                                                            isMe ? "text-white" : "text-gray-800"
                                                        )}>
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn(
                                                                    "flex h-10 w-10 items-center justify-center rounded-xl",
                                                                    isMe ? "bg-white/15" : "bg-[#1D4F6D]/10"
                                                                )}>
                                                                    <MapPin className="h-5 w-5" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-bold">Location shared</p>
                                                                    <p className={cn("text-xs", isMe ? "text-white/80" : "text-gray-500")}>
                                                                        {extractLatLngFromMapsUrl(msg.mediaUrl)
                                                                            ? `${extractLatLngFromMapsUrl(msg.mediaUrl)?.lat}, ${extractLatLngFromMapsUrl(msg.mediaUrl)?.lng}`
                                                                            : 'Open the map link below'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <Button asChild variant="outline" className={cn(
                                                                "w-full rounded-xl",
                                                                isMe
                                                                    ? "border-white/20 text-white hover:bg-white/10"
                                                                    : "border-gray-200 text-[#1D4F6D] hover:bg-[#1D4F6D]/5"
                                                            )}>
                                                                <a href={resolveMediaUrl(msg.mediaUrl)} target="_blank" rel="noreferrer">
                                                                    Open in Maps
                                                                </a>
                                                            </Button>
                                                        </div>
                                                    )}

                                                    {msg.mediaType === 'image' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (msg.mediaUrl) openMediaPreview(msg.mediaUrl, msg.mediaType, getFileNameFromDataUrl(msg.mediaUrl));
                                                            }}
                                                            className="block w-full text-left"
                                                        >
                                                            <img
                                                                src={resolveMediaUrl(msg.mediaUrl)}
                                                                alt="attachment"
                                                                className="max-w-full max-h-72 object-cover cursor-zoom-in"
                                                            />
                                                        </button>
                                                    )}

                                                    {msg.mediaType === 'pdf' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (msg.mediaUrl) openMediaPreview(msg.mediaUrl, msg.mediaType, getFileNameFromDataUrl(msg.mediaUrl));
                                                            }}
                                                            className={cn(
                                                                "flex items-center gap-3 p-3 text-sm font-semibold w-full text-left cursor-pointer",
                                                                isMe ? "text-white" : "text-gray-700"
                                                            )}
                                                        >
                                                            <span className={cn(
                                                                "w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0",
                                                                isMe ? "bg-white/15" : "bg-white border border-gray-200"
                                                            )}>
                                                                PDF
                                                            </span>
                                                            <span className="truncate flex-1">{getFileNameFromDataUrl(msg.mediaUrl)}</span>
                                                            <ExternalLink className="w-4 h-4 shrink-0 opacity-70" />
                                                        </button>
                                                    )}

                                                    {!isLocationUrl(msg.mediaUrl) && msg.mediaType !== 'image' && msg.mediaType !== 'pdf' && (
                                                        <a
                                                            href={resolveMediaUrl(msg.mediaUrl)}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className={cn(
                                                                "flex items-center gap-3 p-3 text-sm font-semibold",
                                                                isMe ? "text-white" : "text-gray-700"
                                                            )}
                                                        >
                                                            <span className={cn(
                                                                "w-10 h-10 rounded-xl flex items-center justify-center text-base",
                                                                isMe ? "bg-white/15" : "bg-white border border-gray-200"
                                                            )}>
                                                                {msg.mediaType === 'document' ? 'PDF' : 'FILE'}
                                                            </span>
                                                            <span className="truncate">{getFileNameFromDataUrl(msg.mediaUrl)}</span>
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                            {msg.content && <div>{msg.content}</div>}
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-bold px-1 mt-1 block">
                                            {format(new Date(msg.timestamp), 'hh:mm a')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                        })}
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <Archive className="w-12 h-12 mb-3 text-gray-200" />
                        <p className="font-bold text-sm text-center">No messages yet.<br />Start the conversation!</p>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
                {conversation.status === 'closed' ? (
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            This conversation was closed by an Administrator.
                        </p>
                    </div>
                ) : isReadOnly ? (
                    // Read-only notice for chat tab
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center justify-center gap-2">
                            <Eye className="w-3.5 h-3.5" />
                            You are viewing this conversation in read-only mode.
                        </p>
                    </div>
                ) : isBlocked ? (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
                        <p className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center justify-center gap-2">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Message blocked. You cannot send messages in this thread.
                        </p>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleMediaChange}
                            accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 rounded-xl hover:bg-gray-50 text-gray-400"
                            onClick={handleMediaClick}
                            type="button"
                        >
                            <Paperclip className="w-5 h-5" />
                        </Button>
                        <div className="flex-1 space-y-2">
                            {selectedMedia && (
                                <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                    <span className="truncate font-medium">{selectedMedia.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedMedia(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        className="font-bold uppercase tracking-wide"
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}
                            <Input
                                placeholder="Type your message here..."
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                className="w-full h-11 bg-gray-50 border-gray-100 focus:border-blue-200 rounded-xl font-medium"
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 rounded-xl hover:bg-gray-50 text-[#1D4F6D]"
                            onClick={handleShareLocation}
                            type="button"
                            disabled={isSharingLocation}
                            title="Share location"
                        >
                            <MapPin className="w-5 h-5" />
                        </Button>
                        <Button
                            onClick={handleSend}
                            className="h-11 w-11 p-0 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-100 rounded-xl"
                            type="button"
                        >
                            <Send className="w-5 h-5" />
                        </Button>
                    </div>
                )}
            </div>

                <Modal
                isOpen={!!previewMedia}
                onClose={() => setPreviewMedia(null)}
                title={previewMedia?.name ?? 'Attachment Preview'}
                maxWidth="5xl"
                className="overflow-hidden"
            >
                {previewMedia?.type === 'image' ? (
                    <div className="flex justify-center">
                        <img
                            src={previewMedia.url}
                            alt={previewMedia.name}
                            className="max-h-[70vh] w-auto max-w-full rounded-2xl object-contain bg-gray-50"
                        />
                    </div>
                ) : previewMedia?.type === 'pdf' ? (
                    <div className="space-y-3">
                        <div className="h-[70vh] overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
                            <object
                                data={previewMedia.url}
                                type="application/pdf"
                                className="h-full w-full"
                            >
                                <div className="flex h-full items-center justify-center p-8 text-center">
                                    <div className="space-y-3">
                                        <p className="text-sm font-semibold text-gray-700">
                                            Your browser could not render this PDF inline.
                                        </p>
                                        <Button asChild variant="outline" className="rounded-xl">
                                            <a href={previewMedia.url} target="_blank" rel="noreferrer">
                                                Open PDF in new tab
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            </object>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </Card>
    );
}
