import React from 'react';

export interface SkeletonItensProps {
  linhas?: number;
  mensagem?: string;
}

export const SkeletonItens: React.FC<SkeletonItensProps> = ({
  linhas = 4,
  mensagem = 'Carregando dados dos lotes e itens...',
}) => {
  return (
    <div className="gestao-skeleton-container">
      <div
        style={{
          fontSize: '0.82rem',
          color: 'var(--slate-500)',
          marginBottom: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: '12px',
            height: '12px',
            border: '2px solid var(--slate-300)',
            borderTopColor: 'var(--slate-600)',
            borderRadius: '50%',
            animation: 'gestao-spin 0.8s linear infinite',
          }}
        />
        <span>{mensagem}</span>
      </div>
      {Array.from({ length: linhas }).map((_, i) => (
        <div
          key={i}
          className="gestao-skeleton-linha"
          style={{ opacity: 1 - i * 0.18 }}
        />
      ))}
    </div>
  );
};
