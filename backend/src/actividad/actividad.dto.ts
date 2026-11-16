import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator'
import { TIPOS_EVENTO, TipoEvento } from './evento.schema'

export class ConsultaActividadDto {
  /** Filtra por un tipo de evento */
  @IsOptional()
  @IsIn(TIPOS_EVENTO, { message: 'Tipo de evento desconocido.' })
  tipo?: TipoEvento

  /** Filtra por tipo de entidad: reserva, espacio, edificio, equipamiento o usuario */
  @IsOptional()
  @IsIn(['reserva', 'espacio', 'edificio', 'equipamiento', 'usuario'], { message: 'Entidad desconocida.' })
  entidad?: string

  /** Solo los eventos hechos por este usuario */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'actorId debe ser un número entero.' })
  actorId?: number

  /** Desde esta fecha (AAAA-MM-DD) */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'desde debe tener el formato AAAA-MM-DD.' })
  desde?: string

  /** Hasta esta fecha (AAAA-MM-DD) */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'hasta debe tener el formato AAAA-MM-DD.' })
  hasta?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pagina debe ser un número entero.' })
  @Min(1, { message: 'pagina debe ser 1 o más.' })
  pagina?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limite debe ser un número entero.' })
  @Min(1, { message: 'limite debe ser 1 o más.' })
  @Max(100, { message: 'limite puede ser como máximo 100.' })
  limite?: number
}
