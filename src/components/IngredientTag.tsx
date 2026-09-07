import { getColor } from '../colors';

function IngredientTag({ name, colorKey }: { name: string; colorKey?: string | null }) {
  const color = getColor(colorKey);
  return (
    <span
      style={{
        background: color.bg,
        color: color.text,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 13,
        display: 'inline-block',
      }}
    >
      {name}
    </span>
  );
}

export default IngredientTag;