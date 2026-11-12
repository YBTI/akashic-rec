import Inline from './Inline';
import { imageUrl, type Block } from '@/lib/types';

const isHead = (b: Block) => (b.t === 'h2' || b.t === 'h3' || b.t === 'q') && b.text.trim() !== '';

export function Toc({ blocks }: { blocks: Block[] }) {
  const hs = blocks.map((b, i) => ({ b, i })).filter((x) => isHead(x.b));
  if (!hs.length) return null;
  const hasH2 = hs.some((x) => x.b.t === 'h2');
  return (
    <nav className="toc" aria-label="目次">
      <p className="toc-h">目次</p>
      <ol>
        {hs.map(({ b, i }) => (
          <li key={i} className={hasH2 && b.t !== 'h2' ? 'lv3' : ''}>
            <a href={`#h-${i}`}>{b.t !== 'img' ? b.text : ''}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function ArticleBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="body">
      {blocks.map((b, i) => {
        if (b.t === 'img') return (
          <figure className="fig" key={i}>
            <img src={imageUrl(b.path)} alt={b.cap || ''} loading="lazy" />
            {b.cap && <figcaption>{b.cap}</figcaption>}
          </figure>
        );
        if (!b.text.trim()) return null;
        if (b.t === 'h2') return <h2 className="bh2" id={`h-${i}`} key={i}>{b.text}</h2>;
        if (b.t === 'h3') return <h3 className="bh3" id={`h-${i}`} key={i}>{b.text}</h3>;
        if (b.t === 'q') return <h3 className="bq" id={`h-${i}`} key={i}><span aria-hidden="true">Q</span>{b.text}</h3>;
        return <p className="bp" key={i}><Inline text={b.text} /></p>;
      })}
    </div>
  );
}
