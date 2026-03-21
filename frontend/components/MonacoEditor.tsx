'use client';

import { useRef, useEffect, useState } from 'react';
import Editor, { OnMount, Monaco } from '@monaco-editor/react';
import { toast } from 'sonner';

interface MonacoEditorProps {
  code: string;
  language?: string;
  onCodeChange?: (code: string) => void;
}

export default function MonacoEditor({ 
  code, 
  language = 'typescript', 
  onCodeChange 
}: MonacoEditorProps) {
  const [strikes, setStrikes] = useState(0);
  const editorRef = useRef<unknown>(null);
  const monacoRef = useRef<Monaco | null>(null);

  // Anti-Cheat: Tab Switching Detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setStrikes((prev) => {
          const newStrikes = prev + 1;
          if (newStrikes >= 3) {
            toast.error('STRIKE 3: SECURITY BREACH DETECTED. TIME PENALTY APPLIED.', {
              duration: 5000,
              style: { background: '#FF2A55', color: '#fff' }
            });
            // Here you would call an API to apply server-side penalty
          } else {
            toast.warning(`WARNING: TAB SWITCH DETECTED. STRIKE ${newStrikes}/3`, {
              style: { border: '1px solid #FF2A55', color: '#FF2A55' }
            });
          }
          return newStrikes;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Define Aegis Terminal Theme
    monaco.editor.defineTheme('aegis-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '475569', fontStyle: 'italic' },
        { token: 'keyword', foreground: '00E5FF' },
        { token: 'string', foreground: '00FA9A' },
        { token: 'number', foreground: 'E2E8F0' },
        { token: 'type', foreground: '00E5FF' },
      ],
      colors: {
        'editor.background': '#131620',
        'editor.foreground': '#E2E8F0',
        'editor.lineHighlightBackground': '#1E2230',
        'editorCursor.foreground': '#00E5FF',
        'editor.selectionBackground': '#00E5FF20',
      }
    });

    monaco.editor.setTheme('aegis-dark');

    // Read-only zones implementation
    editor.onKeyDown((e) => {
      const model = editor.getModel();
      if (!model) return;

      const position = editor.getPosition();
      const selection = editor.getSelection();
      const content = model.getValue();
      
      const startTag = '[EDITABLE ZONE START]';
      const endTag = '[EDITABLE ZONE END]';
      
      const startIndex = content.indexOf(startTag);
      const endIndex = content.indexOf(endTag);
      
      if (startIndex === -1 || endIndex === -1) return;

      const startPos = model.getPositionAt(startIndex + startTag.length);
      const endPos = model.getPositionAt(endIndex);

      // 1. Block BACKSPACE if at the very start of the editable zone
      if (e.keyCode === monaco.KeyCode.Backspace) {
        if (position!.lineNumber === startPos.lineNumber && position!.column <= startPos.column) {
          e.preventDefault();
          e.stopPropagation();
          toast.error('ACCESS DENIED: Boundary Integrity Compromised.', { duration: 1000 });
          return;
        }
      }

      // 2. Block DELETE if at the very end of the editable zone
      if (e.keyCode === monaco.KeyCode.Delete) {
        if (position!.lineNumber === endPos.lineNumber && position!.column >= endPos.column) {
          e.preventDefault();
          e.stopPropagation();
          toast.error('ACCESS DENIED: Boundary Integrity Compromised.', { duration: 1000 });
          return;
        }
      }

      // 3. Simple range check for normal typing
      const isInside = (
        (position!.lineNumber > startPos.lineNumber || 
         (position!.lineNumber === startPos.lineNumber && position!.column >= startPos.column)) &&
        (position!.lineNumber < endPos.lineNumber || 
         (position!.lineNumber === endPos.lineNumber && position!.column <= endPos.column))
      );

      // Allow navigation keys
      const isNavKey = [
        monaco.KeyCode.ArrowUp, monaco.KeyCode.ArrowDown, 
        monaco.KeyCode.ArrowLeft, monaco.KeyCode.ArrowRight,
        monaco.KeyCode.PageUp, monaco.KeyCode.PageDown,
        monaco.KeyCode.Home, monaco.KeyCode.End
      ].includes(e.keyCode);

      if (!isInside && !isNavKey) {
        e.preventDefault();
        e.stopPropagation();
        toast.error('ERROR: UNAUTHORIZED SECTOR. PROTECTED CODE.', { duration: 1000 });
      }
    });

    // Styling the non-editable areas
    editor.createDecorationsCollection([
      {
        range: new monaco.Range(1, 1, 1000, 1),
        options: {
          isWholeLine: true,
          inlineClassName: 'monaco-boilerplate-dim',
        }
      }
    ]);
  };

  return (
    <div className={`w-full h-full relative group ${strikes > 0 ? 'glitch-active' : ''}`}>
      <div className="absolute inset-0 pointer-events-none z-10 opacity-20 bg-gradient-to-b from-transparent via-primary/5 to-transparent animate-pulse"></div>
      <Editor
        height="100%"
        language={language}
        value={code}
        theme="aegis-dark"
        onMount={handleEditorMount}
        onChange={(val) => onCodeChange?.(val || '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'Geist Mono',
          lineHeight: 22,
          scrollBeyondLastLine: false,
          cursorStyle: 'block',
          cursorBlinking: 'smooth',
          renderLineHighlight: 'all',
          padding: { top: 20 },
          contextmenu: false,
        }}
      />
      <div className="absolute top-2 right-4 z-20 flex gap-2">
        {strikes > 0 && (
          <div className="bg-danger/20 border border-danger text-danger px-2 py-0.5 text-[8px] font-bold uppercase animate-pulse">
            Violation Detected (S-{strikes})
          </div>
        )}
      </div>
    </div>
  );
}