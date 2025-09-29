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
      where: { email: 'test@example.com' },
    });

    if (!existingUser) {
      const user = this.userRepository.create({
        email: 'test@example.com',
        password_hash: 'password', // This will be hashed by the @BeforeInsert hook
        name: 'Test User',
      });
      await this.userRepository.save(user);
      console.log('Test user created successfully.');
    }
  }
}
