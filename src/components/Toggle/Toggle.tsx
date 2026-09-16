import styles from './Toggle.module.css';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** 給螢幕閱讀器用，例如「可先做」 */
  label?: string;
}

/**
 * iOS 風格開關(58×34)，用於「可先做」「有食譜」這類單一是非設定。
 * 跟 Checkbox 是兩種不同語意：Checkbox 用於多選清單，Toggle 用於單一開關設定。
 */
export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={[styles.track, checked ? styles.on : ''].filter(Boolean).join(' ')}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.thumb} />
    </button>
  );
}
