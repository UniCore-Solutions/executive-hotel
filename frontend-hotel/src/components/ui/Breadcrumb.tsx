import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="text-navy/45 flex flex-wrap items-center gap-x-0 gap-y-1 text-xs" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={item.label} className="flex items-center">
            {i > 0 && <span className="mx-2 text-navy/30">/</span>}
            {isLast || !item.href ? (
              <span className="text-navy/70 min-w-0 truncate">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-navy min-w-0 truncate transition-colors">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
