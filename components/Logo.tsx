export default function Logo({ size = 24 }: { size?: number }) {
  return (
    <span className="logo" style={{ fontSize: size }} aria-label="Akashic REC">
      <span aria-hidden="true">Akashic</span>
      <span className="dot blink" aria-hidden="true" />
      <span className="rec" aria-hidden="true">REC</span>
    </span>
  );
}
