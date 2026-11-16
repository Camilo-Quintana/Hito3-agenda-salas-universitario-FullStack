import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Response } from 'express'
import { QueryFailedError } from 'typeorm'

/** Forma de todas las respuestas de error de la API */
export interface RespuestaError {
  statusCode: number
  error: string
  mensaje: string
  /** Errores por campo cuando falla la validación: { correo: ['...'] } */
  detalles?: Record<string, string[]>
}

const NOMBRES: Record<number, string> = {
  400: 'Solicitud inválida',
  401: 'No autenticado',
  403: 'Sin permiso',
  404: 'No encontrado',
  409: 'Conflicto',
  500: 'Error interno',
}

/**
 * Convierte cualquier error en una respuesta JSON uniforme.
 * Nunca envía al cliente el stack, el SQL ni datos de conexión: eso solo va al log del servidor.
 */
@Catch()
export class FiltroErrores implements ExceptionFilter {
  private readonly logger = new Logger('Errores')

  catch(error: unknown, host: ArgumentsHost) {
    const respuesta = host.switchToHttp().getResponse<Response>()
    const cuerpo = this.convertir(error)
    if (cuerpo.statusCode >= 500) this.logger.error(error instanceof Error ? error.stack : String(error))
    respuesta.status(cuerpo.statusCode).json(cuerpo)
  }

  private convertir(error: unknown): RespuestaError {
    if (error instanceof HttpException) {
      const status = error.getStatus()
      const contenido = error.getResponse()
      if (typeof contenido === 'object' && contenido !== null && 'mensaje' in contenido) {
        return { statusCode: status, error: NOMBRES[status] ?? 'Error', ...(contenido as object) } as RespuestaError
      }
      const mensaje =
        typeof contenido === 'string'
          ? contenido
          : Array.isArray((contenido as { message?: unknown }).message)
            ? ((contenido as { message: string[] }).message.join('. '))
            : String((contenido as { message?: unknown }).message ?? error.message)
      return { statusCode: status, error: NOMBRES[status] ?? 'Error', mensaje: traducir(status, mensaje) }
    }

    // Errores de PostgreSQL que la base detecta por sus restricciones
    if (error instanceof QueryFailedError) {
      const codigo = (error.driverError as { code?: string })?.code
      const restriccion = (error.driverError as { constraint?: string })?.constraint ?? ''
      if (codigo === '23505') return conflicto(mensajeUnico(restriccion))
      if (codigo === '23503') return conflicto('No se puede completar: el registro está relacionado con otros datos.')
      if (codigo === '23514' || codigo === '22P02' || codigo === '22007' || codigo === '22008') {
        return { statusCode: 400, error: NOMBRES[400], mensaje: 'Algún dato no cumple las reglas del sistema.' }
      }
    }

    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, error: NOMBRES[500], mensaje: 'Ocurrió un error inesperado. Intenta nuevamente.' }
  }
}

function conflicto(mensaje: string): RespuestaError {
  return { statusCode: 409, error: NOMBRES[409], mensaje }
}

// Mensajes legibles para los índices únicos del modelo
function mensajeUnico(restriccion: string): string {
  if (restriccion === 'uq_reservas_espacio_fecha_bloque_activa') return 'Ese horario ya está ocupado. Elige otro.'
  if (restriccion === 'uq_reservas_usuario_fecha_activa') return 'Ya tienes una reserva ese día. Solo se permite una por día.'
  if (restriccion === 'uq_espacios_edificio_nombre') return 'Ya existe un espacio con ese nombre en el edificio.'
  return 'Ya existe un registro con esos datos.'
}

// Mensajes por defecto de Nest en inglés que pueden llegar al usuario
function traducir(status: number, mensaje: string): string {
  if (status === 404 && mensaje.startsWith('Cannot ')) return 'La ruta solicitada no existe.'
  if (status === 401 && mensaje === 'Unauthorized') return 'Debes iniciar sesión.'
  if (status === 403 && mensaje === 'Forbidden resource') return 'No tienes permiso para esta acción.'
  if (status === 400 && mensaje.includes('JSON')) return 'El cuerpo de la solicitud no es un JSON válido.'
  return mensaje
}
