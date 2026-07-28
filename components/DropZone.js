import { useState, useRef } from 'react';

export default function DropZone({ label, accept, onFile, hint }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  function handleFiles(files) {
    if (files && files[0]) onFile(files[0]);
  }

  return (
    <div className="field">
      <label>{label}</label>
      <div
        className={`dropzone ${dragOver ? 'dragover' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      >
        {hint || 'Drag & drop a file here, or click to choose'}
        <input ref={inputRef} type="file" accept={accept} onChange={e => handleFiles(e.target.files)} />
      </div>
    </div>
  );
}
