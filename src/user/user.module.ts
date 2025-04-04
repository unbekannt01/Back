import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { SmsService } from 'src/sms/sms.service';
import { AdminService } from './admin/admin.service';

@Module({
  imports: [
    ConfigModule.forRoot(), 
    TypeOrmModule.forFeature([User]),
  ],
  providers: [UserService, EmailService,SmsService,AdminService],
  controllers: [UserController],
  exports: [UserService, EmailService],
})
export class UserModule {}
