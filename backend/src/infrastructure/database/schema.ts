import fs from 'node:fs';
import path from 'node:path';
import { Client } from '@libsql/client';

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * REGRA ARQUITETURAL MANDATÓRIA — EVOLUÇÃO DO BANCO DE DADOS (SQLite / Turso)
 * ══════════════════════════════════════════════════════════════════════════════
 * 1. Qualquer nova TABELA deve ser declarada em 'initDatabaseSchema' com
 *    'CREATE TABLE IF NOT EXISTS' e seus respectivos índices.
 * 2. Qualquer nova COLUNA adicionada a tabelas existentes DEVE ser declarada
 *    utilizando a função utilitária idempotente 'garantirColuna'.
 * 3. O dicionário de dados 'SCHEMA_DOCUMENTATION' no final deste arquivo deve
 *    ser mantido atualizado para alimentar a documentação viva do sistema.
 * 4. NUNCA execute alterações estruturais de DDL manuais em produção sem registrá-las aqui.
 * ══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Utilitário idempotente para adicionar novas colunas com segurança.
 * Inspeciona as colunas existentes via PRAGMA table_info e executa ALTER TABLE
 * somente caso a coluna ainda não exista.
 */
export async function garantirColuna(
  client: Client,
  tabela: string,
  coluna: string,
  tipoDef: string,
): Promise<void> {
  try {
    const info = await client.execute(`PRAGMA table_info(${tabela});`);
    const jaExiste = info.rows.some((row: any) => String(row.name).toLowerCase() === coluna.toLowerCase());

    if (!jaExiste) {
      await client.execute(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${tipoDef};`);
      console.log(`✨ [Schema] Coluna '${coluna}' (${tipoDef}) adicionada com sucesso à tabela '${tabela}'.`);
    }
  } catch (err: any) {
    console.error(`❌ [Schema] Falha ao verificar/adicionar coluna '${coluna}' na tabela '${tabela}':`, err.message);
  }
}

/**
 * Cria todas as tabelas, índices e migrações estruturais necessárias no SQLite/Turso.
 */
export async function initDatabaseSchema(client: Client): Promise<void> {
  const statements = [
    // 1. Tabela de permissões e auditoria de acessos
    `CREATE TABLE IF NOT EXISTS usuarios_acessos (
      cod_usu INTEGER PRIMARY KEY,
      nome_usu TEXT NOT NULL,
      modulos_json TEXT NOT NULL,
      primeiro_acesso_em TEXT,
      ultimo_acesso_em TEXT,
      atualizado_em TEXT NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_usuarios_nome ON usuarios_acessos(nome_usu);`,

    // 2. Configurações de campos sensíveis por tela
    `CREATE TABLE IF NOT EXISTS configuracoes_telas (
      id_tela TEXT NOT NULL,
      chave_campo TEXT NOT NULL,
      sensivel INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (id_tela, chave_campo)
    );`,

    // 3. Sessões de conferência de entrada (Recebimento)
    `CREATE TABLE IF NOT EXISTS conferencias_entrada (
      id TEXT PRIMARY KEY,
      nunotas_json TEXT NOT NULL,
      status TEXT NOT NULL,
      nivel_atual INTEGER NOT NULL DEFAULT 1,
      conferente TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_conf_status ON conferencias_entrada(status);`,

    // 4. Bipagens individuais com rastreabilidade de lote e validade
    `CREATE TABLE IF NOT EXISTS bipagens_entrada (
      id TEXT PRIMARY KEY,
      conferencia_id TEXT NOT NULL,
      nunota INTEGER NOT NULL,
      codprod INTEGER NOT NULL,
      sequencia INTEGER NOT NULL,
      codbarra TEXT NOT NULL,
      qtd_conferida REAL NOT NULL,
      nivel INTEGER NOT NULL,
      conferente TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      lote TEXT,
      validade TEXT,
      fabricacao TEXT,
      anulado INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (conferencia_id) REFERENCES conferencias_entrada(id) ON DELETE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS idx_bip_conf ON bipagens_entrada(conferencia_id);`,
    `CREATE INDEX IF NOT EXISTS idx_bip_barra ON bipagens_entrada(codbarra);`,
    `CREATE INDEX IF NOT EXISTS idx_bip_prod ON bipagens_entrada(codprod);`,

    // 5. Trilha de auditoria e segurança
    `CREATE TABLE IF NOT EXISTS logs_auditoria (
      id TEXT PRIMARY KEY,
      usuario TEXT NOT NULL,
      acao TEXT NOT NULL,
      recurso TEXT NOT NULL,
      detalhes_json TEXT,
      timestamp TEXT NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_audit_usuario ON logs_auditoria(usuario);`,
    `CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON logs_auditoria(timestamp);`,

    // 6. Configurações e parâmetros globais do sistema
    `CREATE TABLE IF NOT EXISTS configuracoes_sistema (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      descricao TEXT,
      atualizado_em TEXT NOT NULL
    );`,
    `INSERT OR IGNORE INTO configuracoes_sistema (chave, valor, descricao, atualizado_em)
     VALUES ('conferencia_entrada_nivel2_ativo', 'true', 'Ativa a 2ª contagem obrigatória (N2 com Lote e Validade) no Recebimento de Mercadorias', datetime('now'));`,
  ];

  for (const sql of statements) {
    await client.execute(sql);
  }

  // Evolução da tabela conferencias_entrada (gestão e envio ao Sankhya)
  await garantirColuna(client, 'conferencias_entrada', 'aprovado_por', 'TEXT');
  await garantirColuna(client, 'conferencias_entrada', 'aprovado_em', 'TEXT');
  await garantirColuna(client, 'conferencias_entrada', 'enviado_sankhya_em', 'TEXT');
  await garantirColuna(client, 'conferencias_entrada', 'observacao_aprovacao', 'TEXT');
  await garantirColuna(client, 'conferencias_entrada', 'resposta_sankhya_json', 'TEXT');

  // Executa migração dos arquivos JSON legados, se existirem
  await migrarDadosLegadosJson(client);
}

/**
 * Migra dados de acessos.json, campos_telas.json e conferencias_entrada.json
 * para o SQLite/Turso preservando todo o histórico existente.
 */
async function migrarDadosLegadosJson(client: Client): Promise<void> {
  const baseDir = path.resolve(process.cwd(), fs.existsSync('/app/data') ? '/app/data' : 'backend/data');
  const fallbackDir = path.resolve(process.cwd(), 'data');
  const targetDir = fs.existsSync(baseDir) ? baseDir : fallbackDir;

  if (!fs.existsSync(targetDir)) return;

  // 1. Migração de acessos.json
  const fileAcessos = path.join(targetDir, 'acessos.json');
  if (fs.existsSync(fileAcessos)) {
    try {
      const conteudo = fs.readFileSync(fileAcessos, 'utf-8');
      const dados = JSON.parse(conteudo);
      const registros = Object.values(dados) as any[];

      for (const item of registros) {
        if (!item.codUsu) continue;
        await client.execute({
          sql: `INSERT OR REPLACE INTO usuarios_acessos (cod_usu, nome_usu, modulos_json, primeiro_acesso_em, ultimo_acesso_em, atualizado_em)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            item.codUsu,
            item.nomeUsu || '',
            JSON.stringify(item.modulos || {}),
            item.primeiroAcessoEm || null,
            item.ultimoAcessoEm || null,
            item.atualizadoEm || new Date().toISOString(),
          ],
        });
      }
      console.log(`✅ [Migração] ${registros.length} usuários migrados de acessos.json para SQLite/Turso.`);
      fs.renameSync(fileAcessos, `${fileAcessos}.bak`);
    } catch (err: any) {
      console.error('❌ [Migração] Falha ao migrar acessos.json:', err.message);
    }
  }

  // 2. Migração de campos_telas.json
  const fileCampos = path.join(targetDir, 'campos_telas.json');
  if (fs.existsSync(fileCampos)) {
    try {
      const conteudo = fs.readFileSync(fileCampos, 'utf-8');
      const dados = JSON.parse(conteudo);
      let countCampos = 0;

      for (const [idTela, campos] of Object.entries(dados)) {
        for (const [chaveCampo, sensivel] of Object.entries(campos as Record<string, boolean>)) {
          await client.execute({
            sql: `INSERT OR REPLACE INTO configuracoes_telas (id_tela, chave_campo, sensivel)
                  VALUES (?, ?, ?)`,
            args: [idTela, chaveCampo, sensivel ? 1 : 0],
          });
          countCampos++;
        }
      }
      console.log(`✅ [Migração] ${countCampos} regras de campos migradas de campos_telas.json para SQLite/Turso.`);
      fs.renameSync(fileCampos, `${fileCampos}.bak`);
    } catch (err: any) {
      console.error('❌ [Migração] Falha ao migrar campos_telas.json:', err.message);
    }
  }

  // 3. Migração de conferencias_entrada.json
  const fileConf = path.join(targetDir, 'conferencias_entrada.json');
  if (fs.existsSync(fileConf)) {
    try {
      const conteudo = fs.readFileSync(fileConf, 'utf-8');
      const dados = JSON.parse(conteudo);
      const sessoes = Object.values(dados.sessoes || {}) as any[];
      const bipagensMap = (dados.bipagens || {}) as Record<string, any[]>;

      for (const sessao of sessoes) {
        if (!sessao.id) continue;
        await client.execute({
          sql: `INSERT OR REPLACE INTO conferencias_entrada (id, nunotas_json, status, nivel_atual, conferente, criado_em, atualizado_em)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            sessao.id,
            JSON.stringify(sessao.nunotas || []),
            sessao.status || 'N1 em Andamento',
            sessao.nivelAtual || 1,
            sessao.conferente || 'Operador',
            sessao.criadoEm || new Date().toISOString(),
            sessao.atualizadoEm || new Date().toISOString(),
          ],
        });
      }

      let countBips = 0;
      for (const lista of Object.values(bipagensMap)) {
        for (const bip of lista) {
          if (!bip.id) continue;
          await client.execute({
            sql: `INSERT OR REPLACE INTO bipagens_entrada
                  (id, conferencia_id, nunota, codprod, sequencia, codbarra, qtd_conferida, nivel, conferente, timestamp, lote, validade, fabricacao, anulado)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              bip.id,
              bip.conferenciaId,
              bip.nunota,
              bip.codprod,
              bip.sequencia,
              bip.codbarra,
              bip.qtdConferida,
              bip.nivel || 1,
              bip.conferente || 'Operador',
              bip.timestamp || new Date().toISOString(),
              bip.lote || null,
              bip.validade || null,
              bip.fabricacao || null,
              bip.anulado ? 1 : 0,
            ],
          });
          countBips++;
        }
      }

      console.log(`✅ [Migração] ${sessoes.length} sessões e ${countBips} bipagens migradas de conferencias_entrada.json.`);
      fs.renameSync(fileConf, `${fileConf}.bak`);
    } catch (err: any) {
      console.error('❌ [Migração] Falha ao migrar conferencias_entrada.json:', err.message);
    }
  }
}

