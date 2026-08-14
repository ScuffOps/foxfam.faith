export default function BobaAtlasSprite({ atlas, cell, src, className = "" }) {
  return (
    <span
      className={`boba-art-atlas ${className}`.trim()}
      style={{
        "--boba-atlas-columns": atlas.columns,
        "--boba-atlas-rows": atlas.rows,
        "--boba-atlas-x": `${-(cell.column * 100) / atlas.columns}%`,
        "--boba-atlas-y": `${-(cell.row * 100) / atlas.rows}%`,
      }}
      aria-hidden="true"
    >
      <img src={src} alt="" draggable="false" />
    </span>
  );
}
