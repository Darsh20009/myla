interface SarIconProps {
  className?: string;
  size?: number;
}

export default function SarIcon({ className = "", size = 14 }: SarIconProps) {
  return (
    <img
      src="/sar-icon.png"
      alt="ر.س"
      className={`inline-block align-middle select-none ${className}`}
      style={{ width: size, height: size, objectFit: "contain" }}
      draggable={false}
      aria-label="ريال سعودي"
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}
