import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Usuario } from '../usuarios/usuario.entity'
import { Espacio } from '../espacios/espacio.entity'

export enum EstadoReserva {
  PENDIENTE = 'pendiente',
  APROBADA = 'aprobada',
  RECHAZADA = 'rechazada',
  CANCELADA = 'cancelada',
}

/** Estados que ocupan el bloque: una reserva rechazada o cancelada lo deja libre */
export const ESTADOS_ACTIVOS = [EstadoReserva.PENDIENTE, EstadoReserva.APROBADA]

@Entity('reservas')
// Conflicto de horario a nivel de base de datos: un solo registro activo por espacio, fecha y bloque.
// Es un índice parcial: las reservas rechazadas o canceladas no cuentan.
@Index('uq_reservas_espacio_fecha_bloque_activa', ['espacio', 'fecha', 'bloque'], {
  unique: true,
  where: `"estado" IN ('pendiente', 'aprobada')`,
})
// Regla "una reserva activa por día" por estudiante, también garantizada por la base
@Index('uq_reservas_usuario_fecha_activa', ['usuario', 'fecha'], {
  unique: true,
  where: `"estado" IN ('pendiente', 'aprobada')`,
})
@Check('ck_reservas_asistentes', '"asistentes" > 0')
@Check('ck_reservas_bloque', `"bloque" ~ '^[0-2][0-9]:00-[0-2][0-9]:00$'`)
export class Reserva {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Usuario, (usuario) => usuario.reservas, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario

  @Column({ name: 'usuario_id', type: 'int' })
  usuarioId: number

  @ManyToOne(() => Espacio, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'espacio_id' })
  espacio: Espacio

  @Column({ name: 'espacio_id', type: 'int' })
  espacioId: number

  /** "AAAA-MM-DD" (Postgres date; TypeORM lo entrega como texto) */
  @Column({ type: 'date' })
  fecha: string

  /** "08:00-09:00" */
  @Column({ type: 'varchar', length: 11 })
  bloque: string

  @Column({ type: 'varchar', length: 200 })
  motivo: string

  @Column({ type: 'smallint', default: 1 })
  asistentes: number

  @Column({ type: 'enum', enum: EstadoReserva, enumName: 'estado_reserva', default: EstadoReserva.PENDIENTE })
  estado: EstadoReserva

  /** Motivo del rechazo o de la cancelación, si lo hay */
  @Column({ name: 'observacion', type: 'varchar', length: 300, nullable: true })
  observacion: string | null

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'revisada_por' })
  revisadaPor: Usuario | null

  @Column({ name: 'revisada_por', type: 'int', nullable: true })
  revisadaPorId: number | null

  @CreateDateColumn({ name: 'creada_en', type: 'timestamptz' })
  creadaEn: Date

  @UpdateDateColumn({ name: 'actualizada_en', type: 'timestamptz' })
  actualizadaEn: Date
}
