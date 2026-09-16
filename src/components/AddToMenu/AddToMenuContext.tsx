import React, { createContext, useCallback, useContext, useState } from 'react';
import { CourseType, MealType } from '../../db';
import { AddToMenuSheet } from './AddToMenuSheet';

/**
 * 「快速加菜」sheet 的目標位置。全部欄位都可省略：
 * - date 省略 = 今天
 * - meal 省略 = 依現在時間猜一個(早上→早餐、下午→午餐、其餘→晚餐)
 * - course 省略 = 主菜
 * - query 省略 = 空白搜尋框
 *
 * 對齊 README「快速加菜」畫面：這是一個全域共用的底部 sheet，
 * 從食譜列表的「排菜單」次要按鈕、單日菜單每個餐點類型區塊的＋鈕
 * 都會打開同一顆 sheet，只是帶入的目標不一樣。
 */
export interface AddToMenuTarget {
  date?: string;
  meal?: MealType;
  course?: CourseType;
  query?: string;
}

interface AddToMenuContextValue {
  openAddToMenu: (target?: AddToMenuTarget) => void;
}

const AddToMenuContext = createContext<AddToMenuContextValue | null>(null);

export function AddToMenuProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<AddToMenuTarget | null>(null);

  const openAddToMenu = useCallback((t: AddToMenuTarget = {}) => {
    setTarget(t);
  }, []);

  const close = useCallback(() => setTarget(null), []);

  return (
    <AddToMenuContext.Provider value={{ openAddToMenu }}>
      {children}
      <AddToMenuSheet open={!!target} target={target} onClose={close} />
    </AddToMenuContext.Provider>
  );
}

/** 任何頁面要「把某道菜加進某天某餐某類型」都呼叫這個，不要自己另外做一套挑選流程。 */
export function useAddToMenu() {
  const ctx = useContext(AddToMenuContext);
  if (!ctx) {
    throw new Error('useAddToMenu 必須在 <AddToMenuProvider> 內使用');
  }
  return ctx;
}
