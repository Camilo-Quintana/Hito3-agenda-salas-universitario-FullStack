import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches, Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator'
import { validarRut } from '../common/rut'
import { Rol } from '../usuarios/usuario.entity'

@ValidatorConstraint({ name: 'rutValido' })
export class RutValido implements ValidatorConstraintInterface {
  validate(valor: unknown) {
    return typeof valor === 'string' && validarRut(valor)
  }
  defaultMessage() {
    return 'RUT inválido: revisa el dígito verificador (ejemplo: 12.345.678-5).'
  }
}

const recortar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)
const minusculas = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)

export class RegistroDto {
  @ApiProperty({ example: '12.345.678-5' })
  @IsString({ message: 'El RUT es obligatorio.' })
  @Validate(RutValido)
  rut: string

  @ApiProperty({ example: 'Estudiante Demo' })
  @Transform(recortar)
  @IsString({ message: 'El nombre es obligatorio.' })
  @Length(3, 100, { message: 'El nombre debe tener entre 3 y 100 caracteres.' })
  nombre: string

  @ApiProperty({ example: 'demo@uandresbello.edu' })
  @Transform(minusculas)
  @IsEmail({}, { message: 'Ingresa un correo válido (por ejemplo, nombre@uandresbello.edu).' })
  correo: string

  @ApiProperty({ example: 'Clave1234', description: 'Mínimo 8 caracteres, con al menos una letra y un número' })
  @IsString({ message: 'La contraseña es obligatoria.' })
  @Length(8, 72, { message: 'La contraseña debe tener entre 8 y 72 caracteres.' })
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, { message: 'La contraseña debe tener al menos una letra y un número.' })
  password: string
}

export class LoginDto {
  @ApiProperty({ example: 'demo@uandresbello.edu' })
  @Transform(minusculas)
  @IsEmail({}, { message: 'Ingresa un correo válido.' })
  correo: string

  @ApiProperty({ example: 'Demo1234' })
  @IsString({ message: 'La contraseña es obligatoria.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  password: string
}

export class ActualizarPerfilDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(recortar)
  @IsString()
  @Length(3, 100, { message: 'El nombre debe tener entre 3 y 100 caracteres.' })
  nombre?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(minusculas)
  @IsEmail({}, { message: 'Ingresa un correo válido (por ejemplo, nombre@uandresbello.edu).' })
  correo?: string
}

/** Lo que la API devuelve de un usuario (nunca la contraseña) */
export class UsuarioRespuesta {
  id: number
  rut: string
  nombre: string
  correo: string
  rol: Rol
}

export class SesionRespuesta {
  token: string
  usuario: UsuarioRespuesta
}
