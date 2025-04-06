import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { otp_type, User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { EmailService } from './email.service';
import { Cron } from '@nestjs/schedule';
import { SmsService } from 'src/sms/sms.service';
import { UpdateUserDto } from './dto/update-user.dto'; // Adjust path if needed

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) { }

  @Cron('* * * * * *') // Runs every second (adjust for production)
  async clearExpiredOtps() {
    const now = new Date();
    await this.userRepository.update(
      { otpExpiration: LessThan(now) },
      { otp: null, otpExpiration: null, otp_type: null },
    );
  }

  async save(createUserDto: CreateUserDto) {
    let user = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (user) {
      if (user.status === 'ACTIVE') {
        throw new UnauthorizedException('Email already registered...!');
      }
      if (user.status === 'INACTIVE') {
        throw new UnauthorizedException('Please Verify Email...!');
      }
      if (!user.otp) {
        user.otp = this.generateOtp();
        user.otpExpiration = this.getOtpExpiration();
        user.otp_type = otp_type.EMAIL_VERIFICATION;
      }
    } else {
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      user = this.userRepository.create({
        ...createUserDto,
        password: hashedPassword,
        status: 'INACTIVE',
        otp: this.generateOtp(),
        otpExpiration: this.getOtpExpiration(),
        otp_type: otp_type.EMAIL_VERIFICATION,
        role : UserRole.ADMIN
      });
    }
    const role = user.role;

    await this.userRepository.save(user);

    // Send OTP via Email only (no SMS during registration)
    await this.emailService.sendOtpEmail(user.email, user.otp || '', user.first_name);

    return { mesaage: `${role} registered successfully. OTP sent to email.`};
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('User Not Found..!');
    }

    if (!user.otp || !user.otpExpiration || !user.otp_type) {
      throw new UnauthorizedException('Invalid OTP or OTP Type Missing');
    }

    if (new Date() > user.otpExpiration) {
      user.otp = null;
      user.otpExpiration = null;
      user.otp_type = null;
      await this.userRepository.save(user);
      throw new UnauthorizedException('OTP Expired. Please request a new one.');
    }

    if (user.otp !== otp) {
      throw new UnauthorizedException('Incorrect OTP');
    }

    if (user.otp_type === otp_type.EMAIL_VERIFICATION) {
      user.status = 'ACTIVE';
    } else if (user.otp_type === otp_type.FORGOT_PASSWORD) {
    }

    user.otp = null;
    user.otpExpiration = null;
    user.otp_type = null;
    await this.userRepository.save(user);

    return { message: 'OTP Verified Successfully' };
  }

  // async forgotPassword(email: string) {
  //   const user = await this.userRepository.findOne({ where: { email } });

  //   if (!user) {
  //     throw new NotFoundException('User Not Registered');
  //   }

  //   if (user.is_logged_in === false) {
  //     user.otp = this.generateOtp();
  //     user.otpExpiration = this.getOtpExpiration();
  //     user.otp_type = otp_type.FORGOT_PASSWORD;

  //     await this.userRepository.save(user);

  //     // Send OTP via Email
  //     await this.emailService.sendOtpEmail(
  //       user.email,
  //       user.otp,
  //       user.first_name,
  //     );

  //     // Send OTP via SMS if mobile_no is provided
  //     // let smsResult = { message: 'SMS not sent', phoneNumber: '' };
  //     // if (user.mobile_no) {
  //     //   try {
  //     //     smsResult = await this.smsService.sendOtpSms(user.mobile_no, user.otp || '');
  //     //     console.log(`SMS sent to: ${smsResult.phoneNumber}`);
  //     //   } catch (error) {
  //     //     console.warn(`Failed to send SMS to ${user.mobile_no}: ${error.message}`);
  //     //   }
  //     // } else {
  //     //   console.warn(`No mobile number provided for user ${user.email}. SMS not sent.`);
  //     // }

  //     // return { message: 'OTP Sent to Your Email and SMS (if mobile provided)' };
  //   } else {
  //     throw new UnauthorizedException(
  //       'User has Already LoggedIn, In this case user can use change password!',
  //     );
  //   }
  // }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User Not Found..!');
    }

    if (user.is_logged_in === false) {
      user.otp = this.generateOtp();
      user.otpExpiration = this.getOtpExpiration();
      user.otp_type = otp_type.FORGOT_PASSWORD;
      // user. = false;

      await this.userRepository.save(user);

      // Send OTP via Email
      await this.emailService.sendOtpEmail(
        user.email,
        user.otp,
        user.first_name,
      );

      // Send OTP via SMS if mobile_no is provided
      let smsResult = { message: 'SMS not sent', phoneNumber: '' };
      if (user.mobile_no) {
        try {
          smsResult = await this.smsService.sendOtpSms(user.mobile_no, user.otp || '');
          // console.log(`SMS sent to: ${smsResult.phoneNumber}`);
        } catch (error) {
          // console.warn(`Failed to send SMS to ${user.mobile_no}: ${error.message}`);
        }
      } else {
        // console.warn(`No mobile number provided for user ${user.email}. SMS not sent.`);
      }

      return { message: 'OTP Sent to Your Email and SMS (if mobile provided)' };
    } else {
      throw new UnauthorizedException(
        'User has Already LoggedIn, In this case user can use change password!',
      );
    }
  }

  async resetPassword(email: string, newpwd: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('User Not Registered!');
    }

    if (!user) {
      throw new UnauthorizedException(
        'Please Verify OTP Before Resetting Password',
      );
    }

    if (user.is_logged_in === true) {
      throw new UnauthorizedException(
        'You do not have access to Reset the Password!',
      );
    }

    const sameresetpwd = await bcrypt.compare(newpwd, user.password);
    if (sameresetpwd) {
      throw new UnauthorizedException(
        'New Password cannot be the same as the old Password!',
      );
    }

    user.password = await bcrypt.hash(newpwd, 10);
    user.otp = null;
    user.otpExpiration = null;
    user.otp_type = null;

    await this.userRepository.save(user);

    return { message: 'Password Reset Successfully. Now You Can Login' };
  }

  async resendOtp(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === 'INACTIVE') {
      user.otp = this.generateOtp();
      user.otpExpiration = this.getOtpExpiration();
      user.otp_type = otp_type.EMAIL_VERIFICATION;
      await this.userRepository.save(user);

      // Send OTP via Email only (no SMS)
      await this.emailService.sendOtpEmail(
        user.email,
        user.otp || '',
        user.first_name,
      );

      return { message: 'New OTP sent to your email for Email Verification!' };
    }

    if (user.status === 'ACTIVE' && user.is_logged_in === false) {
      user.otp = this.generateOtp();
      user.otpExpiration = this.getOtpExpiration();
      user.otp_type = otp_type.FORGOT_PASSWORD;
      await this.userRepository.save(user);

      // Send OTP via Email only (no SMS)
      await this.emailService.sendOtpEmail(
        user.email,
        user.otp || '',
        user.first_name,
      );

      return { message: 'New OTP sent to your email for Forgot Password!' };
    }

    if (user.status === 'ACTIVE' && user.is_logged_in === true) {
      return {
        message: 'You are already logged in! Use Change Password instead.',
      };
    }
  }


  async login(email: string, password: string) {
    const user = await this.userRepository.findOne({ where: { email } });
  
    if (!user) {
      throw new NotFoundException('User not registered.');
    }
  
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid password.');
    }
  
    user.is_logged_in = true;
    user.is_logged_out = false;
    await this.userRepository.save(user);
  
    return {
      message: 'User Login Successfully!',
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        mobile_no: user.mobile_no,
        status: user.status, // ✅ Ensure status is returned
      }
    };
  }
  
  
  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email }, 
      select: ["first_name", "last_name", "mobile_no", "email", "status","role"], // ✅ Include status
    });
  }
  
  async logout(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('User Not Found!');
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException('User has to Login First!');
    }

    if (user.is_logged_out === true) {
      throw new UnauthorizedException('User Already Logged Out!');
    }

    user.is_logged_in = false,
    user.is_logged_out = true;
    await this.userRepository.save(user);

    return { message: 'User Logout Successfully!' };
  }

  async changepwd(email: string, password: string, newpwd: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Email is Invalid!');
    }

    if (!user.is_logged_in) {
      throw new UnauthorizedException('Please Login First!');
    }

    const oldpwd = await bcrypt.compare(password, user.password);
    if (!oldpwd) {
      throw new UnauthorizedException('Invalid old password!');
    }

    const samepwd = await bcrypt.compare(newpwd, user.password);
    if (samepwd) {
      throw new UnauthorizedException(
        'New password cannot be the same as the old password!',
      );
    }

    user.password = await bcrypt.hash(newpwd, 10);
    await this.userRepository.save(user);

    return { message: 'User Successfully Changed their Password!' };
  }

  async update(email: string, first_name: string, last_name: string, mobile_no: string, role:string) {
    const user = await this.userRepository.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
        throw new NotFoundException('User not found!');
    }

    if (!user.is_logged_in) {
        throw new UnauthorizedException('User is not logged in.');
    }

    console.log("Before update:", user); // Debugging

    user.first_name = first_name?.trim() || user.first_name;
    user.last_name = last_name?.trim() || user.last_name;
    user.mobile_no = mobile_no?.trim() || user.mobile_no;
    // user.role = role?.trim() || user.role;

    try {
        await this.userRepository.save(user);
        console.log("After update:", user); // Debugging

        return { message: 'User updated successfully!', user };
    } catch (error) {
        console.error("Update failed:", error);
        // throw new InternalServerErrorException('Failed to update user. Please try again.');
    }
}

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private getOtpExpiration(): Date {
    return new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      take: 10, // Fetch only 10 records at a time
      skip: 0,  // Start from the first record
    });
  }

  async getUserRole(email: string): Promise<{ role: string }> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { role: user.role };
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    await this.userRepository.update(id, updateUserDto);
    const updatedUser = await this.userRepository.findOne({ where: { id } });
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }

}