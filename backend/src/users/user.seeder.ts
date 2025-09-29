import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.seed();
  }

  async seed() {
    const existingUser = await this.userRepository.findOne({
      where: { username: 'afp_boveda' },
    });

    if (!existingUser) {
      const user = this.userRepository.create({
        email: 'afp@boveda.com',
        username: 'afp_boveda',
        password_hash: 'afp_demo', // This will be hashed by the @BeforeInsert hook
        name: 'AFP Boveda User',
      });
      await this.userRepository.save(user);
      console.log('AFP Boveda user created successfully.');
    }
  }
}
