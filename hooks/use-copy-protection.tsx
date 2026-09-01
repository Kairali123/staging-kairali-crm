import { useEffect } from 'react';

interface ContentProtectionOptions {
  disableRightClick?: boolean;
  disableCopy?: boolean;
  disableCut?: boolean;
  enablePaste?: boolean; // 👈 NEW: Allow pasting
  disableDevTools?: boolean;
  disableTextSelection?: boolean;
  disablePrint?: boolean;
  showAlert?: boolean;
  alertMessage?: string;
  onAttempt?: (action: string) => void;
}

const useCopyProtection = (options: ContentProtectionOptions = {}) => {
  const {
    disableRightClick = true,
    disableCopy = true,
    disableCut = true,
    enablePaste = true, // 👈 NEW: Default to true
    disableDevTools = false,
    disableTextSelection = true,
    disablePrint = false,
    showAlert = false,
    alertMessage = "This content is protected",
    onAttempt
  } = options;

  useEffect(() => {
    // Handle right-click
    const handleContextMenu = (e: MouseEvent) => {
      if (disableRightClick) {
        e.preventDefault();
        onAttempt?.('right-click');
        if (showAlert) alert(alertMessage);
      }
    };

    // Handle copy
    const handleCopy = (e: ClipboardEvent) => {
      if (disableCopy) {
        e.preventDefault();
        e.clipboardData?.setData('text/plain', '');
        onAttempt?.('copy');
        if (showAlert) alert(alertMessage);
      }
    };

    // Handle cut
    const handleCut = (e: ClipboardEvent) => {
      if (disableCut) {
        e.preventDefault();
        onAttempt?.('cut');
        if (showAlert) alert(alertMessage);
      }
    };

    // 👇 NEW: Handle paste - Allow it!
    const handlePaste = (e: ClipboardEvent) => {
      if (!enablePaste) {
        e.preventDefault();
        onAttempt?.('paste');
        if (showAlert) alert("Pasting is disabled");
      }
      // If enablePaste is true, do nothing - allow paste to work normally
    };

    // Handle print
    const handleBeforePrint = () => {
      if (disablePrint) {
        onAttempt?.('print');
        if (showAlert) alert("Printing is disabled");
      }
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = (e.key || "").toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      // Copy: Ctrl+C or Cmd+C
      if (disableCopy && ctrl && key === 'c') {
        e.preventDefault();
        onAttempt?.('keyboard-copy');
        if (showAlert) alert(alertMessage);
        return;
      }

      // Cut: Ctrl+X or Cmd+X
      if (disableCut && ctrl && key === 'x') {
        e.preventDefault();
        onAttempt?.('keyboard-cut');
        if (showAlert) alert(alertMessage);
        return;
      }

      // 👇 NEW: Paste: Ctrl+V or Cmd+V - Allow it!
      if (ctrl && key === 'v') {
        if (!enablePaste) {
          e.preventDefault();
          onAttempt?.('keyboard-paste');
          if (showAlert) alert("Pasting is disabled");
        }
        // If enablePaste is true, do nothing - allow paste to work
        return;
      }

      // Print: Ctrl+P or Cmd+P
      // if (disablePrint && ctrl && key === 'p') {
      //   e.preventDefault();
      //   onAttempt?.('keyboard-print');
      //   if (showAlert) alert("Printing is disabled");
      //   return;
      // }

      if (disableDevTools) {
        // F12
        if (e.key === 'F12') {
          e.preventDefault();
          onAttempt?.('devtools-f12');
          return;
        }

        // Ctrl+Shift+I or Cmd+Option+I (Inspect)
        if (ctrl && e.shiftKey && key === 'i') {
          e.preventDefault();
          onAttempt?.('devtools-inspect');
          return;
        }

        // Ctrl+Shift+J or Cmd+Option+J (Console)
        if (ctrl && e.shiftKey && key === 'j') {
          e.preventDefault();
          onAttempt?.('devtools-console');
          return;
        }

        // Ctrl+Shift+C or Cmd+Option+C (Element picker)
        if (ctrl && e.shiftKey && key === 'c') {
          e.preventDefault();
          onAttempt?.('devtools-picker');
          return;
        }

        // Ctrl+U or Cmd+U (View source)
        if (ctrl && key === 'u') {
          e.preventDefault();
          onAttempt?.('view-source');
          return;
        }

        // Ctrl+S or Cmd+S (Save page)
        if (ctrl && key === 's') {
          e.preventDefault();
          onAttempt?.('save-page');
          return;
        }
      }
    };

    // Drag and drop protection
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      onAttempt?.('drag');
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste); // 👈 NEW
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('dragstart', handleDragStart);
    window.addEventListener('beforeprint', handleBeforePrint);

    // Apply CSS for text selection
    if (disableTextSelection) {
      document.body.style.userSelect = 'none';
      document.body.style.setProperty('-webkit-user-select', 'none');
      document.body.style.setProperty('-moz-user-select', 'none');
      document.body.style.setProperty('-ms-user-select', 'none');
      document.body.style.setProperty('-webkit-touch-callout', 'none');
    }

    // Cleanup function
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste); // 👈 NEW
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('beforeprint', handleBeforePrint);

      // Reset text selection
      if (disableTextSelection) {
        document.body.style.userSelect = '';
        document.body.style.removeProperty('-webkit-user-select');
        document.body.style.removeProperty('-moz-user-select');
        document.body.style.removeProperty('-ms-user-select');
        document.body.style.removeProperty('-webkit-touch-callout');
      }
    };
  }, [
    disableRightClick,
    disableCopy,
    disableCut,
    enablePaste, // 👈 NEW
    disableDevTools,
    disableTextSelection,
    disablePrint,
    showAlert,
    alertMessage,
    onAttempt
  ]);
};

export default useCopyProtection;
