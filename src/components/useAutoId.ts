import { useRef } from 'react';

let counter = 0;

/**
 * 產生穩定、元件實例唯一的 id。
 *
 * 專案鎖定 react@17（package.json），React 18 才有的 `useId()` 在這個
 * 版本會是 undefined，元件一render就會炸掉。這裡自己刻一個等效替代，
 * 表單元件（Input / Textarea / Select / Checkbox）一律用這個，不要改回
 * `useId()`，除非哪天真的升級到 React 18。
 */
export function useAutoId(prefix = 'field'): string {
  const idRef = useRef<string>();
  if (!idRef.current) {
    counter += 1;
    idRef.current = `${prefix}-${counter}`;
  }
  return idRef.current;
}
