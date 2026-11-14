import { ApiProperty, PartialType } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator'

const recortar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

export class CrearEdificioDto {
  @ApiProperty({ example: 'D', description: 'Código corto que se muestra en la interfaz' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString({ message: 'El código es obligatorio.' })
  @Matches(/^[A-Z0-9-]{1,10}$/, { message: 'El código debe tener de 1 a 10 letras, números o guiones.' })
  codigo: string

  @ApiProperty({ example: 'Edificio D - Biblioteca' })
  @Transform(recortar)
  @IsString({ message: 'El nombre es obligatorio.' })
  @Length(3, 100, { message: 'El nombre debe tener entre 3 y 100 caracteres.' })
  nombre: string

  @ApiProperty({ example: 'Quillota 980, Viña del Mar', required: false })
  @IsOptional()
  @Transform(recortar)
  @IsString()
  @Length(0, 200, { message: 'La ubicación puede tener como máximo 200 caracteres.' })
  ubicacion?: string

  @ApiProperty({ example: 3 })
  @IsInt({ message: 'Los pisos deben ser un número entero.' })
  @Min(1, { message: 'El edificio debe tener al menos 1 piso.' })
  @Max(30, { message: 'El edificio puede tener como máximo 30 pisos.' })
  pisos: number
}

export class ActualizarEdificioDto extends PartialType(CrearEdificioDto) {}
