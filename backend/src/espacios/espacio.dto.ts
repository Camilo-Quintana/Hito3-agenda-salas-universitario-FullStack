import { ApiProperty, PartialType } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'
import { TipoEspacio } from './espacio.entity'

const recortar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)
const MENSAJE_TIPO = `El tipo debe ser uno de: ${Object.values(TipoEspacio).join(', ')}.`

export class EquipoAsignadoDto {
  @ApiProperty({ example: 2 })
  @IsInt({ message: 'equipamientoId debe ser un número entero.' })
  equipamientoId: number

  @ApiProperty({ example: 1 })
  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Min(1, { message: 'La cantidad debe ser al menos 1.' })
  @Max(500, { message: 'La cantidad puede ser como máximo 500.' })
  cantidad: number
}

export class CrearEspacioDto {
  @ApiProperty({ example: 'Sala 301' })
  @Transform(recortar)
  @IsString({ message: 'El nombre es obligatorio.' })
  @Length(3, 100, { message: 'El nombre debe tener entre 3 y 100 caracteres.' })
  nombre: string

  @ApiProperty({ enum: TipoEspacio, example: TipoEspacio.CLASES })
  @IsEnum(TipoEspacio, { message: MENSAJE_TIPO })
  tipo: TipoEspacio

  @ApiProperty({ required: false, example: 'cientifico', nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 30, { message: 'La categoría puede tener como máximo 30 caracteres.' })
  categoria?: string | null

  @ApiProperty({ example: 1 })
  @IsInt({ message: 'El edificio es obligatorio.' })
  edificioId: number

  @ApiProperty({ example: 2 })
  @IsInt({ message: 'El piso debe ser un número entero.' })
  @Min(1, { message: 'El piso debe ser 1 o más.' })
  piso: number

  @ApiProperty({ example: 20 })
  @IsInt({ message: 'La capacidad debe ser un número entero.' })
  @Min(1, { message: 'La capacidad debe ser al menos 1 persona.' })
  @Max(500, { message: 'La capacidad puede ser como máximo 500 personas.' })
  capacidad: number

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean({ message: 'requiereAprobacion debe ser verdadero o falso.' })
  requiereAprobacion?: boolean

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean({ message: 'activo debe ser verdadero o falso.' })
  activo?: boolean

  @ApiProperty({ type: [EquipoAsignadoDto], required: false })
  @IsOptional()
  @IsArray({ message: 'equipamiento debe ser una lista.' })
  @ArrayUnique((item: EquipoAsignadoDto) => item.equipamientoId, { message: 'Un equipo aparece repetido.' })
  @ValidateNested({ each: true })
  @Type(() => EquipoAsignadoDto)
  equipamiento?: EquipoAsignadoDto[]
}

export class ActualizarEspacioDto extends PartialType(CrearEspacioDto) {}

const aBooleano = ({ value }: { value: unknown }) => value === true || value === 'true'

export class ConsultaEspaciosDto {
  /** Busca en el nombre y en el equipamiento */
  @IsOptional()
  @Transform(recortar)
  @IsString()
  q?: string

  @IsOptional()
  @IsEnum(TipoEspacio, { message: MENSAJE_TIPO })
  tipo?: TipoEspacio

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'edificioId debe ser un número entero.' })
  edificioId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'capacidadMin debe ser un número entero.' })
  @Min(0)
  capacidadMin?: number

  /** Si viene, cada espacio incluye cuántos bloques libres tiene ese día */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha debe tener el formato AAAA-MM-DD.' })
  fecha?: string

  /** Solo administradores: incluye los espacios desactivados */
  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean()
  incluirInactivos?: boolean
}

export class ConsultaDisponibilidadDto {
  @ApiProperty({ example: '2026-11-12' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha debe tener el formato AAAA-MM-DD.' })
  fecha: string
}
