import type React from 'react';

export default function FadeImage({
  className = '',
  onLoad,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      ref={(el) => { if (el?.complete) el.classList.remove('opacity-0'); }}
      className={`opacity-0 transition-opacity duration-300${className ? ` ${className}` : ''}`}
      onLoad={(e) => {
        e.currentTarget.classList.remove('opacity-0');
        onLoad?.(e);
      }}
      {...props}
    />
  );
}
