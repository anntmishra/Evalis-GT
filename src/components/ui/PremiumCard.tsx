import React, { ReactNode } from 'react';

interface PremiumCardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

const PremiumCard: React.FC<PremiumCardProps> = ({ children, title, subtitle, action, className = '' }) => {
  return (
    <div className={`bg-card rounded-xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] ${className}`}>
      {(title || action) && (
        <div className="px-6 py-5 border-b border-border/50 flex justify-between items-center bg-card">
          <div>
            {title && <h3 className="font-serif text-lg font-semibold text-foreground tracking-tight">{title}</h3>}
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5 font-sans">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6 bg-card font-sans text-foreground">
        {children}
      </div>
    </div>
  );
};

export default PremiumCard;
