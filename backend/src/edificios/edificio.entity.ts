import { Check, Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { Espacio } from '../espacios/espacio.entity'

@Entity('edificios')
@Check('ck_edificios_pisos', '"pisos" BETWEEN 1 AND 30')
export class Edificio {
  @PrimaryGeneratedColumn()
  id: number

  /** Letra o código corto que se ve en la interfaz: "A", "B", "C" */
  @Column({ type: 'varchar', length: 10, unique: true })
  codigo: string

  @Column({ type: 'varchar', length: 100 })
  nombre: string

  @Column({ type: 'varchar', length: 200, nullable: true })
  ubicacion: string | null

  @Column({ type: 'smallint' })
  pisos: number

  @OneToMany(() => Espacio, (espacio) => espacio.edificio)
  espacios: Espacio[]
}
