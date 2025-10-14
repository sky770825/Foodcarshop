/**
 * 📂 分类区块组件（可折叠）
 */

import { ReactNode } from 'react';
import { useUIStore } from '@/stores/useUIStore';

interface CategoryBlockProps {
  category: string;
  itemCount: number;
  children: ReactNode;
}

export function CategoryBlock({ category, itemCount, children }: CategoryBlockProps) {
  const { expandedCategories, toggleCategory } = useUIStore();

  const isExpanded = expandedCategories.has(category);
  const contentId = `category-${category}-content`;

  const handleToggle = () => {
    toggleCategory(category);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* 分类标题 */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        aria-label={`${category}分類，共${itemCount}項，點擊展開或收合`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        style={{
          fontSize: 'clamp(14px, 3.2vw, 15px)',
          fontWeight: 700,
          color: 'var(--primary)',
          background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
          padding: 'clamp(10px, 2.5vw, 12px) clamp(12px, 3vw, 14px)',
          borderRadius: 'clamp(8px, 2vw, 10px)',
          border: '1.5px solid #fed7aa',
          cursor: 'pointer',
          userSelect: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all .2s ease',
        }}
      >
        <span>
          {category} <small style={{ opacity: 0.7 }}>({itemCount}項)</small>
        </span>
        <span
          aria-hidden="true"
          style={{
            fontSize: 'clamp(16px, 4vw, 18px)',
            transition: 'transform .2s ease',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
          }}
        >
          ▼
        </span>
      </div>

      {/* 分类内容 */}
      <div
        id={contentId}
        role="region"
        aria-labelledby={`${category}-title`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(4px, 1vw, 5px)',
          marginTop: 'clamp(4px, 1vw, 5px)',
          maxHeight: isExpanded ? '2000px' : '0',
          overflow: 'hidden',
          transition: 'max-height .3s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}

