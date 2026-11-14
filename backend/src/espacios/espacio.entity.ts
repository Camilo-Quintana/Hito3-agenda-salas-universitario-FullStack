import { Check, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { Edificio } from '../edificios/edificio.entity'
import { EspacioEquipamiento } from './espacio-equipamiento.entity'

export enum TipoEspacio {
  CLASES = 'Clases',
  LABORATORIO = 'Laboratorio',
  REUNION = 'Reunión',
  ESTUDIO = 'Estudio',
  EXTERIOR = 'Exterior',
}

@Entity('espacios')
@Index('uq_espacios_edificio_nombre', ['edificio', 'nombre'], { unique: true })
@Check('ck_espacios_capacidad', '"capacidad" > 0')
@Check('ck_espacios_piso', '"piso" >= 0')
export class Espacio {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 100 })
  nombre: string

  @Column({ type: 'enum', enum: TipoEspacio, enumName: 'tipo_espacio' })
  tipo: TipoEspacio

  /** Subcategoría opcional, por ejemplo "cientifico" para elegir la imagen de los laboratorios */
  @Column({ type: 'varchar', length: 30, nullable: true })
  categoria: string | null

  @Column({ type: 'smallint' })
  piso: number

  @Column({ type: 'smallint' })
  capacidad: number

  /** Si es true, las reservas quedan "pendientes" hasta que un administrador las apruebe */
  @Column({ name: 'requiere_aprobacion', type: 'boolean', default: false })
  requiereAprobacion: boolean

  /** Un espacio inactivo no aparece en el catálogo ni acepta reservas (mantenimiento, cierre) */
  @Column({ type: 'boolean', default: true })
  activo: boolean

  @ManyToOne(() => Edificio, (edificio) => edificio.espacios, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'edificio_id' })
  edificio: Edificio

  @Column({ name: 'edificio_id', type: 'int' })
  edificioId: number

  @OneToMany(() => EspacioEquipamiento, (item) => item.espacio, { cascade: true })
  equipamiento: EspacioEquipamiento[]
}
