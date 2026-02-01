import { useEffect, useRef } from 'react';

/**
 * Hook to automatically resize textarea based on content
 * 
 * Usage:
 * const textareaRef = useAutoResize(value);
 * <textarea ref={textareaRef} value={value} ... />
 * 
 * Features:
 * - Expands textarea to fit content
 * - No scrolling needed
 * - Maintains minimum height
 * - Updates on value change
 */
export function useAutoResize(value: string) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight (content height)
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  return textareaRef;
}
