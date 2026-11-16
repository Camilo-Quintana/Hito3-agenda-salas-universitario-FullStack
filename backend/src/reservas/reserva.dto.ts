import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator'
import { BLOQUES } from '../common/horario'
import { EstadoReserva } from './reserva.entity'

const recortar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)
const MENSAJE_ESTADO = `El estado debe ser uno de: ${Object.values(EstadoReserva).join(', ')}.`

export class CrearReservaDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'Elige un espacio.' })
  espacioId: number

  @ApiProperty({ example: '2026-11-12', description: 'Desde hoy hasta 7 días más' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe tener el formato AAAA-MM-DD.' })
  fecha: string

  @ApiProperty({ example: '10:00-11:00', enum: BLOQUES })
  @IsIn(BLOQUES, { message: 'Elige un horario válido.' })
  bloque: string

  @ApiProperty({ example: 'Estudio para la prueba de Cálculo' })
  @Transform(recortar)
  @IsString({ message: 'Cuéntanos para qué es la reserva.' })
  @Length(5, 200, { message: 'El motivo debe tener entre 5 y 200 caracteres.' })
  motivo: string

  @ApiProperty({ example: 4, description: 'No puede superar la capacidad del espacio' })
  @IsInt({ message: 'Los asistentes deben ser un número entero.' })
  @Min(1, { message: 'Debe asistir al menos 1 persona.' })
  @Max(500, { message: 'Máximo 500 asistentes.' })
  asistentes: number
}

export class RechazarReservaDto {
  @ApiProperty({ example: 'El laboratorio estará en mantención ese día.' })
  @Transform(recortar)
  @IsString({ message: 'Indica el motivo del rechazo.' })
  @Length(5, 300, { message: 'El motivo del rechazo debe tener entre 5 y 300 caracteres.' })
  observacion: string
}

export class CancelarReservaDto {
  @ApiProperty({ required: false, example: 'Se cambió la fecha de la reunión.' })
  @IsOptional()
  @Transform(recortar)
  @IsString()
  @Length(0, 300, { message: 'El motivo puede tener como máximo 300 caracteres.' })
  observacion?: string
}

export class ConsultaMisReservasDto {
  /** activas = pendientes o aprobadas que no han terminado; historial = todo lo demás */
  @IsOptional()
  @IsIn(['activas', 'historial'], { message: 'vista debe ser "activas" o "historial".' })
  vista?: 'activas' | 'historial'
}

export class ConsultaReservasDto {
  @IsOptional()
  @IsEnum(EstadoReserva, { message: MENSAJE_ESTADO })
  estado?: EstadoReserva

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'desde debe tener el formato AAAA-MM-DD.' })
  desde?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'hasta debe tener el formato AAAA-MM-DD.' })
  hasta?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  espacioId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  edificioId?: number

  /** Busca por nombre o RUT del solicitante, o por nombre del espacio */
  @IsOptional()
  @Transform(recortar)
  @IsString()
  q?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number
}
