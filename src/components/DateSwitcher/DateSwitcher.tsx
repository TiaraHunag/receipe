import React from 'react';
import styles from './DateSwitcher.module.css';
import { IconButton } from '../IconButton/IconButton';

export interface DateSwitcherProps {
  /** 顯示用的日期文字，例如「9 月 7 日（週一）」，由呼叫端自行格式化 */
  label: string;
  onPrev: () => void;
  onNext: () => void;
  /** 是否已經在「今天」，是的話隱藏回到今天按鈕 */
  isToday: boolean;
  onToday: () => void;
}

/**
 * 菜單規劃頁的單日切換列：‹ 日期 › 加上「回到今天」快速鍵。
 */
export function DateSwitcher({
  label,
  onPrev,
  onNext,
  isToday,
  onToday,
}: DateSwitcherProps) {
  return (
    <div className={styles.wrapper}>
      <IconButton icon="‹" label="前一天" onClick={onPrev} />
      <div className={styles.center}>
        <span className={styles.label}>{label}</span>
        {!isToday && (
          <button className={styles.todayLink} onClick={onToday}>
            回到今天
          </button>
        )}
      </div>
      <IconButton icon="›" label="後一天" onClick={onNext} />
    </div>
  );
}
