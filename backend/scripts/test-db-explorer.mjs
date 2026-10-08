import { getLibsqlClient } from '../dist/infrastructure/database/libsqlClient.js';
import { AuditService } from '../dist/infrastructure/database/AuditService.js';
import { LibsqlDatabaseExplorerRepository } from '../dist/infrastructure/repositories/LibsqlDatabaseExplorerRepository.js';
import { initDatabaseSchema, garantirColuna } from '../dist/infrastructure/database/schema.js';

async function run() {
  console.log('🧪 Iniciando testes do Database Explorer Repository...');
  const client = getLibsqlClient();
  await initDatabaseSchema(client);

  const auditService = new AuditService(client);
  const repo = new LibsqlDatabaseExplorerRepository(client, auditService);

  // 1. Status
  const status = await repo.obterStatus();
  console.log('✅ Status do banco:', status);

  // 2. Documentação & Regras
  const docs = await repo.obterDocumentacao();
  console.log(`✅ Documentação carregada: ${docs.tabelas.length} tabelas descritas, ${docs.regrasArquiteturais.length} regras.`);
  if (docs.tabelas.length < 5) throw new Error('Documentação incompleta!');

  // 3. Teste de helper idempotente garantirColuna
  await garantirColuna(client, 'usuarios_acessos', 'teste_migracao', 'TEXT DEFAULT NULL');
  // Executa novamente para checar idempotência
  await garantirColuna(client, 'usuarios_acessos', 'teste_migracao', 'TEXT DEFAULT NULL');
  console.log('✅ garantirColuna testado com sucesso.');

  // 4. Listar tabelas
  const tabelas = await repo.listarTabelas();
  console.log('✅ Tabelas encontradas:', tabelas.map((t) => `${t.name} (${t.rowCount} rows, PKs: [${t.primaryKeys.join(',')}])`));

  // 5. Schema da tabela configuracoes_telas (PK composta)
  const schemaTelas = await repo.obterEstruturaTabela('configuracoes_telas');
  console.log('✅ Colunas configuracoes_telas:', schemaTelas.map((c) => `${c.name} (${c.type}, PK=${c.pk})`));

  // 6. Consultar registros com busca
  const queryRes = await repo.consultarRegistros('usuarios_acessos', { page: 1, limit: 10, search: 'ANTONY' });
  console.log(`✅ Consulta paginada: ${queryRes.total} total encontrados.`);

  // 7. Teste de CRUD com chave composta (configuracoes_telas)
  const idTelaTeste = 'tela_teste_unit';
  const chaveCampoTeste = 'campo_teste_unit';

  console.log('➕ Inserindo registro de teste...');
  await repo.inserirRegistro(
    'configuracoes_telas',
    { id_tela: idTelaTeste, chave_campo: chaveCampoTeste, sensivel: 0 },
    'TesterRobot',
  );

  console.log('✏️ Atualizando registro de teste...');
  await repo.atualizarRegistro(
    'configuracoes_telas',
    { id_tela: idTelaTeste, chave_campo: chaveCampoTeste },
    { sensivel: 1 },
    'TesterRobot',
  );

  const checagem = await repo.consultarRegistros('configuracoes_telas', { search: idTelaTeste });
  if (checagem.rows.length === 0 || checagem.rows[0].sensivel !== 1) {
    throw new Error('Falha ao validar atualização de registro.');
  }
  console.log('✅ Registro atualizado confirmado:', checagem.rows[0]);

  console.log('🗑️ Excluindo registro de teste...');
  await repo.excluirRegistro(
    'configuracoes_telas',
    { id_tela: idTelaTeste, chave_campo: chaveCampoTeste },
    'TesterRobot',
  );

  const checagemPosExclusao = await repo.consultarRegistros('configuracoes_telas', { search: idTelaTeste });
  if (checagemPosExclusao.rows.length !== 0) {
    throw new Error('Registro ainda existe após exclusão!');
  }
  console.log('✅ Registro excluído com sucesso.');

  // 8. Teste de Terminal SQL
  const sqlRes = await repo.executarQuerySql('SELECT count(*) as total_audit FROM logs_auditoria;', 'TesterRobot');
  console.log(`✅ Terminal SQL executado em ${sqlRes.executionTimeMs}ms:`, sqlRes.rows);

  console.log('🎉 TODOS OS TESTES DO DATABASE EXPLORER PASSARAM COM 100% DE SUCESSO!');
}

run().catch((err) => {
  console.error('❌ Falha nos testes:', err);
  process.exit(1);
});
