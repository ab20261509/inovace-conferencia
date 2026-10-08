/**
 * Definições e catálogo central de telas e campos sensíveis do sistema
 */

export interface CampoConfiguravel {
  chave: string;
  rotulo: string;
  descricao: string;
  sensivelPadrao: boolean;
}

export interface CatalogoTela {
  idTela: string;
  nomeTela: string;
  descricao: string;
  campos: CampoConfiguravel[];
}

/** Mapa de sensibilidade: { idTela: { chaveCampo: boolean } } */
export type CamposSensiveisConfig = Record<string, Record<string, boolean>>;

/**
 * Catálogo Central Raiz de Todas as Telas do Sistema.
 * Toda tela criada no sistema registra aqui os seus campos passíveis de restrição.
 */
export const CATALOGO_TELAS_SISTEMA: CatalogoTela[] = [
  {
    idTela: 'conferencia_saida',
    nomeTela: 'Conferência de Saída',
    descricao: 'Tela de conferência cega de separação e expedição de pedidos',
    campos: [
      {
        chave: 'qtdPed',
        rotulo: 'Quantidade Pedida',
        descricao: 'Quantidade total faturada no pedido de venda',
        sensivelPadrao: true,
      },
      {
        chave: 'codBarra',
        rotulo: 'Código de Barras',
        descricao: 'Código EAN / GTIN gravado no cadastro do produto',
        sensivelPadrao: true,
      },
      {
        chave: 'referencia',
        rotulo: 'Referência do Produto',
        descricao: 'Código de referência do fabricante',
        sensivelPadrao: true,
      },
      {
        chave: 'controle',
        rotulo: 'Lote / Controle',
        descricao: 'Identificador do lote de fabricação',
        sensivelPadrao: false,
      },
      {
        chave: 'codVol',
        rotulo: 'Unidade de Medida',
        descricao: 'Volume padrão ou unidade de embalagem (UN, CX, KG)',
        sensivelPadrao: false,
      },
      {
        chave: 'peso',
        rotulo: 'Peso Líquido / Bruto',
        descricao: 'Peso unitário do item em quilogramas',
        sensivelPadrao: false,
      },
    ],
  },
  {
    idTela: 'conferencia_entrada',
    nomeTela: 'Conferência de Entrada (Recebimento)',
    descricao: 'Recepção de mercadorias, conferência física e notas de fornecedores',
    campos: [
      {
        chave: 'qtdNota',
        rotulo: 'Quantidade da NF',
        descricao: 'Quantidade informada na nota fiscal do fornecedor',
        sensivelPadrao: true,
      },
      {
        chave: 'vlrUnit',
        rotulo: 'Valor / Custo Unitário',
        descricao: 'Preço unitário de compra dos produtos',
        sensivelPadrao: true,
      },
      {
        chave: 'codBarra',
        rotulo: 'Código de Barras',
        descricao: 'Código de barras do produto fornecido',
        sensivelPadrao: false,
      },
      {
        chave: 'referencia',
        rotulo: 'Referência do Fabricante',
        descricao: 'Código de catálogo do fornecedor',
        sensivelPadrao: false,
      },
      {
        chave: 'fornecedor',
        rotulo: 'Razão Social do Fornecedor',
        descricao: 'Nome e CNPJ da empresa emitente da nota',
        sensivelPadrao: false,
      },
    ],
  },
  {
    idTela: 'consulta_produtos',
    nomeTela: 'Consulta de Produtos e Estoque',
    descricao: 'Modal e tela de busca rápida de produtos no estoque',
    campos: [
      {
        chave: 'precoVenda',
        rotulo: 'Preço de Venda',
        descricao: 'Valor de tabela comercial de venda do produto',
        sensivelPadrao: true,
      },
      {
        chave: 'custo',
        rotulo: 'Custo Gerencial / Reposição',
        descricao: 'Custo de aquisição do estoque',
        sensivelPadrao: true,
      },
      {
        chave: 'estoqueOutrasEmpresas',
        rotulo: 'Estoque de Outras Filiais',
        descricao: 'Saldos de estoque de filiais diferentes da atual',
        sensivelPadrao: true,
      },
      {
        chave: 'estoqueLocal',
        rotulo: 'Estoque na Filial Atual',
        descricao: 'Quantidade disponível fisicamente na empresa',
        sensivelPadrao: false,
      },
    ],
  },
];
