import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { Reserva } from '../reservas/reserva.entity'

export enum Rol {
  ESTUDIANTE = 'estudiante',
  ADMIN = 'admin',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number

  /** Se guarda formateado: "12.345.678-5" */
  @Column({ type: 'varchar', length: 12, unique: true })
  rut: string

  @Column({ type: 'varchar', length: 100 })
  nombre: string

  @Column({ type: 'varchar', length: 120, unique: true })
  correo: string

  /** Nunca se envía al cliente: select:false lo excluye de las consultas normales */
  @Column({ name: 'password_hash', type: 'varchar', length: 100, select: false })
  passwordHash: string

  @Column({ type: 'enum', enum: Rol, enumName: 'rol_usuario', default: Rol.ESTUDIANTE })
  rol: Rol

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date

  @OneToMany(() => Reserva, (reserva) => reserva.usuario)
  reservas: Reserva[]
}
