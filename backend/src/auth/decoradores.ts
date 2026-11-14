import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common'
import { Rol } from '../usuarios/usuario.entity'

/** Lo que va dentro del token y queda disponible en cada petición */
export interface UsuarioSesion {
  id: number
  nombre: string
  rol: Rol
}

export const CLAVE_PUBLICO = 'publico'
export const CLAVE_ROLES = 'roles'

/** Marca una ruta como pública (no pide token) */
export const Publico = () => SetMetadata(CLAVE_PUBLICO, true)

/** Restringe una ruta a ciertos roles: @Roles(Rol.ADMIN) */
export const Roles = (...roles: Rol[]) => SetMetadata(CLAVE_ROLES, roles)

/** Inyecta el usuario de la sesión en el controlador: metodo(@UsuarioActual() usuario: UsuarioSesion) */
export const UsuarioActual = createParamDecorator((_dato: unknown, contexto: ExecutionContext): UsuarioSesion => {
  return contexto.switchToHttp().getRequest().usuario
})
