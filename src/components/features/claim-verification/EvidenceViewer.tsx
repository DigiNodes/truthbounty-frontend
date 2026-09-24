'use client';

import { useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  isValidMediaUrl, 
  isValidImageUrl, 
  isValidLinkUrl,
  createInitialMediaState,
  MediaLoadingState,
  isMediaType 
} from '@/lib/evidence-validation';
import { Evidence, EvidenceType } from '@/app/types/claim';
import { AlertCircle, ImageOff, Link2, FileText } from 'lucide-react';

interface EvidenceViewerProps {
  claimId: string;
  evidence: Evidence[];
}

// Individual media component with loading and error states
function MediaRenderer({ 
  type, 
  value, 
  index 
}: { 
  type: EvidenceType; 
  value: string; 
  index: number;
}) {
  const [mediaState, setMediaState] = useState<MediaLoadingState>(createInitialMediaState());
  const [isValid, setIsValid] = useState<boolean>(true);

  const handleLoad = useCallback(() => {
    setMediaState({
      isLoading: false,
      hasError: false,
      isLoaded: true,
    });
  }, []);

  const handleError = useCallback(() => {
    setMediaState({
      isLoading: false,
      hasError: true,
      isLoaded: false,
    });
  }, []);

  // Validate URL first
  if (!isValidMediaUrl(value)) {
    setIsValid(false);
  }

  if (type === 'image' && isValid && isValidImageUrl(value)) {
    return (
      <div className="relative" key={index}>
        {mediaState.isLoading && (
          <Skeleton 
            className="w-full h-40 sm:h-60 rounded-lg"
            data-testid={`image-skeleton-${index}`}
          />
        )}
        <img
          key={index}
          src={value}
          alt={`Evidence image ${index + 1}`}
          className={`rounded-lg max-h-40 sm:max-h-60 w-full object-cover transition-opacity duration-300 ${
            mediaState.isLoading ? 'opacity-0 absolute inset-0' : 'opacity-100'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
        />
        {mediaState.hasError && (
          <div 
            className="flex flex-col items-center justify-center w-full h-40 sm:h-60 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500"
            data-testid={`image-error-${index}`}
            role="alert"
            aria-label="Failed to load evidence image"
          >
            <ImageOff className="w-8 h-8 mb-2" />
            <span className="text-sm">Failed to load image</span>
          </div>
        )}
        {!isValid && (
          <div 
            className="flex flex-col items-center justify-center w-full h-40 sm:h-60 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400"
            role="alert"
          >
            <AlertCircle className="w-8 h-8 mb-2" />
            <span className="text-sm">Invalid image source</span>
          </div>
        )}
      </div>
    );
  }

  // Fallback for invalid images or other media types
  if ((type === 'image' && !isValid) || (type === 'image' && !isValidImageUrl(value))) {
    return (
      <div 
        key={index}
        className="flex flex-col items-center justify-center w-full h-40 sm:h-60 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400"
        role="alert"
      >
        <AlertCircle className="w-8 h-8 mb-2" />
        <span className="text-sm">Invalid or unsupported image format</span>
      </div>
    );
  }

  return null;
}

// Link renderer with validation
function LinkRenderer({ value, index }: { value: string; index: number }) {
  const isValid = isValidLinkUrl(value);

  if (!isValid) {
    return (
      <div 
        key={index}
        className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400"
        role="alert"
      >
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm">Invalid link source blocked for security</span>
      </div>
    );
  }

  return (
    <a
      key={index}
      href={value}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center space-x-2 text-blue-600 underline text-sm sm:text-base break-all py-1 hover:text-blue-800 dark:hover:text-blue-400 transition-colors focus-visible:outline-2 focus-visible:outline-[#5b5bf6] focus-visible:outline-offset-2 rounded"
      aria-label={`Evidence link: ${value} (opens in new tab)`}
    >
      <Link2 className="w-4 h-4 flex-shrink-0" />
      <span>{value}</span>
    </a>
  );
}

// Text renderer
function TextRenderer({ value, index }: { value: string; index: number }) {
  return (
    <div key={index} className="flex items-start space-x-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <FileText className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-500" />
      <p className="text-sm sm:text-base leading-relaxed text-gray-900 dark:text-gray-100">
        {value}
      </p>
    </div>
  );
}

export function EvidenceViewer({ claimId: _claimId, evidence }: EvidenceViewerProps) {
  void _claimId;
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="card p-4 sm:p-6">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls="evidence-content"
        className="flex items-center justify-between w-full font-semibold mb-3 text-base sm:text-lg text-left focus-visible:outline-2 focus-visible:outline-[#5b5bf6] focus-visible:outline-offset-2 rounded"
      >
        <span>Evidence</span>
        <span aria-hidden="true">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div
          id="evidence-content"
          data-testid="evidence-scroll-container"
          className="space-y-3 sm:space-y-3 overflow-y-auto overscroll-contain"
          style={{ maxHeight: '60vh', overscrollBehavior: 'contain' }}
        >
          {evidence.length === 0 ? (
            <div 
              className="flex items-center justify-center p-8 text-gray-500"
              data-testid="no-evidence-state"
            >
              <span className="text-sm">No evidence submitted for this claim</span>
            </div>
          ) : (
            evidence.map((e, idx) => {
              if (e.type === 'link') {
                return <LinkRenderer key={e.id || idx} value={e.value} index={idx} />;
              }

              if (e.type === 'image') {
                return <MediaRenderer key={e.id || idx} type={e.type} value={e.value} index={idx} />;
              }

              if (e.type === 'video') {
                // Video support to be added with similar validation
                return (
                  <div 
                    key={e.id || idx}
                    className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-700 dark:text-yellow-400"
                    role="note"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">Video evidence requires manual verification - link available upon request</span>
                  </div>
                );
              }

              if (e.type === 'document') {
                const docValid = isValidMediaUrl(e.value);
                if (!docValid) {
                  return (
                    <div 
                      key={e.id || idx}
                      className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400"
                      role="alert"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">Invalid document source blocked for security</span>
                    </div>
                  );
                }
                return (
                  <a
                    key={e.id || idx}
                    href={e.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-2 focus-visible:outline-[#5b5bf6] focus-visible:outline-offset-2"
                    aria-label={`Evidence document: ${e.value} (opens in new tab)`}
                  >
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-blue-600 underline">View document</span>
                  </a>
                );
              }

              // Default text renderer
              return <TextRenderer key={e.id || idx} value={e.value} index={idx} />;
            })
          )}
        </div>
      )}
    </div>
  );
}

export default EvidenceViewer;