import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

/** Catálogo de equipamiento (Proyector, WiFi, Computadoras...). Se asigna a los espacios con una cantidad. */
@Entity('equipamiento')
export class Equipamiento {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 60, unique: true })
  nombre: string
}
