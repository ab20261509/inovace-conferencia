import { IAcessosService } from '../../domain/ports/IAcessosService';
import { ModulosUsuario, UsuarioAcessoInfo } from '../../domain/models/Auth';
import { httpClient } from './httpClient';

export class AcessosApiService implements IAcessosService {
  async obterMeusAcessos(): Promise<ModulosUsuario> {
    const response = await httpClient.get<{ modulos: ModulosUsuario }>('/api/acessos/me');
    return response.data.modulos;
  }

  async listarUsuarios(): Promise<UsuarioAcessoInfo[]> {
    const response = await httpClient.get<{ usuarios: UsuarioAcessoInfo[] }>('/api/acessos/usuarios');
    return response.data.usuarios;
  }

  async salvarAcessos(codUsu: number, modulos: Partial<ModulosUsuario>): Promise<void> {
    await httpClient.put(`/api/acessos/usuarios/${codUsu}`, { modulos });
  }
}
