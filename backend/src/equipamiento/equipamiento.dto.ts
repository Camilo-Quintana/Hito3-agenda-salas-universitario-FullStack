import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsString, Length } from 'class-validator'

export class GuardarEquipamientoDto {
  @ApiProperty({ example: 'Proyector' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El nombre es obligatorio.' })
  @Length(2, 60, { message: 'El nombre debe tener entre 2 y 60 caracteres.' })
  nombre: string
}
