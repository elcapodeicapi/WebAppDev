// src/components/Button.tsx
import type { JSX } from 'react';

export function Button({ text, onClick }: { text: string; onClick: () => void }): JSX.Element {
  return (
    <button className="btn" onClick={onClick}>{text}</button>
  );
}