import { useRef, useState } from 'react';

export default function useToast() {
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);
  const timer = useRef(null);

  function toast(text) {
    setMsg(text);
    setShow(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 2200);
  }

  const ToastEl = <div className={`toast ${show ? 'show' : ''}`}>{msg}</div>;
  return { toast, ToastEl };
}