/**
 * Metadados estáticos do Dicionário de Dados e Relacionamentos.
 * Consumido pela API e renderizado diretamente na interface para documentação viva do sistema.
 */
export const SCHEMA_DOCUMENTATION = {
  regrasArquiteturais: [
    'Toda e qualquer nova tabela ou coluna DEVE ser declarada neste arquivo (backend/src/infrastructure/database/schema.ts).',
    'Novas tabelas são declaradas com CREATE TABLE IF NOT EXISTS e índices em initDatabaseSchema.',
    'Novas colunas em tabelas existentes DEVEM ser aplicadas com a função idempotente garantirColuna(client, tabela, coluna, definicao).',
    'Todas as operações de escrita realizadas via interface de gerenciamento registram eventos na tabela logs_auditoria.',
  ],
  relacionamentos: [
    {
      origem: 'conferencias_entrada',
      cardinalidade: '1:N (ON DELETE CASCADE)',
      destino: 'bipagens_entrada',
      chave: 'conferencias_entrada.id = bipagens_entrada.conferencia_id',
      descricao: 'Uma sessão de recebimento agrupa N bipagens unitárias ou por embalagem realizadas pelos conferentes.',
    },
    {
      origem: 'usuarios_acessos',
      cardinalidade: '1:N (Auditoria / Referência)',
      destino: 'logs_auditoria',
      chave: 'usuarios_acessos.nome_usu = logs_auditoria.usuario',
      descricao: 'Cada ação de auditoria armazena o nome e histórico do usuário solicitante.',
    },
  ],
  tabelas: [
    {
      nome: 'usuarios_acessos',
      descricao: 'Armazena privilégios e permissões de módulos por usuário, histórico de logins e acessos.',
      colunas: [
        { nome: 'cod_usu', tipo: 'INTEGER', pk: true, notnull: true, descricao: 'Código numérico do usuário no ERP Sankhya (CODUSU).' },
        { nome: 'nome_usu', tipo: 'TEXT', pk: false, notnull: true, descricao: 'Nome de login do usuário no Sankhya (NOMEUSU).' },
        { nome: 'modulos_json', tipo: 'TEXT', pk: false, notnull: true, descricao: 'JSON com os privilégios booleanos (conferencia_saida, conferencia_entrada, consulta_produtos, ver_campos_sensiveis, gerenciar_acessos).' },
        { nome: 'primeiro_acesso_em', tipo: 'TEXT', pk: false, notnull: false, descricao: 'Timestamp ISO 8601 da data e hora do primeiro login registrado no sistema.' },
        { nome: 'ultimo_acesso_em', tipo: 'TEXT', pk: false, notnull: false, descricao: 'Timestamp ISO 8601 do último login realizado.' },
        { nome: 'atualizado_em', tipo: 'TEXT', pk: false, notnull: true, descricao: 'Timestamp ISO 8601 da última alteração de permissões.' },
      ],
    },
    {
      nome: 'configuracoes_telas',
      descricao: 'Configura a política de visibilidade de campos sensíveis (como preços, custos e margem) por tela.',
      colunas: [
        { nome: 'id_tela', tipo: 'TEXT', pk: true, notnull: true, descricao: 'Identificador do módulo ou tela (ex: conferencia_saida, conferencia_entrada).' },
        { nome: 'chave_campo', tipo: 'TEXT', pk: true, notnull: true, descricao: 'Identificador do campo na tela (ex: vlrvenda, margem, custo).' },
        { nome: 'sensivel', tipo: 'INTEGER', pk: false, notnull: true, descricao: '1 se o campo é sensível e requer permissão ver_campos_sensiveis; 0 se é visível para todos.' },
      ],
    },
    {
      nome: 'conferencias_entrada',
      descricao: 'Controla as sessões ativas e finalizadas do módulo de Conferência de Entrada (Recebimento).',
      colunas: [
        { nome: 'id', tipo: 'TEXT', pk: true, notnull: true, descricao: 'UUID identificador único da sessão de recebimento.' },
        { nome: 'nunotas_json', tipo: 'TEXT', pk: false, notnull: true, descricao: 'JSON array com os números únicos de notas (NUNOTA) conferidos nesta sessão.' },
        { nome: 'status', tipo: 'TEXT', pk: false, notnull: true, descricao: 'Estado atual do processo (ex: "N1 em Andamento", "N2 em Andamento", "Conferido", "Divergente", "Enviado ao Sankhya").' },
        { nome: 'nivel_atual', tipo: 'INTEGER', pk: false, notnull: true, descricao: 'Nível de contagem corrente (1 = 1ª Contagem, 2 = 2ª Contagem/Recontagem, 3 = Auditoria).' },
        { nome: 'conferente', tipo: 'TEXT', pk: false, notnull: true, descricao: 'Nome do conferente responsável pela abertura da sessão.' },
        { nome: 'criado_em', tipo: 'TEXT', pk: false, notnull: true, descricao: 'Timestamp ISO 8601 de criação da sessão.' },
        { nome: 'atualizado_em', tipo: 'TEXT', pk: false, notnull: true, descricao: 'Timestamp ISO 8601 da última bipagem ou alteração de status.' },
        { nome: 'aprovado_por', tipo: 'TEXT', pk: false, notnull: false, descricao: 'Nome do gestor que aprovou a conferência para envio ao ERP.' },
        { nome: 'aprovado_em', tipo: 'TEXT', pk: false, notnull: false, descricao: 'Timestamp ISO 8601 da aprovação gerencial.' },
        { nome: 'enviado_sankhya_em', tipo: 'TEXT', pk: false, notnull: false, descricao: 'Timestamp ISO 8601 da sincronização/envio bem-sucedido ao Sankhya.' },
        { nome: 'observacao_aprovacao', tipo: 'TEXT', pk: false, notnull: false, descricao: 'Justificativa ou parecer do gestor na aprovação da carga.' },
        { nome: 'resposta_sankhya_json', tipo: 'TEXT', pk: false, notnull: false, descricao: 'Retorno serializado da gravação no Sankhya (TGFITE / TGFEST).' },
      ],
    },
    {
      nome: 'bipagens_entrada',
      descricao: 'Histórico item a item de todas as bipagens realizadas na conferência de entrada, com rastreabilidade.',
      colunas: [
        { nome: 'id', tipo: 'TEXT', pk: true, notnull: true, descricao: 'UUID único do bip individual.' },
        { nome: 'conferencia_id', tipo: 'TEXT', pk: false, notnull: true, descricao: 'Chave estrangeira vinculada a conferencias_entrada.id (DELETE CASCADE).' },
        { nome: 'nunota', tipo: 'INTEGER', pk: false, notnull: true, descricao: 'Número único da nota fiscal no Sankhya (TGFCAB.NUNOTA).' },
        { nome: 'codprod', tipo: 'INTEGER', pk: false, notnull: true, descricao: 'Código do produto conferido (TGFPRO.CODPROD).' },
        { nome: 'sequencia', tipo: 'INTEGER', pk: false, notnull: true, descricao: 'Sequência do item na nota (TGFITE.SEQUENCIA).' },
        { nome: 'codbarra', tipo: 'TEXT', pk: false, notnull: true, descricao: 'Código de barras exato escaneado no coletor ou leitor.' },
        { nome: 'qtd_conferida', tipo: 'REAL', pk: false, notnull: true, descricao: 'Quantidade acrescentada na conferência (computando fator da embalagem se houver).' },
        { nome: 'nivel', tipo: 'INTEGER', pk: false, notnull: true, descricao: 'Nível da contagem no momento do bip (1 = N1, 2 = N2).' },
        { nome: 'conferente', tipo: 'TEXT', pk: false, notnull: true, descricao: 'Nome do operador que bipou o produto.' },
        { nome: 'timestamp', tipo: 'TEXT', pk: false, notnull: true, descricao: 'Data e hora exata da leitura (ISO 8601).' },
        { nome: 'lote', tipo: 'TEXT', pk: false, notnull: false, descricao: 'Identificador do lote do produto (se produto controlado por lote).' },
        { nome: 'validade', tipo: 'TEXT', pk: false, notnull: false, descricao: 'Data de validade informada na contagem.' },
        { nome: 'fabricacao', tipo: 'TEXT', pk: false, notnull: false, descricao: 'Data de fabricação informada.' },
        { nome: 'anulado', tipo: 'INTEGER', pk: false, notnull: true, descricao: '0 = Bip ativo; 1 = Bip anulado/estornado pelo conferente.' },
      ],
    },
    {
      nome: 'logs_auditoria',
      descricao: 'Registro centralizado de eventos operacionais, segurança, exclusões, estornos e updates estruturais.',
      colunas: [
        { nome: 'id', tipo: 'TEXT', pk: true, notnull: true, descricao: 'UUID identificador do registro de auditoria.' },
        { nome: 'usuario', tipo: 'TEXT', pk: false, notnull: true, descricao: 'Nome do usuário ou sistema que disparou a ação.' },
        { nome: 'acao', tipo: 'TEXT', pk: false, notnull: true, descricao: 'Tipo da operação (ex: ESTORNO_BIPAGEM, DATABASE_UPDATE, DATABASE_DELETE).' },
        { nome: 'recurso', tipo: 'TEXT', pk: false, notnull: true, descricao: 'Entidade ou tabela afetada pela ação.' },
        { nome: 'detalhes_json', tipo: 'TEXT', pk: false, notnull: false, descricao: 'JSON contendo o contexto completo, valores antes/depois ou parâmetros da operação.' },
        { nome: 'timestamp', tipo: 'TEXT', pk: false, notnull: true, descricao: 'Momento exato da ocorrência (ISO 8601).' },
      ],
    },
    {
      nome: 'configuracoes_sistema',
      descricao: 'Parâmetros operacionais e regras de fluxo corporativas globais.',
      colunas: [
        { nome: 'chave', tipo: 'TEXT', pk: true, notnull: true, descricao: 'Identificador único do parâmetro (ex: conferencia_entrada_nivel2_ativo).' },
        { nome: 'valor', tipo: 'TEXT', pk: false, notnull: true, descricao: 'Valor do parâmetro ("true", "false", numérico ou JSON).' },
        { nome: 'descricao', tipo: 'TEXT', pk: false, notnull: false, descricao: 'Explicação do impacto operacional da configuração.' },
        { nome: 'atualizado_em', tipo: 'TEXT', pk: false, notnull: true, descricao: 'Timestamp ISO 8601 da última alteração.' },
      ],
    },
  ],
};
