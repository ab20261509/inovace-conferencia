import { useState, ReactNode } from 'react';
import { AppDrawer } from './AppDrawer';
import { ModalConsultaProduto } from '../ModalConsultaProduto/ModalConsultaProduto';

interface AppLayoutProps {
  children: (props: {
    openDrawer: () => void;
    abrirConsultaProduto: () => void;
  }) => ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalConsultaOpen, setModalConsultaOpen] = useState(false);

  return (
    <>
      <AppDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onAbrirConsultaProduto={() => setModalConsultaOpen(true)}
      />

      {children({
        openDrawer: () => setDrawerOpen(true),
        abrirConsultaProduto: () => setModalConsultaOpen(true),
      })}

      <ModalConsultaProduto
        aberto={modalConsultaOpen}
        onFechar={() => setModalConsultaOpen(false)}
      />
    </>
  );
}
