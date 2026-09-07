import React from 'react';
import styles from './SegmentedControl.module.css';

export interface SegmentedOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * 分段切換控制項，用於「檢視模式 / 編輯模式」切換、
 * 或早餐/午餐/晚餐這類同層級選項的切換。
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps) {
  return (
    <div
      className={[styles.track, className || ''].filter(Boolean).join(' ')}
      role="tablist"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={opt.value === value}
          className={[styles.segment, opt.value === value ? styles.active : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
