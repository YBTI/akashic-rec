import { Fragment, type ReactNode } from 'react';

const RE = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*\n](?:[^*\n]|\*(?!\*))*?)\*\*/g;

/** **太字** と [文字](URL) を安全に表示する */
export default function Inline({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;
  while ((m = RE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] && m[2]) out.push(<a key={m.index} href={m[2]} target="_blank" rel="noopener noreferrer nofollow">{m[1]}</a>);
    else out.push(<strong key={m.index}>{m[3]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <Fragment>{out}</Fragment>;
}
