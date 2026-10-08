import { ModulosUsuario, UsuarioAcessoInfo } from '../models/Auth';

export interface IAcessosService {
  obterMeusAcessos(): Promise<ModulosUsuario>;
  listarUsuarios(): Promise<UsuarioAcessoInfo[]>;
  salvarAcessos(codUsu: number, modulos: Partial<ModulosUsuario>): Promise<void>;
}
