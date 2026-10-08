import fs from 'node:fs';
import path from 'node:path';
import { Client } from '@libsql/client';

/**
 * Cria todas as tabelas e índices necessários no SQLite/Turso.
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
  ];

  for (const sql of statements) {
    await client.execute(sql);
  }

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
