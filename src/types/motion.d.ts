/**
 * Type declarations for framer-motion and motion/react
 * 
 * These modules have incomplete type definitions, so we extend them here.
 */

declare module 'motion/react' {
  import { ReactNode, CSSProperties, RefAttributes } from 'react';
  
  export interface MotionProps {
    initial?: Record<string, unknown>;
    animate?: Record<string, unknown>;
    exit?: Record<string, unknown>;
    transition?: Record<string, unknown>;
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
    [key: string]: unknown;
  }

  export interface AnimatePresenceProps {
    children?: ReactNode;
    mode?: 'sync' | 'popLayout' | 'wait';
    initial?: boolean;
    onExitComplete?: () => void;
  }

  export interface MotionConfigProps {
    children?: ReactNode;
    disabled?: boolean;
    [key: string]: unknown;
  }

  // Motion components factory
  interface MotionComponent {
    <P extends MotionProps>(Component: string): React.ForwardRefExoticComponent<P & MotionProps & RefAttributes<HTMLElement>>;
  }

  const motion: MotionComponent & {
    div: React.ForwardRefExoticComponent<HTMLDivAttributes & MotionProps & RefAttributes<HTMLDivElement>>;
    span: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLSpanElement>>;
    button: React.ForwardRefExoticComponent<ButtonHTMLAttributes & MotionProps & RefAttributes<HTMLButtonElement>>;
    input: React.ForwardRefExoticComponent<InputHTMLAttributes & MotionProps & RefAttributes<HTMLInputElement>>;
    p: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLParagraphElement>>;
    h1: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLHeadingElement>>;
    h2: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLHeadingElement>>;
    h3: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLHeadingElement>>;
    h4: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLHeadingElement>>;
    h5: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLHeadingElement>>;
    h6: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLHeadingElement>>;
    a: React.ForwardRefExoticComponent<AnchorHTMLAttributes & MotionProps & RefAttributes<HTMLAnchorElement>>;
    img: React.ForwardRefExoticComponent<ImgHTMLAttributes & MotionProps & RefAttributes<HTMLImageElement>>;
    ul: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLUListElement>>;
    ol: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLOListElement>>;
    li: React.ForwardRefExoticComponent<LiHTMLAttributes & MotionProps & RefAttributes<HTMLLIElement>>;
    form: React.ForwardRefExoticComponent<FormHTMLAttributes & MotionProps & RefAttributes<HTMLFormElement>>;
    label: React.ForwardRefExoticComponent<LabelHTMLAttributes & MotionProps & RefAttributes<HTMLLabelElement>>;
    nav: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLElement>>;
    main: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLElement>>;
    section: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLElement>>;
    article: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLElement>>;
    aside: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLElement>>;
    header: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLElement>>;
    footer: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLElement>>;
    div: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLDivElement>>;
    table: React.ForwardRefExoticComponent<TableHTMLAttributes & MotionProps & RefAttributes<HTMLTableElement>>;
    tbody: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLTableSectionElement>>;
    thead: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLTableSectionElement>>;
    tr: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLTableRowElement>>;
    td: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLTableCellElement>>;
    th: React.ForwardRefExoticComponent<HTMLAttributes & MotionProps & RefAttributes<HTMLTableCellElement>>;
    svg: React.ForwardRefExoticComponent<SVGAttributes & MotionProps & RefAttributes<SVGElement>>;
    path: React.ForwardRefExoticComponent<SVGAttributes & MotionProps & RefAttributes<SVGPathElement>>;
    circle: React.ForwardRefExoticComponent<SVGAttributes & MotionProps & RefAttributes<SVGCircleElement>>;
    rect: React.ForwardRefExoticComponent<SVGAttributes & MotionProps & RefAttributes<SVGRectElement>>;
    [key: string]: React.ForwardRefExoticComponent<Record<string, unknown> & RefAttributes<HTMLElement>>;
  };

  export const motion: MotionComponent & Record<string, React.ForwardRefExoticComponent<Record<string, unknown> & RefAttributes<HTMLElement>>>;
  export const AnimatePresence: React.FC<AnimatePresenceProps>;
  export const MotionConfig: React.FC<MotionConfigProps>;
}

declare module 'framer-motion' {
  import { ReactNode, CSSProperties, RefAttributes } from 'react';
  
  export interface MotionProps {
    initial?: Record<string, unknown>;
    animate?: Record<string, unknown>;
    exit?: Record<string, unknown>;
    transition?: Record<string, unknown>;
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
    [key: string]: unknown;
  }

  export interface AnimatePresenceProps {
    children?: ReactNode;
    mode?: 'sync' | 'popLayout' | 'wait';
    initial?: boolean;
    onExitComplete?: () => void;
  }

  export const motion: Record<string, React.ForwardRefExoticComponent<Record<string, unknown> & RefAttributes<HTMLElement>>>;
  export const AnimatePresence: React.FC<AnimatePresenceProps>;
}
