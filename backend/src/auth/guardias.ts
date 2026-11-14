import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'
import { Rol } from '../usuarios/usuario.entity'
import { CLAVE_PUBLICO, CLAVE_ROLES, UsuarioSesion } from './decoradores'

/**
 * Guardia global: toda ruta exige un token JWT válido, salvo las marcadas con @Publico().
 * Si la ruta tiene @Roles(...), además revisa que el rol del usuario esté permitido.
 */
@Injectable()
export class GuardiaAutenticacion implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const destinos = [contexto.getHandler(), contexto.getClass()]
    const esPublico = this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, destinos)
    const peticion = contexto.switchToHttp().getRequest<Request & { usuario?: UsuarioSesion }>()

    const token = extraerToken(peticion)
    if (token) {
      try {
        const datos = await this.jwt.verifyAsync<{ sub: number; nombre: string; rol: Rol }>(token)
        peticion.usuario = { id: datos.sub, nombre: datos.nombre, rol: datos.rol }
      } catch {
        if (!esPublico) throw new UnauthorizedException('Tu sesión expiró o no es válida. Inicia sesión de nuevo.')
      }
    }

    if (esPublico) return true
    if (!peticion.usuario) throw new UnauthorizedException('Debes iniciar sesión.')

    const roles = this.reflector.getAllAndOverride<Rol[] | undefined>(CLAVE_ROLES, destinos)
    if (roles?.length && !roles.includes(peticion.usuario.rol)) {
      throw new ForbiddenException('Esta acción es solo para administradores.')
    }
    return true
  }
}

function extraerToken(peticion: Request): string | null {
  const [tipo, token] = peticion.headers.authorization?.split(' ') ?? []
  return tipo === 'Bearer' && token ? token : null
}
