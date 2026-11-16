import { Check, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { Espacio } from './espacio.entity'
import { Equipamiento } from '../equipamiento/equipamiento.entity'

/** Relación N:M entre espacios y equipamiento, con la cantidad de cada equipo */
@Entity('espacio_equipamiento')
@Check('ck_espacio_equipamiento_cantidad', '"cantidad" > 0')
export class EspacioEquipamiento {
  @PrimaryColumn({ name: 'espacio_id', type: 'int' })
  espacioId: number

  @PrimaryColumn({ name: 'equipamiento_id', type: 'int' })
  equipamientoId: number

  @Column({ type: 'smallint', default: 1 })
  cantidad: number

  @ManyToOne(() => Espacio, (espacio) => espacio.equipamiento, { onDelete: 'CASCADE', orphanedRowAction: 'delete' })
  @JoinColumn({ name: 'espacio_id' })
  espacio: Espacio

  @ManyToOne(() => Equipamiento, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'equipamiento_id' })
  equipamiento: Equipamiento
}
