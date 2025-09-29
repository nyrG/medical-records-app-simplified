import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserSeeder } from './user.seeder';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, UserSeeder],
  exports: [UsersService], // Export UsersService for other modules
})
export class UsersModule {}
