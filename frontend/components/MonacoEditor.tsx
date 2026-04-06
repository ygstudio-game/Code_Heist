'use client';

import { useRef, useEffect } from 'react';
import Editor, { OnMount, Monaco } from '@monaco-editor/react';
import { toast } from 'sonner';
import { useAntiCheat } from '../hooks/useAntiCheat';

interface MonacoEditorProps {
  code: string;
  language?: string;
  onCodeChange?: (code: string) => void;
  readOnly?: boolean;
}

export default function MonacoEditor({ 
  code, 
  language = 'typescript', 
  onCodeChange,
  readOnly = false,
  teamId = 'default',
  phase = 'AUCTION'
}: MonacoEditorProps & { teamId?: string, phase?: string }) {
  const { breaches } = useAntiCheat(teamId, phase);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);


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

    // Apply the noise and scanline overlays manually if not in CSS
  };

  return (
    <div className={`w-full h-full relative group ${breaches > 0 ? 'glitch-active' : ''} clip-edge-tl`}>
      <div className="absolute inset-0 pointer-events-none z-10 scanlines-overlay opacity-30"></div>
      <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]"></div>
      <Editor
        height="100%"
        language={language}
        value={code}
        theme="aegis-dark"
        onChange={(val) => onCodeChange && onCodeChange(val || '')}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'JetBrains Mono, monospace',
          lineHeight: 24,
          padding: { top: 20, bottom: 20 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          readOnly: readOnly,
          contextmenu: false,
        }}
      />
      <div className="absolute top-2 right-4 z-20 flex gap-2">
        {breaches > 0 && (
          <div className="bg-danger/20 border border-danger text-danger px-2 py-0.5 text-[8px] font-bold uppercase animate-pulse">
            Violation Detected (S-{breaches})
          </div>
        )}
      </div>
    </div>
  );
}