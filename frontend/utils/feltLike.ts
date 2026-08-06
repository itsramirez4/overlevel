export const feltLikeLabel: Record<string, string> = {
  terrible: 'Terrible',
  bad: 'Mal',
  ok: 'Normal',
  good: 'Bien',
  amazing: 'Genial',
};

export const feltLikeOptions = Object.keys(feltLikeLabel) as (keyof typeof feltLikeLabel)[];
