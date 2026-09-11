import React from 'react';
import styles from './DateSwitcher.module.css';
import { IconButton } from '../IconButton/IconButton';

export interface DateSwitcherProps {
  /** 顯示用的日期文字，例如「9 月 7 日（週一）」，由呼叫端自行格式化 */
  label: string;
  onPrev?: () => void;
  onNext?: () => void;
  /** 是否已經在「今天」，是的話隱藏回到今天按鈕 */
  isToday: boolean;
  onToday: () => void;
  /** 若為 true，不顯示前一天/後一天箭頭（例如菜單規劃單日頁，上方已有自己的返回鍵，
   *  日期切換交給週總覽處理，這裡不需要重複一組游標） */
  hideArrows?: boolean;
}

/**
 * 日期切換列：‹ 日期 › 加上「回到今天」快速鍵。
 * 週總覽（MenuPage/ShoppingListPage）用完整版；單日頁（MenuDayPage）可傳 hideArrows 只留日期文字。
 */
export function DateSwitcher({
  label,
  onPrev,
  onNext,
  isToday,
  onToday,
  hideArrows = false,
}: DateSwitcherProps) {
  return (
    <div
      className={styles.wrapper}
      style={hideArrows ? { justifyContent: 'center', gap: 'var(--space-2)' } : undefined}
    >
      {!hideArrows && <IconButton icon="‹" label="前一天" onClick={onPrev} />}
      <div className={styles.center}>
        <span className={styles.label}>{label}</span>
        {!isToday && (
          <button className={styles.todayLink} onClick={onToday}>
            回到今天
          </button>
        )}
      </div>
      {!hideArrows && <IconButton icon="›" label="後一天" onClick={onNext} />}
    </div>
  );
}