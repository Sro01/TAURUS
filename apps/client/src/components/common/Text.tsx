import { ReactNode, ElementType } from 'react';

type TextVariant = 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'subtitle' 
  | 'body' 
  | 'caption' 
  | 'label';

interface TextProps {
  children: ReactNode;
  variant?: TextVariant;
  as?: ElementType;
  className?: string;
  color?: 'main' | 'sub' | 'muted' | 'brand' | 'error';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
}

const variantStyles: Record<TextVariant, string> = {
  h1: 'text-3xl md:text-4xl font-bold tracking-tight',
  h2: 'text-2xl md:text-3xl font-bold tracking-tight',
  h3: 'text-xl md:text-2xl font-bold tracking-tight border-b border-border pb-2',
  subtitle: 'text-lg font-semibold',
  body: 'text-base',
  caption: 'text-sm text-text-sub leading-relaxed',
  label: 'text-sm font-medium tracking-wide',
};

const colorStyles = {
  main: 'text-text-main',
  sub: 'text-text-sub',
  muted: 'text-text-muted',
  brand: 'text-brand-red',
  error: 'text-status-danger',
};

const weightStyles = {
  regular: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

const alignStyles = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function Text({ 
  children, 
  variant = 'body', 
  as, 
  className = '', 
  color = 'main',
  weight,
  align = 'left',
}: TextProps) {
  // mapping variant to default element if 'as' is not provided
  const Component = as || (
    variant === 'h1' ? 'h1' :
    variant === 'h2' ? 'h2' :
    variant === 'h3' ? 'h3' :
    variant === 'label' ? 'label' :
    'p'
  );

  const combinedClasses = [
    variantStyles[variant],
    colorStyles[color],
    weight ? weightStyles[weight] : '',
    alignStyles[align],
    className
  ].join(' ');

  return (
    <Component className={combinedClasses.trim()}>
      {children}
    </Component>
  );
}
