import React, { useEffect, useRef, useState } from 'react';
import styles from './SwipeableRow.module.css';

export interface SwipeAction {
  /** 動作文字，例如「刪除」「編輯」 */
  label: string;
  /** 圖示，建議傳入 emoji（跟 App 其他圖示風格一致） */
  icon?: React.ReactNode;
  onClick: () => void;
  /** 是否為危險動作（刪除），套用警示色底 */
  danger?: boolean;
}

export interface SwipeableRowProps {
  children: React.ReactNode;
  /** 左滑後露出的動作按鈕，由右到左排列 */
  actions: SwipeAction[];
  /** 每個動作按鈕寬度（px） */
  actionWidth?: number;
}

const DEFAULT_ACTION_WIDTH = 72;
/** 拖曳距離超過「可露出總寬度」的這個比例，放開時視為要打開（否則彈回關閉） */
const OPEN_THRESHOLD_RATIO = 0.35;
/** 小於這個位移量視為「點一下」而不是「拖曳」 */
const TAP_MOVE_THRESHOLD = 4;

/**
 * 左滑列表項元件：手指/滑鼠向左拖曳會露出右側的動作按鈕（刪除、編輯等）。
 * 點列表其他地方或另一個 SwipeableRow 會自動收合。
 * 用於菜單規劃的菜色列、採買清單的額外項目列，取代原本常駐的 IconButton。
 */
export function SwipeableRow({ children, actions, actionWidth = DEFAULT_ACTION_WIDTH }: SwipeableRowProps) {
  const [translateX, setTranslateX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startTranslateRef = useRef(0);
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false);

  const maxOpen = actions.length * actionWidth;

  const close = () => setTranslateX(0);

  // 打開時，點列表以外的地方要自動收合
  useEffect(() => {
    if (translateX === 0) return;
    const handleOutsidePointerDown = (e: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        close();
      }
    };
    window.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => window.removeEventListener('pointerdown', handleOutsidePointerDown);
  }, [translateX]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startXRef.current = e.clientX;
    startTranslateRef.current = translateX;
    movedRef.current = false;
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const delta = e.clientX - startXRef.current;
    if (Math.abs(delta) > TAP_MOVE_THRESHOLD) movedRef.current = true;
    const next = Math.min(0, Math.max(-maxOpen, startTranslateRef.current + delta));
    setTranslateX(next);
  };

  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);

    if (movedRef.current) {
      // 真的有拖曳：依放開時的位置判斷要打開還是彈回關閉
      setTranslateX((current) => (current <= -maxOpen * OPEN_THRESHOLD_RATIO ? -maxOpen : 0));
    } else if (startTranslateRef.current < 0) {
      // 原本是打開狀態，這次只是輕點一下 → 收合，並吃掉這次點擊，避免誤觸下方內容
      setTranslateX(0);
      suppressClickRef.current = true;
    }
    // 其餘情況（原本是關閉狀態、且沒有拖曳）：什麼都不做，讓點擊正常穿透到內容裡的按鈕/checkbox
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClickRef.current = false;
    }
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div className={styles.actions} style={{ width: maxOpen }}>
        {actions.map((action, i) => (
          <button
            key={i}
            type="button"
            className={[styles.action, action.danger ? styles.danger : ''].filter(Boolean).join(' ')}
            style={{ width: actionWidth }}
            onClick={() => {
              close();
              action.onClick();
            }}
          >
            {action.icon}
            <span className={styles.actionLabel}>{action.label}</span>
          </button>
        ))}
      </div>

      <div
        className={styles.content}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: dragging ? 'none' : 'transform var(--transition-base)',
          userSelect: dragging ? 'none' : undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={handleClickCapture}
      >
        {children}
      </div>
    </div>
  );
}