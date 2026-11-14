import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Equipamiento } from './equipamiento.entity'
import { EspacioEquipamiento } from '../espacios/espacio-equipamiento.entity'
import { EquipamientoController } from './equipamiento.controller'
import { EquipamientoService } from './equipamiento.service'

@Module({
  imports: [TypeOrmModule.forFeature([Equipamiento, EspacioEquipamiento])],
  controllers: [EquipamientoController],
  providers: [EquipamientoService],
})
export class EquipamientoModule {}
