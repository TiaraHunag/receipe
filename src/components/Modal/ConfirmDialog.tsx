import React from 'react';
import { Modal } from './Modal';
import { Button } from '../Button/Button';
import styles from './Modal.module.css';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** 說明文字，例如「刪除後無法復原，確定要刪除這道菜色嗎？」 */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 是否為危險動作（刪除類），確認按鈕會套用 danger 樣式 */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 確認彈窗（刪除確認等），統一用這個而不是各頁面自己寫 window.confirm 或
 * 客製化的確認 UI，確保文案與按鈕樣式一致。
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '確定',
  cancelLabel = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      {description && <p className={styles.description}>{description}</p>}
      <div className={styles.actions}>
        <Button variant="secondary" fullWidth onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} fullWidth onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
