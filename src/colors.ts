export interface ColorOption {
    key: string;
    label: string;
    bg: string;
    text: string;
  }
  
  export const CATEGORY_COLORS: ColorOption[] = [
    { key: 'gray', label: '灰色', bg: '#E3E2E0', text: '#32302C' },
    { key: 'brown', label: '棕色', bg: '#EEE0DA', text: '#442A1E' },
    { key: 'orange', label: '橘色', bg: '#FADEC9', text: '#5C3B23' },
    { key: 'yellow', label: '黃色', bg: '#FDECC8', text: '#54450D' },
    { key: 'green', label: '綠色', bg: '#DBEDDB', text: '#28503F' },
    { key: 'blue', label: '藍色', bg: '#D3E5EF', text: '#1D3F5D' },
    { key: 'purple', label: '紫色', bg: '#E8DEEE', text: '#472C4D' },
    { key: 'pink', label: '粉色', bg: '#F5E0E9', text: '#4F2A3B' },
    { key: 'red', label: '紅色', bg: '#FFE2DD', text: '#5C231C' },
  ];
  
  export function getColor(key: string | null | undefined): ColorOption {
    return (
      CATEGORY_COLORS.find((c) => c.key === key) || {
        key: 'default',
        label: '未分類',
        bg: '#F1F1F0',
        text: '#666666',
      }
    );
  }